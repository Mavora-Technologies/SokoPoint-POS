import { Request, Response } from 'express';
import { db } from '../../db';
import { shifts, users, attendance } from '../../db/schema';
import { eq } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string };
  user?: { tenantId?: string };
};

export class ShiftsController {
  static async getOverview(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [staffList, shiftList, attendanceList] = await Promise.all([
        db.select({ id: users.id }).from(users).where(eq(users.tenantId, tenantId)),
        db.select({ id: shifts.id }).from(shifts).where(eq(shifts.tenantId, tenantId)),
        db.select({ id: attendance.id }).from(attendance).where(eq(attendance.tenantId, tenantId)),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalStaff: staffList.length,
          scheduledShifts: shiftList.length,
          attendanceLogs: attendanceList.length,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to load shifts overview' });
    }
  }
}