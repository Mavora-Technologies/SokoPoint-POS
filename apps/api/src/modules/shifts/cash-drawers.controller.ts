import { Request, Response } from 'express';
import { db } from '../../db';
import { orders, users } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null };
  user?: { tenantId?: string; userId?: string; branchId?: string | null };
};

export class CashDrawersController {
  // GET /api/v1/shifts/cash-drawers
  static async getDrawers(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [tenantOrders, tenantStaff] = await Promise.all([
        db.select().from(orders).where(eq(orders.tenantId, tenantId)).orderBy(desc(orders.createdAt)),
        db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
          .from(users)
          .where(eq(users.tenantId, tenantId)),
      ]);

      const cashOrders = tenantOrders.filter((o: any) => (o.paymentMethod || 'cash').toLowerCase() === 'cash');
      const totalCashExpected = cashOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

      const custodians = tenantStaff.map((staff) => ({
        id: staff.id,
        custodianName: `${staff.firstName} ${staff.lastName}`,
        email: staff.email,
        terminal: 'Main POS Till',
        status: 'ACTIVE',
        expectedCash: totalCashExpected,
        variance: 0,
      }));

      return res.status(200).json({ success: true, data: custodians });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to load cash drawer custodians' });
    }
  }
}