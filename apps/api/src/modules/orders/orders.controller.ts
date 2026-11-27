import { Request, Response } from 'express';
import { db } from '../../db';
import { orders, orderItems, products, branches } from '../../db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string; email?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string; email?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().refine((q) => q !== 0, 'Quantity cannot be zero'),
});

const createOrderSchema = z.object({
  orderNum: z.string().min(1).optional(),
  customerId: z.string().uuid().nullable().optional(),
  customer: z.string().min(1).default('Walk-in Customer'),
  customerPin: z.string().max(40).nullable().optional(),
  saleChannel: z
    .enum(['Over The Counter', 'Wholesale Dispatch', 'Delivery', 'Click & Collect', 'Wholesale'])
    .optional()
    .default('Over The Counter'),
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

      const [ordersRes, itemsRes, branchesRes] = await Promise.all([
        db.execute(sql`
          SELECT o.id,
                 o.order_number AS "orderNum",
                 o.branch_id AS "branchId",
                 COALESCE(b.name, 'Main Branch') AS "branchName",
                 COALESCE(
                   NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''),
                   u.email,
                   'POS Cashier'
                 ) AS "custodianName",
                 COALESCE(NULLIF(TRIM(o.customer_name), ''), 'Walk-in Customer') AS customer,
                 o.customer_pin AS "customerPin",
                 COALESCE(NULLIF(TRIM(o.sale_channel), ''), 'Over The Counter') AS "saleChannel",
                 COALESCE(o.status, 'completed') AS status,
                 COALESCE(o.payment_method, 'cash') AS method,
                 COALESCE(o.subtotal, 0)::float AS subtotal,
                 COALESCE(o.tax, 0)::float AS tax,
                 COALESCE(o.total, 0)::float AS total,
                 o.etims_cu_no AS "etimsCuNo",
                 o.created_at AS "createdAt"
          FROM orders o
          LEFT JOIN branches b ON b.id = o.branch_id AND b.tenant_id = o.tenant_id
          LEFT JOIN users u ON u.id = o.user_id AND u.tenant_id = o.tenant_id
          WHERE o.tenant_id = ${tenantId}
          ORDER BY o.created_at DESC
          LIMIT 250
        `),
        db.execute(sql`
          SELECT oi.order_id AS "orderId",
                 oi.product_id AS "productId",
                 COALESCE(p.name, 'SKU Item') AS "productName",
                 COALESCE(p.sku, '') AS sku,
                 oi.quantity::int AS quantity,
                 COALESCE(oi.unit_price, 0)::float AS "unitPrice",
                 COALESCE(oi.subtotal, 0)::float AS subtotal
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          LEFT JOIN products p ON p.id = oi.product_id AND p.tenant_id = o.tenant_id
          WHERE o.tenant_id = ${tenantId}
        `),
        db.execute(sql`
          SELECT id, name
          FROM branches
          WHERE tenant_id = ${tenantId}
          ORDER BY name ASC
        `),
      ]);

      const itemsByOrder = new Map<string, any[]>();
      for (const item of rowsOf(itemsRes)) {
        const list = itemsByOrder.get(item.orderId) || [];
        list.push(item);
        itemsByOrder.set(item.orderId, list);
      }

      const enrichedOrders = rowsOf(ordersRes).map((o: any) => ({
        ...o,
        items: itemsByOrder.get(o.id) || [],
      }));

      return res.status(200).json({
        success: true,
        data: enrichedOrders,
        branches: rowsOf(branchesRes),
      });
    } catch (error: any) {
      console.error('[ORDERS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to load orders from database',
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

      const { orderNum, customerId, customer, customerPin, saleChannel, method, isRefund, items } = parsed.data;

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

        // Persist retail/wholesale metadata columns
        await tx.execute(sql`
          UPDATE orders
          SET sale_channel = ${saleChannel},
              customer_name = ${customer.trim()},
              customer_pin = ${customerPin ? customerPin.trim().toUpperCase() : null}
          WHERE id = ${insertedOrder.id} AND tenant_id = ${tenantId}
        `);

        for (const item of pricedItems) {
          await tx.insert(orderItems).values({
            orderId: insertedOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            subtotal: item.subtotal.toFixed(2),
          });

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
        message: error?.cause?.message || error?.message || 'Failed to persist order',
      });
    }
  }

  // PATCH /api/v1/orders/:id/status
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const orderId = String(req.params.id);
      const nextStatus = String(req.body?.status || '').toLowerCase().trim();
      const allowed = ['pending', 'packing', 'dispatched', 'completed', 'cancelled', 'refunded'];

      if (!allowed.includes(nextStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid fulfillment status.' });
      }

      const updRes = await db.execute(sql`
        UPDATE orders
        SET status = ${nextStatus}
        WHERE id = ${orderId} AND tenant_id = ${tenantId}
        RETURNING id, order_number AS "orderNum", status
      `);

      const updated = rowsOf(updRes)[0];
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[ORDERS STATUS ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to update order status',
      });
    }
  }
}