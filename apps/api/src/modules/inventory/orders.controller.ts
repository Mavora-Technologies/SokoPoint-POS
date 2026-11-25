import { Request, Response } from 'express';
import { db } from '../../db';
import { products } from '../../db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);
const VAT_RATE = 0.16;

export class ProcurementOrdersController {
  // GET /api/v1/inventory/orders
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const poRes = await db.execute(sql`
        SELECT po.id,
               po.po_number AS "poNumber",
               po.supplier_id AS "supplierId",
               COALESCE(s.name, po.supplier_name, 'Unassigned Supplier') AS "supplierName",
               COALESCE(s.payment_terms, po.payment_terms, 'NET_30') AS "paymentTerms",
               po.status,
               COALESCE(po.net_subtotal, 0)::float AS "netSubtotal",
               COALESCE(po.vat_amount, 0)::float AS "vatAmount",
               COALESCE(po.total_amount, 0)::float AS "totalAmount",
               COALESCE(po.expected_delivery, po.expected_date::date) AS "expectedDelivery",
               po.created_at AS "dateRaised",
               po.notes
        FROM purchase_orders po
        LEFT JOIN suppliers s
          ON s.id = po.supplier_id
         AND s.tenant_id = po.tenant_id
        WHERE po.tenant_id = ${tenantId}
        ORDER BY po.created_at DESC
      `);

      const poList = rowsOf(poRes);

      const itemsRes = await db.execute(sql`
        SELECT poi.id,
               poi.purchase_order_id AS "purchaseOrderId",
               poi.product_id AS "productId",
               COALESCE(poi.ordered_qty, 0)::float AS "orderedQty",
               COALESCE(poi.received_qty, 0)::float AS "receivedQty",
               COALESCE(poi.unit_price, 0)::float AS "unitPrice",
               COALESCE(poi.subtotal, 0)::float AS "subtotal",
               p.name AS "productName",
               COALESCE(p.sku, 'NO-SKU') AS "sku"
        FROM purchase_order_items poi
        JOIN products p
          ON p.id = poi.product_id
         AND p.tenant_id = poi.tenant_id
        WHERE poi.tenant_id = ${tenantId}
        ORDER BY p.name ASC
      `);

      const itemsByPo = new Map<string, any[]>();
      for (const line of rowsOf(itemsRes)) {
        const list = itemsByPo.get(line.purchaseOrderId) || [];
        list.push(line);
        itemsByPo.set(line.purchaseOrderId, list);
      }

      const enriched = poList.map((po: any) => ({
        ...po,
        items: itemsByPo.get(po.id) || [],
      }));

      return res.status(200).json({ success: true, data: enriched });
    } catch (error: any) {
      console.error('[PROCUREMENT ORDERS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load purchase orders',
      });
    }
  }

  // POST /api/v1/inventory/orders
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const {
        supplierId,
        expectedDelivery = null,
        notes = '',
        items = [],
      } = req.body || {};

      if (!supplierId) {
        return res.status(400).json({ success: false, message: 'Supplier is required to raise a PO.' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Add at least one SKU line item.' });
      }

      const supRes = await db.execute(sql`
        SELECT id, name, COALESCE(payment_terms, 'NET_30') AS "paymentTerms"
        FROM suppliers
        WHERE id = ${String(supplierId)} AND tenant_id = ${tenantId}
        LIMIT 1
      `);
      const supplier = rowsOf(supRes)[0];
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found in tenant registry.' });
      }

      const branchRes = await db.execute(sql`
        SELECT id FROM branches WHERE tenant_id = ${tenantId} LIMIT 1
      `);
      const branchId = rowsOf(branchRes)[0]?.id || null;

      const productIds = Array.from(new Set(items.map((i: any) => String(i.productId))));
      const dbProducts = await db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, tenantId), inArray(products.id, productIds)));

      const prodMap = new Map(dbProducts.map((p) => [p.id, p]));
      const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      let netSubtotal = 0;
      const pricedLines = items.map((line: any) => {
        const prod = prodMap.get(String(line.productId));
        if (!prod) {
          throw new Error('One or more selected SKUs do not belong to this tenant.');
        }
        const orderedQty = Math.max(0.01, Number(line.orderedQty) || 1);
        const unitPrice =
          line.unitPrice !== undefined && line.unitPrice !== ''
            ? Math.max(0, Number(line.unitPrice) || 0)
            : Number(prod.costPrice ?? prod.sellingPrice ?? 0);
        const subtotal = Number((orderedQty * unitPrice).toFixed(3));
        netSubtotal += subtotal;
        return { productId: prod.id, orderedQty, unitPrice, subtotal };
      });

      const roundedNet = Number(netSubtotal.toFixed(3));
      const vatAmount = Number((roundedNet * VAT_RATE).toFixed(3));
      const totalAmount = Number((roundedNet + vatAmount).toFixed(3));

      const created = await db.transaction(async (tx) => {
        const poInsert = await tx.execute(sql`
          INSERT INTO purchase_orders (
            tenant_id, branch_id, po_number, supplier_id, supplier_name, payment_terms,
            status, net_subtotal, vat_amount, total_amount, expected_delivery, notes
          )
          VALUES (
            ${tenantId},
            ${branchId},
            ${poNumber},
            ${supplier.id},
            ${supplier.name},
            ${supplier.paymentTerms},
            'DRAFT_PO',
            ${roundedNet},
            ${vatAmount},
            ${totalAmount},
            ${expectedDelivery || null},
            ${notes || null}
          )
          RETURNING id, po_number AS "poNumber", status, total_amount::float AS "totalAmount"
        `);

        const poRow = rowsOf(poInsert)[0];

        for (const line of pricedLines) {
          await tx.execute(sql`
            INSERT INTO purchase_order_items (
              tenant_id, purchase_order_id, product_id, ordered_qty, received_qty, unit_price, subtotal
            )
            VALUES (
              ${tenantId}, ${poRow.id}, ${line.productId}, ${line.orderedQty},
              0, ${line.unitPrice}, ${line.subtotal}
            )
          `);
        }

        return poRow;
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[PROCUREMENT ORDERS CREATE ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.message || 'Failed to create purchase order',
      });
    }
  }

  // PATCH /api/v1/inventory/orders/:id/status
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const poId = String(req.params.id);
      const { status } = req.body || {};

      const allowed = ['DRAFT_PO', 'SENT_TO_VENDOR', 'PARTIAL_INWARD', 'FULLY_RECEIVED', 'CANCELLED'];
      if (!allowed.includes(String(status))) {
        return res.status(400).json({ success: false, message: 'Invalid purchase order status.' });
      }

      const updRes = await db.execute(sql`
        UPDATE purchase_orders
        SET status = ${String(status)},
            updated_at = NOW()
        WHERE id = ${poId} AND tenant_id = ${tenantId}
        RETURNING id, po_number AS "poNumber", status
      `);

      const updated = rowsOf(updRes)[0];
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Purchase order not found.' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[PROCUREMENT ORDERS STATUS ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to update purchase order status',
      });
    }
  }
}