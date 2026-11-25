import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class GrnController {
  // GET /api/v1/inventory/grn
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const grnRes = await db.execute(sql`
        SELECT id,
               grn_number AS "grnNumber",
               purchase_order_id AS "purchaseOrderId",
               po_number AS "poNumber",
               supplier_id AS "supplierId",
               supplier_name AS "supplierName",
               COALESCE(NULLIF(TRIM(delivery_note_ref), ''), 'NO-REF-ATTACHED') AS "deliveryNoteRef",
               inspection_notes AS "inspectionNotes",
               status,
               verified_by AS "verifiedBy",
               intake_date AS "intakeDate"
        FROM goods_received_notes
        WHERE tenant_id = ${tenantId}
        ORDER BY intake_date DESC, created_at DESC
      `);

      const grnList = rowsOf(grnRes);

      const itemsRes = await db.execute(sql`
        SELECT gi.id,
               gi.grn_id AS "grnId",
               gi.product_id AS "productId",
               gi.accepted_qty::float AS "acceptedQty",
               gi.rejected_qty::float AS "rejectedQty",
               gi.unit_price::float AS "unitPrice",
               gi.rejection_reason AS "rejectionReason",
               p.name AS "productName",
               COALESCE(p.sku, 'NO-SKU') AS "sku"
        FROM grn_items gi
        JOIN products p
          ON p.id = gi.product_id
         AND p.tenant_id = gi.tenant_id
        WHERE gi.tenant_id = ${tenantId}
        ORDER BY p.name ASC
      `);

      const itemsByGrn = new Map<string, any[]>();
      for (const line of rowsOf(itemsRes)) {
        const list = itemsByGrn.get(line.grnId) || [];
        list.push(line);
        itemsByGrn.set(line.grnId, list);
      }

      const enriched = grnList.map((g: any) => ({
        ...g,
        items: itemsByGrn.get(g.id) || [],
      }));

      return res.status(200).json({ success: true, data: enriched });
    } catch (error: any) {
      console.error('[GRN GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load Goods Received Notes',
      });
    }
  }

  // POST /api/v1/inventory/grn
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const {
        purchaseOrderId,
        deliveryNoteRef = '',
        inspectionNotes = '',
        items = [],
      } = req.body || {};

      if (!purchaseOrderId) {
        return res.status(400).json({ success: false, message: 'Select a Purchase Order to receive against.' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Provide at least one received line item.' });
      }

      const poRes = await db.execute(sql`
        SELECT po.id,
               po.po_number AS "poNumber",
               po.supplier_id AS "supplierId",
               COALESCE(s.name, po.supplier_name, 'Unassigned Supplier') AS "supplierName"
        FROM purchase_orders po
        LEFT JOIN suppliers s
          ON s.id = po.supplier_id
         AND s.tenant_id = po.tenant_id
        WHERE po.id = ${String(purchaseOrderId)}
          AND po.tenant_id = ${tenantId}
        LIMIT 1
      `);

      const po = rowsOf(poRes)[0];
      if (!po) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found in tenant ledger.' });
      }

      const verifiedBy = req.auth?.email || req.user?.email || 'Admin';
      const grnNumber = `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const created = await db.transaction(async (tx) => {
        const grnInsert = await tx.execute(sql`
          INSERT INTO goods_received_notes (
            tenant_id, grn_number, purchase_order_id, po_number,
            supplier_id, supplier_name, delivery_note_ref,
            inspection_notes, status, verified_by
          )
          VALUES (
            ${tenantId},
            ${grnNumber},
            ${po.id},
            ${po.poNumber},
            ${po.supplierId || null},
            ${po.supplierName},
            ${deliveryNoteRef ? String(deliveryNoteRef).trim() : null},
            ${inspectionNotes ? String(inspectionNotes).trim() : null},
            'STOCK_CREDITED',
            ${verifiedBy}
          )
          RETURNING id, grn_number AS "grnNumber", status
        `);

        const grnRow = rowsOf(grnInsert)[0];

        for (const line of items) {
          const acceptedQty = Math.max(0, Number(line.acceptedQty) || 0);
          const rejectedQty = Math.max(0, Number(line.rejectedQty) || 0);
          const unitPrice = Math.max(0, Number(line.unitPrice) || 0);
          const reason = line.rejectionReason ? String(line.rejectionReason).trim() : null;

          if (acceptedQty === 0 && rejectedQty === 0) continue;

          await tx.execute(sql`
            INSERT INTO grn_items (
              tenant_id, grn_id, purchase_order_item_id, product_id,
              accepted_qty, rejected_qty, unit_price, rejection_reason
            )
            VALUES (
              ${tenantId},
              ${grnRow.id},
              ${line.purchaseOrderItemId || null},
              ${String(line.productId)},
              ${acceptedQty},
              ${rejectedQty},
              ${unitPrice},
              ${reason}
            )
          `);

          if (line.purchaseOrderItemId && acceptedQty > 0) {
            await tx.execute(sql`
              UPDATE purchase_order_items
              SET received_qty = COALESCE(received_qty, 0) + ${acceptedQty}
              WHERE id = ${String(line.purchaseOrderItemId)}
                AND tenant_id = ${tenantId}
            `);
          }
        }

        // Recompute parent PO fulfillment status
        const totalsRes = await tx.execute(sql`
          SELECT COALESCE(SUM(ordered_qty), 0)::float AS "totalOrdered",
                 COALESCE(SUM(received_qty), 0)::float AS "totalReceived"
          FROM purchase_order_items
          WHERE purchase_order_id = ${po.id}
            AND tenant_id = ${tenantId}
        `);
        const totals = rowsOf(totalsRes)[0] || { totalOrdered: 0, totalReceived: 0 };
        const nextPoStatus =
          totals.totalOrdered > 0 && totals.totalReceived >= totals.totalOrdered
            ? 'FULLY_RECEIVED'
            : 'PARTIAL_INWARD';

        await tx.execute(sql`
          UPDATE purchase_orders
          SET status = ${nextPoStatus},
              updated_at = NOW()
          WHERE id = ${po.id}
            AND tenant_id = ${tenantId}
        `);

        return { ...grnRow, poStatus: nextPoStatus };
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[GRN CREATE ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.message || 'Failed to record Goods Received Note',
      });
    }
  }
}