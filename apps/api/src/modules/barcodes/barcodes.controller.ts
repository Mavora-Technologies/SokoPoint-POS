import { Request, Response } from 'express';
import { db } from '../../db';
import { products } from '../../db/schema';
import { eq, and, asc, ne, or, isNull } from 'drizzle-orm';
import { z } from 'zod';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

const updateBarcodeSchema = z.object({
  barcode: z.string().trim().max(100).nullable(),
  sku: z.string().trim().max(100).nullable().optional(),
});

const generateBarcodesSchema = z.object({
  productId: z.string().uuid().optional(),
  allMissing: z.boolean().optional().default(false),
});

// Generates a valid 13-digit EAN-13 barcode using the 200 in-store retail prefix
function generateEan13(usedSet: Set<string>): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const body = '200' + String(Math.floor(100000000 + Math.random() * 900000000));
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = Number(body[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const candidate = `${body}${checkDigit}`;
    if (!usedSet.has(candidate)) {
      usedSet.add(candidate);
      return candidate;
    }
  }
  throw new Error('Unable to generate a unique EAN-13 barcode.');
}

export class BarcodesController {
  // GET /api/v1/barcodes
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const rows = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          barcode: products.barcode,
          sellingPrice: products.sellingPrice,
          costPrice: products.costPrice,
          isActive: products.isActive,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)))
        .orderBy(asc(products.name));

      const serialized = rows.map((p) => ({
        ...p,
        sellingPrice: Number(p.sellingPrice ?? 0),
        costPrice: Number(p.costPrice ?? 0),
      }));

      const withBarcode = serialized.filter((p) => Boolean(p.barcode && p.barcode.trim())).length;
      const missingBarcode = serialized.length - withBarcode;

      return res.status(200).json({
        success: true,
        data: {
          kpis: {
            totalProducts: serialized.length,
            withBarcode,
            missingBarcode,
          },
          products: serialized,
        },
      });
    } catch (error: any) {
      console.error('[BARCODES GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load product barcodes',
      });
    }
  }

  // PATCH /api/v1/barcodes/:productId
  static async updateBarcode(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const parsed = updateBarcodeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid barcode payload',
          errors: parsed.error.format(),
        });
      }

      const productId = String(req.params.productId);
      const cleanBarcode = parsed.data.barcode?.trim() || null;

      // Enforce per-tenant barcode uniqueness
      if (cleanBarcode) {
        const duplicate = await db
          .select({ id: products.id, name: products.name })
          .from(products)
          .where(
            and(
              eq(products.tenantId, tenantId),
              eq(products.barcode, cleanBarcode),
              ne(products.id, productId)
            )
          )
          .limit(1);

        if (duplicate.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Barcode "${cleanBarcode}" is already assigned to "${duplicate[0].name}".`,
          });
        }
      }

      const updateValues: Record<string, any> = {
        barcode: cleanBarcode,
        updatedAt: new Date(),
      };
      if (parsed.data.sku !== undefined) {
        updateValues.sku = parsed.data.sku?.trim() || null;
      }

      const [updated] = await db
        .update(products)
        .set(updateValues)
        .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
        .returning();

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Product not found in tenant catalog' });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...updated,
          sellingPrice: Number(updated.sellingPrice ?? 0),
          costPrice: Number(updated.costPrice ?? 0),
        },
      });
    } catch (error: any) {
      console.error('[BARCODES PATCH ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to update product barcode',
      });
    }
  }

  // POST /api/v1/barcodes/generate
  static async generateBarcodes(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const parsed = generateBarcodesSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.format() });
      }

      const { productId, allMissing } = parsed.data;

      // Load all existing barcodes in this tenant to guarantee zero collisions
      const existingRows = await db
        .select({ id: products.id, barcode: products.barcode })
        .from(products)
        .where(eq(products.tenantId, tenantId));

      const usedBarcodes = new Set<string>(
        existingRows.map((r) => (r.barcode || '').trim()).filter(Boolean)
      );

      let targets: { id: string }[] = [];

      if (productId) {
        targets = await db
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
          .limit(1);
      } else if (allMissing) {
        targets = await db
          .select({ id: products.id })
          .from(products)
          .where(
            and(
              eq(products.tenantId, tenantId),
              eq(products.isActive, true),
              or(isNull(products.barcode), eq(products.barcode, ''))
            )
          );
      }

      if (targets.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No products required barcode generation.',
          data: { updatedCount: 0 },
        });
      }

      const updatedRows = await db.transaction(async (tx) => {
        const results = [];
        for (const target of targets) {
          const newBarcode = generateEan13(usedBarcodes);
          const [row] = await tx
            .update(products)
            .set({ barcode: newBarcode, updatedAt: new Date() })
            .where(and(eq(products.id, target.id), eq(products.tenantId, tenantId)))
            .returning();
          if (row) results.push(row);
        }
        return results;
      });

      return res.status(200).json({
        success: true,
        message: `Generated ${updatedRows.length} EAN-13 barcode(s) successfully.`,
        data: {
          updatedCount: updatedRows.length,
          products: updatedRows,
        },
      });
    } catch (error: any) {
      console.error('[BARCODES GENERATE ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to generate barcodes',
      });
    }
  }
}