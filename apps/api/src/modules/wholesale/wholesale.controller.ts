import { Request, Response } from 'express';
import { db } from '../../db';
import { orders, orderItems, products, branches } from '../../db/schema';
import { eq, and, desc, inArray, or, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

const wholesaleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  unitPrice: z.number().nonnegative().optional(), // Optional negotiated B2B unit price
});

const createWholesaleSchema = z.object({
  orderNum: z.string().min(1).optional(),
  customerId: z.string().uuid().nullable().optional(),
  customer: z.string().min(1).default('Wholesale Client'),
  method: z.enum(['credit', 'bank', 'mpesa', 'cash', 'card']).default('credit'),
  items: z.array(wholesaleItemSchema).min(1, 'At least one product line is required'),
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'dispatched', 'completed', 'cancelled']),
});

export class WholesaleController {
  // GET /api/v1/wholesale
  static async getWholesaleOrders(req: AuthRequest, res: Response) {
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
              ilike(orders.orderNumber, 'WHL-%'),
              inArray(orders.paymentMethod, ['credit', 'bank'])
            )
          )
        )
        .orderBy(desc(orders.createdAt));

      return res.status(200).json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[WHOLESALE GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to load wholesale orders',
      });
    }
  }

  // POST /api/v1/wholesale
  static async createWholesaleOrder(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const userId = req.auth?.userId || req.user?.userId || null;

      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const parsed = createWholesaleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wholesale order payload',
          errors: parsed.error.format(),
        });
      }

      const { orderNum, customerId, customer, method, items } = parsed.data;

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

        const unitPrice =
          item.unitPrice !== undefined ? item.unitPrice : Number(prod.sellingPrice ?? 0);
        const lineSubtotal = unitPrice * item.quantity;
        computedTotal += lineSubtotal;

        return {
          productId: prod.id,
          productName: prod.name,
          quantity: item.quantity,
          unitPrice,
          subtotal: lineSubtotal,
        };
      });

      const taxRate = 0.16;
      const taxableBase = computedTotal / (1 + taxRate);
      const vatAmount = computedTotal - taxableBase;
      const finalOrderNum = orderNum || `WHL-${Math.floor(Math.random() * 900000) + 100000}`;

      const createdOrder = await db.transaction(async (tx) => {
        const [insertedOrder] = await tx
          .insert(orders)
          .values({
            tenantId,
            branchId,
            customerId: customerId || null,
            userId,
            orderNumber: finalOrderNum,
            status: method === 'credit' ? 'pending' : 'completed',
            subtotal: taxableBase.toFixed(2),
            tax: vatAmount.toFixed(2),
            total: computedTotal.toFixed(2),
            paymentMethod: method,
          })
          .returning();

        for (const item of pricedItems) {
          await tx.insert(orderItems).values({
            orderId: insertedOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            subtotal: item.subtotal.toFixed(2),
          });

          // Atomic stock deduction in Inventory Central
          await tx
            .update(products)
            .set({
              reorderLevel: sql`GREATEST(0, COALESCE(${products.reorderLevel}, 0) - ${item.quantity})`,
              minimumStock: sql`GREATEST(0, COALESCE(${products.minimumStock}, 0) - ${item.quantity})`,
              updatedAt: new Date(),
            })
            .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
        }

        return insertedOrder;
      });

      return res.status(201).json({
        success: true,
        data: {
          ...createdOrder,
          customerName: customer.trim(),
          total: Number(createdOrder.total),
          tax: Number(createdOrder.tax),
          subtotal: Number(createdOrder.subtotal),
        },
      });
    } catch (error: any) {
      console.error('[WHOLESALE POST ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create wholesale order',
      });
    }
  }

  // PATCH /api/v1/wholesale/:id/status
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.format() });
      }

      const orderId = String(req.params.id);
      const [existing] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Wholesale order not found' });
      }

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(orders)
          .set({ status: parsed.data.status })
          .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
          .returning();

        // Restore stock if cancelling a non-cancelled order
        if (parsed.data.status === 'cancelled' && existing.status !== 'cancelled') {
          const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
          for (const line of lines) {
            await tx
              .update(products)
              .set({
                reorderLevel: sql`COALESCE(${products.reorderLevel}, 0) + ${line.quantity}`,
                minimumStock: sql`COALESCE(${products.minimumStock}, 0) + ${line.quantity}`,
                updatedAt: new Date(),
              })
              .where(and(eq(products.id, line.productId), eq(products.tenantId, tenantId)));
          }
        }

        return row;
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[WHOLESALE STATUS PATCH ERROR]', error);
      return res.status(500).json({ success: false, message: 'Failed to update wholesale order status' });
    }
  }
}