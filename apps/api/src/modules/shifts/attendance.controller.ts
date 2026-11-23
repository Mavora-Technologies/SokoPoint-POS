import { Request, Response } from 'express';
import { db } from '../../db';
import { attendance } from '../../db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { clockInSchema } from './shifts.schema';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null };
  user?: { tenantId?: string; userId?: string; branchId?: string | null };
};

export class AttendanceController {
  static async getAttendance(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const rows = await db
        .select()
        .from(attendance)
        .where(eq(attendance.tenantId, tenantId))
        .orderBy(desc(attendance.clockInTime));

      return res.status(200).json({ success: true, data: rows });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
    }
  }

  static async clockIn(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const actorId = req.auth?.userId || req.user?.userId;
      if (!tenantId || !actorId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const parsed = clockInSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.format() });

      const targetUserId = parsed.data.userId || actorId;
      const branchId = parsed.data.branchId || req.auth?.branchId || req.user?.branchId || null;

      const [record] = await db
        .insert(attendance)
        .values({
          tenantId,
          branchId,
          userId: targetUserId,
          clockInTime: new Date(),
          status: 'CLOCKED_IN',
        } as typeof attendance.$inferInsert)
        .returning();

      return res.status(201).json({ success: true, data: record });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Clock-in failed' });
    }
  }

  static async clockOut(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const actorId = req.auth?.userId || req.user?.userId;
      if (!tenantId || !actorId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [openRecord] = await db
        .select()
        .from(attendance)
        .where(and(eq(attendance.tenantId, tenantId), eq(attendance.userId, actorId), isNull(attendance.clockOutTime)))
        .orderBy(desc(attendance.clockInTime))
        .limit(1);

      if (!openRecord) {
        return res.status(404).json({ success: false, message: 'No active clock-in session found' });
      }

      const [updated] = await db
        .update(attendance)
        .set({ clockOutTime: new Date(), status: 'CLOCKED_OUT' } as Partial<typeof attendance.$inferInsert>)
        .where(eq(attendance.id, openRecord.id))
        .returning();

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Clock-out failed' });
    }
  }
}