import { Request, Response } from 'express';
import { db } from '../../db';
import { orders, products } from '../../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().refine((q) => q !== 0, 'Quantity cannot be zero'),
});

const createOrderSchema = z.object({
  orderNum: z.string().min(1).optional(),
  customer: z.string().min(1).default('Walk-in Customer'),
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
      const userId = req.auth?.userId || req.user?.userId;

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

      const { orderNum, customer, method, isRefund, items } = parsed.data;
      const productIds = Array.from(new Set(items.map((i) => i.productId)));

      // Fetch authoritative products strictly scoped to this tenant
      const dbProducts = await db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, tenantId), inArray(products.id, productIds)));

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      let computedSubtotal = 0;
      const pricedItems = items.map((item) => {
        const prod = productMap.get(item.productId);
        if (!prod) {
          throw new Error(`Product ${item.productId} not found in tenant catalog`);
        }

        const unitPrice = Number(prod.sellingPrice ?? 0);
        const signedQty = isRefund ? -Math.abs(item.quantity) : Math.abs(item.quantity);
        const lineTotal = unitPrice * signedQty;
        computedSubtotal += lineTotal;

        return {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku || '',
          quantity: signedQty,
          unitPrice,
          subtotal: lineTotal,
        };
      });

      const taxRate = 0.16;
      const taxableBase = computedSubtotal / (1 + taxRate);
      const vatAmount = computedSubtotal - taxableBase;
      const finalReceiptNum = orderNum || `SOKO-${Math.floor(Math.random() * 900000) + 100000}`;

      const insertPayload = {
        tenantId,
        branchId: req.auth?.branchId || req.user?.branchId || null,
        userId: userId || null,
        orderNumber: finalReceiptNum,
        customer: customer.trim(),
        paymentMethod: method,
        status: isRefund ? 'refunded' : 'completed',
        subtotal: taxableBase.toFixed(2),
        tax: vatAmount.toFixed(2),
        total: computedSubtotal.toFixed(2),
        items: pricedItems,
      };

      const createdOrder = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(orders)
          .values(insertPayload as typeof orders.$inferInsert)
          .returning();

        return inserted;
      });

      return res.status(201).json({
        success: true,
        data: {
          ...createdOrder,
          customer: customer.trim(),
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