import { Request, Response } from 'express';
import { db } from '../../db';
import { customers } from '../../db/schema/customers';
import { eq, and, asc } from 'drizzle-orm';
import { z } from 'zod';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

const upsertCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  address: z.string().nullable().optional(),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'CORPORATE']).optional().default('RETAIL'),
  creditLimit: z.union([z.number(), z.string()]).optional(),
  loyaltyPoints: z.union([z.number(), z.string()]).optional(),
  points: z.union([z.number(), z.string()]).optional(),
});

const serializeCustomer = (c: any) => ({
  ...c,
  points: Number(c.loyaltyPoints ?? c.points ?? 0),
  loyaltyPoints: Number(c.loyaltyPoints ?? c.points ?? 0),
  creditLimit: Number(c.creditLimit ?? 0),
  creditBalance: Number(c.creditBalance ?? 0),
});

export const CustomerController = {
  // GET /api/v1/customers
  getAll: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const rows = await db
        .select()
        .from(customers)
        .where(and(eq(customers.tenantId, tenantId), eq(customers.active, true)))
        .orderBy(asc(customers.name));

      return res.status(200).json({
        success: true,
        data: rows.map(serializeCustomer),
      });
    } catch (error: any) {
      console.error('[CUSTOMERS GET ALL ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch customers',
      });
    }
  },

  // GET /api/v1/customers/:id
  getById: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const customerId = String(req.params.id);
      const [row] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
        .limit(1);

      if (!row) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      return res.status(200).json({ success: true, data: serializeCustomer(row) });
    } catch (error: any) {
      console.error('[CUSTOMERS GET BY ID ERROR]', error);
      return res.status(500).json({ success: false, message: 'Failed to load customer details' });
    }
  },

  // POST /api/v1/customers
  create: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const parsed = upsertCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer data',
          errors: parsed.error.format(),
        });
      }

      const { name, phone, email, address, customerType, creditLimit, loyaltyPoints, points } = parsed.data;
      const initialPoints = Number(loyaltyPoints ?? points ?? 0);
      const parsedCreditLimit = Number(creditLimit ?? 0);

      const [created] = await db
        .insert(customers)
        .values({
          tenantId,
          name: name.trim(),
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          address: address?.trim() || null,
          customerType: customerType || 'RETAIL',
          creditLimit: parsedCreditLimit.toFixed(2),
          loyaltyPoints: initialPoints.toString(),
          active: true,
        } as typeof customers.$inferInsert)
        .returning();

      return res.status(201).json({
        success: true,
        data: serializeCustomer(created),
      });
    } catch (error: any) {
      console.error('[CUSTOMERS CREATE ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create customer',
      });
    }
  },

  // PUT / PATCH /api/v1/customers/:id
  update: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const customerId = String(req.params.id);
      const parsed = upsertCustomerSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer update payload',
          errors: parsed.error.format(),
        });
      }

      const data = parsed.data;
      const updatePayload: Record<string, any> = { updatedAt: new Date() };

      if (data.name !== undefined) updatePayload.name = data.name.trim();
      if (data.phone !== undefined) updatePayload.phone = data.phone?.trim() || null;
      if (data.email !== undefined) updatePayload.email = data.email?.trim() || null;
      if (data.address !== undefined) updatePayload.address = data.address?.trim() || null;
      if (data.customerType !== undefined) updatePayload.customerType = data.customerType;
      if (data.creditLimit !== undefined) updatePayload.creditLimit = Number(data.creditLimit).toFixed(2);
      if (data.loyaltyPoints !== undefined || data.points !== undefined) {
        updatePayload.loyaltyPoints = String(Number(data.loyaltyPoints ?? data.points ?? 0));
      }

      const [updated] = await db
        .update(customers)
        .set(updatePayload)
        .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
        .returning();

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      return res.status(200).json({ success: true, data: serializeCustomer(updated) });
    } catch (error: any) {
      console.error('[CUSTOMERS UPDATE ERROR]', error);
      return res.status(500).json({ success: false, message: 'Failed to update customer' });
    }
  },

  // DELETE /api/v1/customers/:id
  remove: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const customerId = String(req.params.id);

      // Soft-delete so historical orders/invoices stay intact
      const [deactivated] = await db
        .update(customers)
        .set({ active: false, updatedAt: new Date() })
        .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
        .returning();

      if (!deactivated) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      return res.status(200).json({ success: true, message: 'Customer removed successfully' });
    } catch (error: any) {
      if (error.code === '23503') {
        return res.status(409).json({
          success: false,
          message: 'Cannot delete customer with linked orders or invoices.',
        });
      }
      console.error('[CUSTOMERS DELETE ERROR]', error);
      return res.status(500).json({ success: false, message: 'Failed to delete customer' });
    }
  },
};