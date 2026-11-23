import { Request, Response } from 'express';
import { db } from '../../db';
import { products } from '../../db/schema';
import { promotions } from '../../db/schema/pricing';
import { eq, and, asc, desc } from 'drizzle-orm';
import { z } from 'zod';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

const updateProductPriceSchema = z.object({
  sellingPrice: z.number().nonnegative('Selling price cannot be negative'),
  costPrice: z.number().nonnegative('Cost price cannot be negative').optional(),
});

const createPromotionSchema = z.object({
  name: z.string().min(1, 'Promotion name is required').max(255),
  code: z.string().trim().max(100).nullable().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discountValue: z.number().positive('Discount value must be greater than zero'),
  minPurchase: z.number().nonnegative().optional().default(0),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export class PricingController {
  // GET /api/v1/pricing
  static async getOverview(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const [productRows, promoRows] = await Promise.all([
        db
          .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            costPrice: products.costPrice,
            sellingPrice: products.sellingPrice,
            updatedAt: products.updatedAt,
          })
          .from(products)
          .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)))
          .orderBy(asc(products.name)),
        db
          .select()
          .from(promotions)
          .where(eq(promotions.tenantId, tenantId))
          .orderBy(desc(promotions.createdAt)),
      ]);

      const serializedProducts = productRows.map((p) => {
        const cost = Number(p.costPrice ?? 0);
        const selling = Number(p.sellingPrice ?? 0);
        const marginAmount = selling - cost;
        const marginPct = selling > 0 ? Number(((marginAmount / selling) * 100).toFixed(1)) : 0;
        return {
          ...p,
          costPrice: cost,
          sellingPrice: selling,
          marginAmount,
          marginPct,
        };
      });

      const serializedPromos = promoRows.map((pr) => ({
        ...pr,
        discountValue: Number(pr.discountValue ?? 0),
        minPurchase: Number(pr.minPurchase ?? 0),
      }));

      const avgMarginPct =
        serializedProducts.length > 0
          ? Number(
              (
                serializedProducts.reduce((sum, p) => sum + p.marginPct, 0) /
                serializedProducts.length
              ).toFixed(1)
            )
          : 0;

      const lowMarginCount = serializedProducts.filter((p) => p.marginPct < 10).length;
      const activePromotions = serializedPromos.filter((p) => p.isActive).length;

      return res.status(200).json({
        success: true,
        data: {
          kpis: {
            totalProducts: serializedProducts.length,
            avgMarginPct,
            lowMarginCount,
            activePromotions,
          },
          products: serializedProducts,
          promotions: serializedPromos,
        },
      });
    } catch (error: any) {
      console.error('[PRICING GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load pricing & promotions',
      });
    }
  }

  // PATCH /api/v1/pricing/products/:productId
  static async updateProductPrice(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const parsed = updateProductPriceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid price payload',
          errors: parsed.error.format(),
        });
      }

      const productId = String(req.params.productId);
      const updateData: Record<string, any> = {
        sellingPrice: parsed.data.sellingPrice.toFixed(2),
        updatedAt: new Date(),
      };
      if (parsed.data.costPrice !== undefined) {
        updateData.costPrice = parsed.data.costPrice.toFixed(2);
      }

      const [updated] = await db
        .update(products)
        .set(updateData)
        .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
        .returning();

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Product not found in tenant catalog' });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...updated,
          costPrice: Number(updated.costPrice ?? 0),
          sellingPrice: Number(updated.sellingPrice ?? 0),
        },
      });
    } catch (error: any) {
      console.error('[PRICING PRODUCT PATCH ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to update product price',
      });
    }
  }

  // POST /api/v1/pricing/promotions
  static async createPromotion(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const parsed = createPromotionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid promotion payload',
          errors: parsed.error.format(),
        });
      }

      const { name, code, discountType, discountValue, minPurchase, startDate, endDate } = parsed.data;

      if (discountType === 'PERCENTAGE' && discountValue > 100) {
        return res.status(400).json({
          success: false,
          message: 'Percentage discount cannot exceed 100%.',
        });
      }

      const [created] = await db
        .insert(promotions)
        .values({
          tenantId,
          name: name.trim(),
          code: code ? code.trim().toUpperCase() : null,
          discountType,
          discountValue: discountValue.toFixed(2),
          minPurchase: minPurchase.toFixed(2),
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          isActive: true,
        })
        .returning();

      return res.status(201).json({
        success: true,
        data: {
          ...created,
          discountValue: Number(created.discountValue ?? 0),
          minPurchase: Number(created.minPurchase ?? 0),
        },
      });
    } catch (error: any) {
      console.error('[PRICING CREATE PROMO ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to create promotion',
      });
    }
  }

  // PATCH /api/v1/pricing/promotions/:id/toggle
  static async togglePromotion(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const promoId = String(req.params.id);
      const [existing] = await db
        .select()
        .from(promotions)
        .where(and(eq(promotions.id, promoId), eq(promotions.tenantId, tenantId)))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Promotion not found' });
      }

      const [updated] = await db
        .update(promotions)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(and(eq(promotions.id, promoId), eq(promotions.tenantId, tenantId)))
        .returning();

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to toggle promotion' });
    }
  }

  // DELETE /api/v1/pricing/promotions/:id
  static async deletePromotion(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const promoId = String(req.params.id);
      const [deleted] = await db
        .delete(promotions)
        .where(and(eq(promotions.id, promoId), eq(promotions.tenantId, tenantId)))
        .returning();

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Promotion not found' });
      }

      return res.status(200).json({ success: true, message: 'Promotion deleted' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to delete promotion' });
    }
  }
}