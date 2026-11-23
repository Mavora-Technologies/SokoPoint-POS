import { Request, Response } from 'express';
import { db } from '../../db';
import { customers, loyaltyTransactions } from '../../db/schema/customers';
import { eq, and, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

const adjustPointsSchema = z.object({
  customerId: z.string().uuid('Valid customer is required'),
  type: z.enum(['EARN', 'REDEEM', 'ADJUSTMENT']).default('EARN'),
  points: z.number().positive('Points must be greater than zero'),
  notes: z.string().optional(),
});

export class LoyaltyController {
  // GET /api/v1/loyalty
  static async getOverview(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const [memberRows, txRows] = await Promise.all([
        db
          .select()
          .from(customers)
          .where(and(eq(customers.tenantId, tenantId), eq(customers.active, true)))
          .orderBy(asc(customers.name)),
        db
          .select()
          .from(loyaltyTransactions)
          .where(eq(loyaltyTransactions.tenantId, tenantId))
          .orderBy(desc(loyaltyTransactions.createdAt))
          .limit(100),
      ]);

      const memberMap = new Map(memberRows.map((m) => [m.id, m.name]));

      const members = memberRows.map((m: any) => ({
        id: m.id,
        name: m.name,
        phone: m.phone || null,
        email: m.email || null,
        customerType: m.customerType || 'RETAIL',
        points: Number(m.loyaltyPoints ?? 0),
      }));

      const transactions = txRows.map((t: any) => ({
        id: t.id,
        customerId: t.customerId,
        customerName: memberMap.get(t.customerId) || 'Customer',
        transactionType: t.transactionType,
        points: Number(t.points ?? 0),
        notes: t.notes || null,
        createdAt: t.createdAt,
      }));

      const totalBalance = members.reduce((sum, m) => sum + m.points, 0);
      const totalEarned = transactions
        .filter((t) => t.points > 0)
        .reduce((sum, t) => sum + t.points, 0);
      const totalRedeemed = transactions
        .filter((t) => t.points < 0)
        .reduce((sum, t) => sum + Math.abs(t.points), 0);

      return res.status(200).json({
        success: true,
        data: {
          kpis: {
            totalMembers: members.length,
            totalBalance,
            totalEarned,
            totalRedeemed,
          },
          members,
          transactions,
        },
      });
    } catch (error: any) {
      console.error('[LOYALTY GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to load loyalty & rewards data',
      });
    }
  }

  // POST /api/v1/loyalty/adjust
  static async adjustPoints(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const parsed = adjustPointsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid loyalty points payload',
          errors: parsed.error.format(),
        });
      }

      const { customerId, type, points, notes } = parsed.data;
      const signedPoints = type === 'REDEEM' ? -Math.abs(points) : Math.abs(points);

      const result = await db.transaction(async (tx) => {
        const [customer] = await tx
          .select()
          .from(customers)
          .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
          .limit(1);

        if (!customer) {
          throw new Error('Customer not found in this tenant workspace');
        }

        const currentPoints = Number(customer.loyaltyPoints ?? 0);
        const newBalance = currentPoints + signedPoints;

        if (newBalance < 0) {
          throw new Error(`Insufficient points balance. Available: ${currentPoints} pts`);
        }

        const [txRecord] = await tx
          .insert(loyaltyTransactions)
          .values({
            tenantId,
            customerId,
            transactionType: type,
            points: signedPoints.toString(),
            notes: notes?.trim() || null,
          })
          .returning();

        const [updatedCustomer] = await tx
          .update(customers)
          .set({
            loyaltyPoints: newBalance.toString(),
            updatedAt: new Date(),
          })
          .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
          .returning();

        return { txRecord, updatedCustomer };
      });

      return res.status(201).json({
        success: true,
        data: {
          customerId: result.updatedCustomer.id,
          newBalance: Number(result.updatedCustomer.loyaltyPoints ?? 0),
          transaction: result.txRecord,
        },
      });
    } catch (error: any) {
      console.error('[LOYALTY ADJUST ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update loyalty points',
      });
    }
  }
}