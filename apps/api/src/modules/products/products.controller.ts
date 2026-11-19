import { Request, Response } from 'express';
import { db } from '../../db';
import { products } from '../../db/schema';
import { eq, desc, and } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

export class ProductsController {
  // GET /api/v1/products
  static async getProducts(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const rows = await db
        .select({
          id: products.id,
          tenantId: products.tenantId,
          categoryId: products.categoryId,
          name: products.name,
          description: products.description,
          sku: products.sku,
          barcode: products.barcode,
          costPrice: products.costPrice,
          sellingPrice: products.sellingPrice,
          taxRate: products.taxRate,
          minimumStock: products.minimumStock,
          reorderLevel: products.reorderLevel,
          isActive: products.isActive,
          createdAt: products.createdAt,
        })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)))
        .orderBy(desc(products.createdAt));

      const data = rows.map((p) => ({
        ...p,
        price: Number(p.sellingPrice ?? 0),
        sellingPrice: Number(p.sellingPrice ?? 0),
        costPrice: Number(p.costPrice ?? 0),
        stock:
          p.reorderLevel && p.reorderLevel > 0
            ? p.reorderLevel
            : p.minimumStock && p.minimumStock > 0
            ? p.minimumStock
            : 10,
      }));

      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('[PRODUCTS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to load products',
      });
    }
  }

  // POST /api/v1/products
  static async createProduct(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const {
        name,
        description,
        sku,
        barcode,
        costPrice,
        sellingPrice,
        taxRate,
        minimumStock,
        reorderLevel,
        categoryId,
      } = req.body;

      if (!name || sellingPrice === undefined) {
        return res.status(400).json({ success: false, message: 'Product name and sellingPrice are required' });
      }

      const [created] = await db
        .insert(products)
        .values({
          tenantId,
          categoryId: categoryId || null,
          name: name.trim(),
          description: description || null,
          sku: sku || null,
          barcode: barcode || null,
          costPrice: String(costPrice ?? 0),
          sellingPrice: String(sellingPrice),
          taxRate: String(taxRate ?? 16),
          minimumStock: Number(minimumStock ?? 0),
          reorderLevel: Number(reorderLevel ?? 5),
          isActive: true,
        })
        .returning();

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[PRODUCTS POST ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create product',
      });
    }
  }
}