import { Request, Response } from 'express';
import { db } from '../../db';
import { categories } from '../../db/schema/categories';
import { eq, and, asc, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

const upsertCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255),
  description: z.string().nullable().optional(),
});

export class CategoriesController {
  // GET /api/v1/categories
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const rows = await db
        .select()
        .from(categories)
        .where(and(eq(categories.tenantId, tenantId), eq(categories.isActive, true)))
        .orderBy(asc(categories.name));

      return res.status(200).json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[CATEGORIES GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to fetch categories',
      });
    }
  }

  // POST /api/v1/categories
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const parsed = upsertCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category payload',
          errors: parsed.error.format(),
        });
      }

      const cleanName = parsed.data.name.trim();

      const existing = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.tenantId, tenantId),
            eq(categories.isActive, true),
            ilike(categories.name, cleanName)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Category "${cleanName}" already exists.`,
        });
      }

      const [created] = await db
        .insert(categories)
        .values({
          tenantId,
          name: cleanName,
          description: parsed.data.description?.trim() || null,
          isActive: true,
        })
        .returning();

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[CATEGORIES CREATE ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to create category',
      });
    }
  }

  // PUT / PATCH /api/v1/categories/:id
  static async update(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const parsed = upsertCategorySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category update payload',
          errors: parsed.error.format(),
        });
      }

      const categoryId = String(req.params.id);
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
      if (parsed.data.description !== undefined) {
        updateData.description = parsed.data.description?.trim() || null;
      }

      const [updated] = await db
        .update(categories)
        .set(updateData)
        .where(and(eq(categories.id, categoryId), eq(categories.tenantId, tenantId)))
        .returning();

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[CATEGORIES UPDATE ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to update category',
      });
    }
  }

  // DELETE /api/v1/categories/:id
  static async remove(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const categoryId = String(req.params.id);

      // Guard against deleting a category still referenced by tenant products
      try {
        const linked: any = await db.execute(
          sql`SELECT id FROM products WHERE tenant_id = ${tenantId} AND category_id = ${categoryId} LIMIT 1`
        );
        const linkedRows = Array.isArray(linked) ? linked : linked?.rows || [];
        if (linkedRows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Cannot delete this category because products are currently assigned to it.',
          });
        }
      } catch {
        // Ignore if products table does not have category_id column
      }

      const [deleted] = await db
        .delete(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.tenantId, tenantId)))
        .returning();

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      return res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error: any) {
      if (error?.code === '23503') {
        return res.status(409).json({
          success: false,
          message: 'Cannot delete this category because products are currently assigned to it.',
        });
      }
      console.error('[CATEGORIES DELETE ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to delete category',
      });
    }
  }
}