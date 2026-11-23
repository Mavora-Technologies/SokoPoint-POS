import { Request, Response } from 'express';
import { db } from '../../db';
import { orders, orderItems, products, branches } from '../../db/schema';
import { eq, and, desc, inArray, or, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

const returnItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('Return quantity must be greater than zero'),
});

const createRefundSchema = z.object({
  returnNum: z.string().min(1).optional(),
  customerId: z.string().uuid().nullable().optional(),
  customer: z.string().min(1).default('Walk-in Customer'),
  method: z.enum(['cash', 'mpesa', 'card', 'credit', 'bank']).default('cash'),
  restock: z.boolean().optional().default(true),
  items: z.array(returnItemSchema).min(1, 'At least one returned item is required'),
});

export class RefundsController {
  // GET /api/v1/refunds
  static async getRefunds(req: AuthRequest, res: Response) {
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
              eq(orders.status, 'refunded'),
              ilike(orders.orderNumber, 'RET-%'),
              ilike(orders.orderNumber, 'REF-%')
            )
          )
        )
        .orderBy(desc(orders.createdAt));

      return res.status(200).json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[REFUNDS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to load returns & refunds',
      });
    }
  }

  // POST /api/v1/refunds
  static async createRefund(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const userId = req.auth?.userId || req.user?.userId || null;

      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const parsed = createRefundSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid return payload',
          errors: parsed.error.format(),
        });
      }

      const { returnNum, customerId, customer, method, restock, items } = parsed.data;

      // Resolve tenant branch
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

        const unitPrice = Number(prod.sellingPrice ?? 0);
        const signedQty = -Math.abs(item.quantity);
        const lineSubtotal = unitPrice * signedQty;
        computedTotal += lineSubtotal;

        return {
          productId: prod.id,
          quantity: signedQty,
          absQuantity: Math.abs(item.quantity),
          unitPrice,
          subtotal: lineSubtotal,
        };
      });

      const taxRate = 0.16;
      const taxableBase = computedTotal / (1 + taxRate);
      const vatAmount = computedTotal - taxableBase;
      const finalReturnNum = returnNum || `RET-${Math.floor(Math.random() * 900000) + 100000}`;

      const createdRefund = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(orders)
          .values({
            tenantId,
            branchId,
            customerId: customerId || null,
            userId,
            orderNumber: finalReturnNum,
            status: 'refunded',
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

          // Atomically restore stock in Inventory Central if restock is enabled
          if (restock) {
            await tx
              .update(products)
              .set({
                reorderLevel: sql`COALESCE(${products.reorderLevel}, 0) + ${item.absQuantity}`,
                minimumStock: sql`COALESCE(${products.minimumStock}, 0) + ${item.absQuantity}`,
                updatedAt: new Date(),
              })
              .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
          }
        }

        return inserted;
      });

      return res.status(201).json({
        success: true,
        data: {
          ...createdRefund,
          customerName: customer.trim(),
          restocked: restock,
          total: Number(createdRefund.total),
          tax: Number(createdRefund.tax),
          subtotal: Number(createdRefund.subtotal),
        },
      });
    } catch (error: any) {
      console.error('[REFUNDS POST ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to process return & refund',
      });
    }
  }
}