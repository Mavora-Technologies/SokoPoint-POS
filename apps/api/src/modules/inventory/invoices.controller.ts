import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class SupplierInvoicesController {
  // GET /api/v1/inventory/invoices
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const invRes = await db.execute(sql`
        SELECT si.id,
               si.internal_ref AS "internalRef",
               si.vendor_invoice_no AS "vendorInvoiceNo",
               si.supplier_id AS "supplierId",
               COALESCE(s.name, si.supplier_name) AS "supplierName",
               COALESCE(s.kra_pin, si.supplier_kra_pin, 'NO-PIN') AS "supplierKraPin",
               si.purchase_order_id AS "purchaseOrderId",
               si.po_number AS "poNumber",
               si.grn_id AS "grnId",
               si.grn_number AS "grnNumber",
               si.taxable_net::float AS "taxableNet",
               si.vat_amount::float AS "vatAmount",
               si.invoice_total::float AS "invoiceTotal",
               si.amount_paid::float AS "amountPaid",
               si.balance_due::float AS "balanceDue",
               CASE
                 WHEN si.balance_due <= 0 THEN 'PAID'
                 WHEN si.due_date < CURRENT_DATE AND si.balance_due > 0 THEN 'OVERDUE'
                 WHEN si.amount_paid > 0 AND si.balance_due > 0 THEN 'PARTIAL'
                 ELSE 'UNPAID'
               END AS status,
               si.due_date AS "dueDate",
               si.notes,
               si.created_by AS "createdBy",
               si.created_at AS "createdAt"
        FROM supplier_invoices si
        LEFT JOIN suppliers s
          ON s.id = si.supplier_id
         AND s.tenant_id = si.tenant_id
        WHERE si.tenant_id = ${tenantId}
        ORDER BY si.created_at DESC
      `);

      const invoices = rowsOf(invRes);

      const itemsRes = await db.execute(sql`
        SELECT id,
               invoice_id AS "invoiceId",
               product_id AS "productId",
               item_name AS "itemName",
               COALESCE(sku, 'NO-SKU') AS sku,
               billed_qty::float AS "billedQty",
               unit_price::float AS "unitPrice",
               vat_rate::float AS "vatRate",
               subtotal::float AS subtotal
        FROM supplier_invoice_items
        WHERE tenant_id = ${tenantId}
        ORDER BY item_name ASC
      `);

      const itemsByInv = new Map<string, any[]>();
      for (const line of rowsOf(itemsRes)) {
        const list = itemsByInv.get(line.invoiceId) || [];
        list.push(line);
        itemsByInv.set(line.invoiceId, list);
      }

      // Verified GRNs that have not yet been linked to a supplier invoice
      const uninvoicedGrnsRes = await db.execute(sql`
        SELECT g.id,
               g.grn_number AS "grnNumber",
               g.purchase_order_id AS "purchaseOrderId",
               g.po_number AS "poNumber",
               g.supplier_id AS "supplierId",
               g.supplier_name AS "supplierName",
               g.delivery_note_ref AS "deliveryNoteRef",
               g.intake_date AS "intakeDate"
        FROM goods_received_notes g
        LEFT JOIN supplier_invoices si
          ON si.grn_id = g.id
         AND si.tenant_id = g.tenant_id
        WHERE g.tenant_id = ${tenantId}
          AND si.id IS NULL
        ORDER BY g.intake_date DESC
      `);

      const uninvoicedGrns = rowsOf(uninvoicedGrnsRes);

      // Fetch line items for uninvoiced GRNs so 1-click auto-match populates instantly
      const grnItemsRes = await db.execute(sql`
        SELECT gi.grn_id AS "grnId",
               gi.product_id AS "productId",
               gi.accepted_qty::float AS "acceptedQty",
               gi.unit_price::float AS "unitPrice",
               p.name AS "productName",
               COALESCE(p.sku, 'NO-SKU') AS sku
        FROM grn_items gi
        JOIN products p
          ON p.id = gi.product_id
         AND p.tenant_id = gi.tenant_id
        WHERE gi.tenant_id = ${tenantId}
          AND gi.accepted_qty > 0
      `);

      const linesByGrn = new Map<string, any[]>();
      for (const l of rowsOf(grnItemsRes)) {
        const list = linesByGrn.get(l.grnId) || [];
        list.push(l);
        linesByGrn.set(l.grnId, list);
      }

      const enrichedGrns = uninvoicedGrns.map((g: any) => ({
        ...g,
        items: linesByGrn.get(g.id) || [],
      }));

      const enrichedInvoices = invoices.map((inv: any) => ({
        ...inv,
        items: itemsByInv.get(inv.id) || [],
      }));

      return res.status(200).json({
        success: true,
        data: {
          invoices: enrichedInvoices,
          uninvoicedGrns: enrichedGrns,
        },
      });
    } catch (error: any) {
      console.error('[SUPPLIER INVOICES GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load supplier invoices',
      });
    }
  }

  // POST /api/v1/inventory/invoices
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const {
        supplierId,
        vendorInvoiceNo,
        dueDate,
        grnId = null,
        purchaseOrderId = null,
        notes = '',
        items = [],
      } = req.body || {};

      if (!supplierId) {
        return res.status(400).json({ success: false, message: 'Supplier is required.' });
      }
      if (!vendorInvoiceNo || !String(vendorInvoiceNo).trim()) {
        return res.status(400).json({ success: false, message: 'Vendor Invoice # is required.' });
      }
      if (!dueDate) {
        return res.status(400).json({ success: false, message: 'Payment Due Date is required.' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Add at least one billed line item.' });
      }

      const supRes = await db.execute(sql`
        SELECT id, name, kra_pin AS "kraPin"
        FROM suppliers
        WHERE id = ${String(supplierId)} AND tenant_id = ${tenantId}
        LIMIT 1
      `);
      const supplier = rowsOf(supRes)[0];
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found in tenant registry.' });
      }

      let resolvedPoNumber: string | null = null;
      let resolvedGrnNumber: string | null = null;

      if (grnId) {
        const gRes = await db.execute(sql`
          SELECT grn_number AS "grnNumber", po_number AS "poNumber", purchase_order_id AS "purchaseOrderId"
          FROM goods_received_notes
          WHERE id = ${String(grnId)} AND tenant_id = ${tenantId}
          LIMIT 1
        `);
        const g = rowsOf(gRes)[0];
        if (g) {
          resolvedGrnNumber = g.grnNumber;
          resolvedPoNumber = g.poNumber;
        }
      }

      const countRes = await db.execute(sql`
        SELECT COUNT(*)::int AS cnt FROM supplier_invoices WHERE tenant_id = ${tenantId}
      `);
      const nextSeq = (rowsOf(countRes)[0]?.cnt || 0) + 1;
      const internalRef = `PINV-${new Date().getFullYear()}-${String(nextSeq).padStart(4, '0')}`;
      const createdBy = req.auth?.email || req.user?.email || 'Admin';

      let taxableNet = 0;
      let vatAmount = 0;

      const parsedItems = items.map((line: any) => {
        const qty = Math.max(0.01, Number(line.billedQty) || 1);
        const unitPrice = Math.max(0, Number(line.unitPrice) || 0);
        const vatRate = line.vatRate !== undefined ? Math.max(0, Number(line.vatRate) || 0) : 16;
        const lineNet = Number((qty * unitPrice).toFixed(2));
        const lineVat = Number(((lineNet * vatRate) / 100).toFixed(2));
        taxableNet += lineNet;
        vatAmount += lineVat;

        return {
          productId: line.productId || null,
          itemName: String(line.itemName || 'Billed Item').trim(),
          sku: String(line.sku || 'NO-SKU').trim(),
          billedQty: qty,
          unitPrice,
          vatRate,
          subtotal: lineNet,
        };
      });

      const roundedNet = Number(taxableNet.toFixed(2));
      const roundedVat = Number(vatAmount.toFixed(2));
      const invoiceTotal = Number((roundedNet + roundedVat).toFixed(2));

      const created = await db.transaction(async (tx) => {
        const invInsert = await tx.execute(sql`
          INSERT INTO supplier_invoices (
            tenant_id, internal_ref, vendor_invoice_no, supplier_id, supplier_name,
            supplier_kra_pin, purchase_order_id, po_number, grn_id, grn_number,
            taxable_net, vat_amount, invoice_total, amount_paid, balance_due,
            status, due_date, notes, created_by
          )
          VALUES (
            ${tenantId},
            ${internalRef},
            ${String(vendorInvoiceNo).trim()},
            ${supplier.id},
            ${supplier.name},
            ${supplier.kraPin || null},
            ${purchaseOrderId || null},
            ${resolvedPoNumber},
            ${grnId || null},
            ${resolvedGrnNumber},
            ${roundedNet},
            ${roundedVat},
            ${invoiceTotal},
            0,
            ${invoiceTotal},
            'UNPAID',
            ${String(dueDate)},
            ${notes ? String(notes).trim() : null},
            ${createdBy}
          )
          RETURNING id, internal_ref AS "internalRef", invoice_total::float AS "invoiceTotal", status
        `);

        const invRow = rowsOf(invInsert)[0];

        for (const item of parsedItems) {
          await tx.execute(sql`
            INSERT INTO supplier_invoice_items (
              tenant_id, invoice_id, product_id, item_name, sku,
              billed_qty, unit_price, vat_rate, subtotal
            )
            VALUES (
              ${tenantId}, ${invRow.id}, ${item.productId}, ${item.itemName}, ${item.sku},
              ${item.billedQty}, ${item.unitPrice}, ${item.vatRate}, ${item.subtotal}
            )
          `);
        }

        return invRow;
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[SUPPLIER INVOICES CREATE ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.message || 'Failed to save and post supplier invoice',
      });
    }
  }

  // PATCH /api/v1/inventory/invoices/:id/pay
  static async recordPayment(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const invId = String(req.params.id);
      const { amount } = req.body || {};

      const invRes = await db.execute(sql`
        SELECT id, invoice_total::float AS "invoiceTotal", amount_paid::float AS "amountPaid", balance_due::float AS "balanceDue"
        FROM supplier_invoices
        WHERE id = ${invId} AND tenant_id = ${tenantId}
        LIMIT 1
      `);
      const existing = rowsOf(invRes)[0];
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Supplier invoice not found.' });
      }

      const payAmount = amount !== undefined ? Math.max(0.01, Number(amount) || 0) : existing.balanceDue;
      const nextPaid = Math.min(existing.invoiceTotal, Number((existing.amountPaid + payAmount).toFixed(2)));
      const nextBalance = Math.max(0, Number((existing.invoiceTotal - nextPaid).toFixed(2)));
      const nextStatus = nextBalance <= 0 ? 'PAID' : 'PARTIAL';

      const updRes = await db.execute(sql`
        UPDATE supplier_invoices
        SET amount_paid = ${nextPaid},
            balance_due = ${nextBalance},
            status = ${nextStatus},
            updated_at = NOW()
        WHERE id = ${invId} AND tenant_id = ${tenantId}
        RETURNING id, internal_ref AS "internalRef", amount_paid::float AS "amountPaid", balance_due::float AS "balanceDue", status
      `);

      return res.status(200).json({ success: true, data: rowsOf(updRes)[0] });
    } catch (error: any) {
      console.error('[SUPPLIER INVOICES PAY ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to record invoice settlement',
      });
    }
  }
}