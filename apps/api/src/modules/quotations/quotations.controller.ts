import { Request, Response } from 'express';
import { db } from '../../db';
import { orders, orderItems, products, branches } from '../../db/schema';
import { eq, and, desc, inArray, or, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

const quoteItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  unitPrice: z.number().nonnegative().optional(),
});

const createQuoteSchema = z.object({
  quoteNum: z.string().min(1).optional(),
  customerId: z.string().uuid().nullable().optional(),
  customer: z.string().min(1).default('Prospective Client'),
  method: z.enum(['credit', 'bank', 'mpesa', 'cash', 'card']).default('credit'),
  items: z.array(quoteItemSchema).min(1, 'At least one item is required'),
});

const statusSchema = z.object({
  status: z.enum(['quotation', 'sent', 'invoiced', 'cancelled']),
});

export class QuotationsController {
  // GET /api/v1/quotations
  static async getQuotations(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const rows = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.tenantId, tenantId),
            or(
              ilike(orders.orderNumber, 'QTN-%'),
              ilike(orders.orderNumber, 'INV-%'),
              inArray(orders.status, ['quotation', 'sent', 'invoiced'])
            )
          )
        )
        .orderBy(desc(orders.createdAt));

      return res.status(200).json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[QUOTATIONS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to load quotations',
      });
    }
  }

  // POST /api/v1/quotations (Creates quote without deducting inventory)
  static async createQuotation(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const userId = req.auth?.userId || req.user?.userId || null;

      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const parsed = createQuoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid quotation payload',
          errors: parsed.error.format(),
        });
      }

      const { quoteNum, customerId, customer, method, items } = parsed.data;

      let branchId = req.auth?.branchId || req.user?.branchId || null;
      if (!branchId) {
        const [firstBranch] = await db
          .select({ id: branches.id })
          .from(branches)
          .where(eq(branches.tenantId, tenantId))
          .limit(1);
        branchId = firstBranch?.id || null;
      }
      if (!branchId) {
        return res.status(400).json({ success: false, message: 'No active branch configured for this tenant.' });
      }

      const productIds = Array.from(new Set(items.map((i) => i.productId)));
      const dbProducts = await db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, tenantId), inArray(products.id, productIds)));

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      let computedTotal = 0;
      const pricedItems = items.map((item) => {
        const prod = productMap.get(item.productId);
        if (!prod) {
          throw new Error(`Product ${item.productId} not found in tenant catalog`);
        }

        const unitPrice =
          item.unitPrice !== undefined ? item.unitPrice : Number(prod.sellingPrice ?? 0);
        const lineSubtotal = unitPrice * item.quantity;
        computedTotal += lineSubtotal;

        return {
          productId: prod.id,
          quantity: item.quantity,
          unitPrice,
          subtotal: lineSubtotal,
        };
      });

      const taxRate = 0.16;
      const taxableBase = computedTotal / (1 + taxRate);
      const vatAmount = computedTotal - taxableBase;
      const finalQuoteNum = quoteNum || `QTN-${Math.floor(Math.random() * 900000) + 100000}`;

      const createdQuote = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(orders)
          .values({
            tenantId,
            branchId,
            customerId: customerId || null,
            userId,
            orderNumber: finalQuoteNum,
            status: 'quotation',
            subtotal: taxableBase.toFixed(2),
            tax: vatAmount.toFixed(2),
            total: computedTotal.toFixed(2),
            paymentMethod: method,
          })
          .returning();

        for (const item of pricedItems) {
          await tx.insert(orderItems).values({
            orderId: inserted.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            subtotal: item.subtotal.toFixed(2),
          });
        }

        return inserted;
      });

      return res.status(201).json({
        success: true,
        data: {
          ...createdQuote,
          customerName: customer.trim(),
          total: Number(createdQuote.total),
          tax: Number(createdQuote.tax),
          subtotal: Number(createdQuote.subtotal),
        },
      });
    } catch (error: any) {
      console.error('[QUOTATIONS POST ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create quotation',
      });
    }
  }

  // PATCH /api/v1/quotations/:id/convert (Converts quotation -> Invoice & deducts stock)
  static async convertToInvoice(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const quoteId = String(req.params.id);
      const [existing] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, quoteId), eq(orders.tenantId, tenantId)))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Quotation not found' });
      }

      if (existing.status === 'invoiced' || existing.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Quotation is already converted to an invoice.' });
      }

      const invoiceNumber = existing.orderNumber.startsWith('QTN-')
        ? existing.orderNumber.replace(/^QTN-/, 'INV-')
        : `INV-${Math.floor(Math.random() * 900000) + 100000}`;

      const updated = await db.transaction(async (tx) => {
        const [invoiced] = await tx
          .update(orders)
          .set({
            orderNumber: invoiceNumber,
            status: 'invoiced',
          })
          .where(and(eq(orders.id, quoteId), eq(orders.tenantId, tenantId)))
          .returning();

        // Deduct stock in Inventory Central upon invoice conversion
        const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, quoteId));
        for (const line of lines) {
          await tx
            .update(products)
            .set({
              reorderLevel: sql`GREATEST(0, COALESCE(${products.reorderLevel}, 0) - ${line.quantity})`,
              minimumStock: sql`GREATEST(0, COALESCE(${products.minimumStock}, 0) - ${line.quantity})`,
              updatedAt: new Date(),
            })
            .where(and(eq(products.id, line.productId), eq(products.tenantId, tenantId)));
        }

        return invoiced;
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[QUOTATIONS CONVERT ERROR]', error);
      return res.status(500).json({ success: false, message: 'Failed to convert quotation to invoice' });
    }
  }

  // PATCH /api/v1/quotations/:id/status
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.format() });
      }

      const quoteId = String(req.params.id);
      const [updated] = await db
        .update(orders)
        .set({ status: parsed.data.status })
        .where(and(eq(orders.id, quoteId), eq(orders.tenantId, tenantId)))
        .returning();

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Quotation not found' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to update quotation status' });
    }
  }
}