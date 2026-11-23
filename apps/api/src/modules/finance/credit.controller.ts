import { Request, Response } from 'express';
import { db } from '../../db';
import { creditAccounts } from '../../db/schema/credit';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

const createCreditSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  balance: z.union([z.number(), z.string()]).default(0),
  creditLimit: z.union([z.number(), z.string()]).optional().default(0),
});

const adjustBalanceSchema = z.object({
  amount: z.number().refine((v) => v !== 0, 'Amount cannot be zero'), // negative = payment, positive = additional credit
});

const serializeAccount = (acc: any) => ({
  ...acc,
  balance: Number(acc.balance ?? 0),
  creditLimit: Number(acc.creditLimit ?? 0),
});

export class CreditController {
  // GET /api/v1/credit
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const rows = await db
        .select()
        .from(creditAccounts)
        .where(eq(creditAccounts.tenantId, tenantId))
        .orderBy(desc(creditAccounts.updatedAt));

      return res.status(200).json({
        success: true,
        data: rows.map(serializeAccount),
      });
    } catch (error: any) {
      console.error('[CREDIT GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to load credit accounts',
      });
    }
  }

  // POST /api/v1/credit
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const parsed = createCreditSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid credit account payload',
          errors: parsed.error.format(),
        });
      }

      const { customerId, customerName, phone, balance, creditLimit } = parsed.data;
      const numericBalance = Math.max(0, Number(balance) || 0);
      const numericLimit = Math.max(0, Number(creditLimit) || 0);

      const [created] = await db
        .insert(creditAccounts)
        .values({
          tenantId,
          customerId: customerId || null,
          customerName: customerName.trim(),
          phone: phone.trim(),
          balance: numericBalance.toFixed(2),
          creditLimit: numericLimit.toFixed(2),
          status: numericBalance > 0 ? 'Active' : 'Settled',
          lastTxDate: new Date(),
        })
        .returning();

      return res.status(201).json({
        success: true,
        data: serializeAccount(created),
      });
    } catch (error: any) {
      console.error('[CREDIT CREATE ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create credit account',
      });
    }
  }

  // PATCH /api/v1/credit/:id/payment (Record payment or add charge)
  static async adjustBalance(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const parsed = adjustBalanceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.format() });
      }

      const accountId = String(req.params.id);
      const [existing] = await db
        .select()
        .from(creditAccounts)
        .where(and(eq(creditAccounts.id, accountId), eq(creditAccounts.tenantId, tenantId)))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Credit account not found' });
      }

      const nextBalance = Math.max(0, Number(existing.balance || 0) + parsed.data.amount);
      const [updated] = await db
        .update(creditAccounts)
        .set({
          balance: nextBalance.toFixed(2),
          status: nextBalance > 0 ? 'Active' : 'Settled',
          lastTxDate: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(creditAccounts.id, accountId), eq(creditAccounts.tenantId, tenantId)))
        .returning();

      return res.status(200).json({
        success: true,
        data: serializeAccount(updated),
      });
    } catch (error: any) {
      console.error('[CREDIT ADJUST ERROR]', error);
      return res.status(500).json({ success: false, message: 'Failed to update credit balance' });
    }
  }

  // DELETE /api/v1/credit/:id
  static async remove(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const accountId = String(req.params.id);
      const [deleted] = await db
        .delete(creditAccounts)
        .where(and(eq(creditAccounts.id, accountId), eq(creditAccounts.tenantId, tenantId)))
        .returning();

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Credit account not found' });
      }

      return res.status(200).json({ success: true, message: 'Credit account deleted' });
    } catch (error: any) {
      console.error('[CREDIT DELETE ERROR]', error);
      return res.status(500).json({ success: false, message: 'Failed to delete credit account' });
    }
  }
}