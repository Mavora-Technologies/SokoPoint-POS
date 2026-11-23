import { Request, Response } from 'express';
import { db } from '../../db';
import { orders, orderItems, products, branches } from '../../db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().refine((q) => q !== 0, 'Quantity cannot be zero'),
});

const createOrderSchema = z.object({
  orderNum: z.string().min(1).optional(),
  customerId: z.string().uuid().nullable().optional(),
  customer: z.string().min(1).default('Walk-in Customer'),
  saleChannel: z.enum(['Over The Counter', 'Delivery', 'Wholesale']).optional().default('Over The Counter'),
  method: z.enum(['cash', 'mpesa', 'card', 'credit', 'bank']).default('cash'),
  isRefund: z.boolean().optional().default(false),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

export class OrdersController {
  // GET /api/v1/orders
  static async getOrders(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.tenantId, tenantId))
        .orderBy(desc(orders.createdAt));

      return res.status(200).json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[ORDERS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to load orders from database',
      });
    }
  }

  // POST /api/v1/orders
  static async createOrder(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const userId = req.auth?.userId || req.user?.userId || null;

      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order payload',
          errors: parsed.error.format(),
        });
      }

      const { orderNum, customerId, customer, saleChannel, method, isRefund, items } = parsed.data;

      // Resolve valid branchId for this tenant (required by orders.branchId NOT NULL)
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

      // Fetch authoritative products strictly scoped to this tenant
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
        const signedQty = isRefund ? -Math.abs(item.quantity) : Math.abs(item.quantity);
        const lineSubtotal = unitPrice * signedQty;
        computedTotal += lineSubtotal;

        return {
          productId: prod.id,
          productName: prod.name,
          quantity: signedQty,
          unitPrice,
          subtotal: lineSubtotal,
        };
      });

      const taxRate = 0.16;
      const taxableBase = computedTotal / (1 + taxRate);
      const vatAmount = computedTotal - taxableBase;
      const finalReceiptNum = orderNum || `SOKO-${Math.floor(Math.random() * 900000) + 100000}`;

      const createdOrder = await db.transaction(async (tx) => {
        // 1. Insert Order Header
        const [insertedOrder] = await tx
          .insert(orders)
          .values({
            tenantId,
            branchId,
            customerId: customerId || null,
            userId,
            orderNumber: finalReceiptNum,
            status: isRefund ? 'refunded' : 'completed',
            subtotal: taxableBase.toFixed(2),
            tax: vatAmount.toFixed(2),
            total: computedTotal.toFixed(2),
            paymentMethod: method,
          })
          .returning();

        // 2. Insert Order Line Items & Sync Inventory Central Stock
        for (const item of pricedItems) {
          await tx.insert(orderItems).values({
            orderId: insertedOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            subtotal: item.subtotal.toFixed(2),
          });

          // Atomic stock adjustment: positive quantity reduces stock, negative (refund) restores stock
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
          saleChannel,
          total: Number(createdOrder.total),
          tax: Number(createdOrder.tax),
          subtotal: Number(createdOrder.subtotal),
        },
      });
    } catch (error: any) {
      console.error('[ORDERS POST ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to persist order',
      });
    }
  }
}