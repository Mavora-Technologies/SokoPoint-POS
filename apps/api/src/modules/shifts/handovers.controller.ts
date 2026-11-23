import { Request, Response } from 'express';
import { db } from '../../db';
import { handoverNotes } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { createHandoverSchema } from './shifts.schema';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null };
  user?: { tenantId?: string; userId?: string; branchId?: string | null };
};

export class HandoversController {
  static async getHandovers(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const rows = await db
        .select()
        .from(handoverNotes)
        .where(eq(handoverNotes.tenantId, tenantId))
        .orderBy(desc(handoverNotes.createdAt));

      return res.status(200).json({ success: true, data: rows });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to load handover notes' });
    }
  }

  static async createHandover(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const userId = req.auth?.userId || req.user?.userId;
      if (!tenantId || !userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const parsed = createHandoverSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.format() });

      const [created] = await db
        .insert(handoverNotes)
        .values({
          tenantId,
          branchId: parsed.data.branchId || req.auth?.branchId || req.user?.branchId || null,
          userId,
          notes: parsed.data.notes,
        } as typeof handoverNotes.$inferInsert)
        .returning();

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to save handover note' });
    }
  }
}