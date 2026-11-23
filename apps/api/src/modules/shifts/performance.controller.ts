import { Request, Response } from 'express';
import { db } from '../../db';
import { orders, users } from '../../db/schema';
import { eq } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string };
  user?: { tenantId?: string };
};

export class PerformanceController {
  // GET /api/v1/shifts/performance
  static async getPerformance(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [tenantOrders, tenantStaff] = await Promise.all([
        db.select().from(orders).where(eq(orders.tenantId, tenantId)),
        db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
          .from(users)
          .where(eq(users.tenantId, tenantId)),
      ]);

      const metrics = tenantStaff.map((staff) => {
        const staffOrders = tenantOrders.filter((o: any) => o.userId === staff.id || o.createdBy === staff.id);
        const totalRevenue = staffOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
        const count = staffOrders.length;

        return {
          userId: staff.id,
          name: `${staff.firstName} ${staff.lastName}`,
          email: staff.email,
          transactionsProcessed: count,
          totalRevenue,
          avgBasketValue: count > 0 ? Math.round(totalRevenue / count) : 0,
        };
      });

      return res.status(200).json({ success: true, data: metrics });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to compute cashier performance' });
    }
  }
}