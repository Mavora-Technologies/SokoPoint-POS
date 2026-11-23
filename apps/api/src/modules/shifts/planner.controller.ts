import { Request, Response } from 'express';
import { db } from '../../db';
import { shifts } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { createShiftSchema } from './shifts.schema';

type AuthRequest = Request & {
  auth?: { tenantId?: string; branchId?: string | null };
  user?: { tenantId?: string; branchId?: string | null };
};

export class PlannerController {
  static async getSchedule(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const rows = await db
        .select()
        .from(shifts)
        .where(eq(shifts.tenantId, tenantId))
        .orderBy(desc(shifts.date));

      return res.status(200).json({ success: true, data: rows });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to load shift schedule' });
    }
  }

  static async createShift(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const parsed = createShiftSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.format() });

      const branchId = parsed.data.branchId || req.auth?.branchId || req.user?.branchId;
      if (!branchId) return res.status(400).json({ success: false, message: 'branchId is required' });

      const [created] = await db
        .insert(shifts)
        .values({ tenantId, branchId, ...parsed.data })
        .returning();

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to schedule shift' });
    }
  }
}