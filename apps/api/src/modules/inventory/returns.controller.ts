import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);
const VAT_RATE = 0.16;

export class SupplierReturnsController {
  // GET /api/v1/inventory/returns
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const retRes = await db.execute(sql`
        SELECT sr.id,
               sr.manifest_number AS "manifestNumber",
               sr.debit_note_no AS "debitNoteNo",
               sr.supplier_id AS "supplierId",
               COALESCE(s.name, sr.supplier_name) AS "supplierName",
               COALESCE(s.kra_pin, sr.supplier_kra_pin, 'NO-PIN') AS "supplierKraPin",
               sr.grn_id AS "grnId",
               sr.grn_number AS "grnNumber",
               sr.status,
               sr.taxable_net::float AS "taxableNet",
               sr.vat_amount::float AS "vatAmount",
               sr.debit_valuation::float AS "debitValuation",
               sr.notes,
               sr.created_by AS "createdBy",
               sr.created_at AS "createdAt"
        FROM supplier_returns sr
        LEFT JOIN suppliers s
          ON s.id = sr.supplier_id
         AND s.tenant_id = sr.tenant_id
        WHERE sr.tenant_id = ${tenantId}
        ORDER BY sr.created_at DESC
      `);

      const returnsList = rowsOf(retRes);

      const itemsRes = await db.execute(sql`
        SELECT id,
               return_id AS "returnId",
               product_id AS "productId",
               product_name AS "productName",
               COALESCE(sku, 'NO-SKU') AS sku,
               return_qty::float AS "returnQty",
               unit_cost::float AS "unitCost",
               subtotal::float AS subtotal,
               rejection_reason AS "rejectionReason"
        FROM supplier_return_items
        WHERE tenant_id = ${tenantId}
        ORDER BY product_name ASC
      `);

      const itemsByReturn = new Map<string, any[]>();
      for (const line of rowsOf(itemsRes)) {
        const list = itemsByReturn.get(line.returnId) || [];
        list.push(line);
        itemsByReturn.set(line.returnId, list);
      }

      const enriched = returnsList.map((r: any) => ({
        ...r,
        items: itemsByReturn.get(r.id) || [],
      }));

      return res.status(200).json({ success: true, data: enriched });
    } catch (error: any) {
      console.error('[SUPPLIER RETURNS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load supplier returns',
      });
    }
  }

  // POST /api/v1/inventory/returns
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const {
        supplierId,
        debitNoteNo = '',
        grnId = null,
        notes = '',
        items = [],
      } = req.body || {};

      if (!supplierId) {
        return res.status(400).json({ success: false, message: 'Supplier is required.' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Add at least one returned SKU line item.' });
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

      let resolvedGrnNumber: string | null = null;
      if (grnId) {
        const gRes = await db.execute(sql`
          SELECT grn_number AS "grnNumber"
          FROM goods_received_notes
          WHERE id = ${String(grnId)} AND tenant_id = ${tenantId}
          LIMIT 1
        `);
        resolvedGrnNumber = rowsOf(gRes)[0]?.grnNumber || null;
      }

      const manifestNumber = `PRT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const createdBy = req.auth?.email || req.user?.email || 'Admin';

      let taxableNet = 0;
      const parsedItems = items.map((line: any) => {
        const returnQty = Math.max(0.01, Number(line.returnQty) || 1);
        const unitCost = Math.max(0, Number(line.unitCost) || 0);
        const subtotal = Number((returnQty * unitCost).toFixed(2));
        taxableNet += subtotal;

        return {
          productId: line.productId || null,
          productName: String(line.productName || 'Returned Product').trim(),
          sku: String(line.sku || 'NO-SKU').trim(),
          returnQty,
          unitCost,
          subtotal,
          rejectionReason: String(line.rejectionReason || 'DEFECTIVE / SPOILED').trim(),
        };
      });

      const roundedNet = Number(taxableNet.toFixed(2));
      const vatAmount = Number((roundedNet * VAT_RATE).toFixed(2));
      const debitValuation = Number((roundedNet + vatAmount).toFixed(2));

      const created = await db.transaction(async (tx) => {
        const retInsert = await tx.execute(sql`
          INSERT INTO supplier_returns (
            tenant_id, manifest_number, debit_note_no, supplier_id, supplier_name,
            supplier_kra_pin, grn_id, grn_number, status,
            taxable_net, vat_amount, debit_valuation, notes, created_by
          )
          VALUES (
            ${tenantId},
            ${manifestNumber},
            ${debitNoteNo ? String(debitNoteNo).trim() : null},
            ${supplier.id},
            ${supplier.name},
            ${supplier.kraPin || null},
            ${grnId || null},
            ${resolvedGrnNumber},
            'PENDING_DISPATCH',
            ${roundedNet},
            ${vatAmount},
            ${debitValuation},
            ${notes ? String(notes).trim() : null},
            ${createdBy}
          )
          RETURNING id, manifest_number AS "manifestNumber", status, debit_valuation::float AS "debitValuation"
        `);

        const retRow = rowsOf(retInsert)[0];

        for (const item of parsedItems) {
          await tx.execute(sql`
            INSERT INTO supplier_return_items (
              tenant_id, return_id, product_id, product_name, sku,
              return_qty, unit_cost, subtotal, rejection_reason
            )
            VALUES (
              ${tenantId}, ${retRow.id}, ${item.productId}, ${item.productName}, ${item.sku},
              ${item.returnQty}, ${item.unitCost}, ${item.subtotal}, ${item.rejectionReason}
            )
          `);
        }

        return retRow;
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[SUPPLIER RETURNS CREATE ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.message || 'Failed to raise return manifest',
      });
    }
  }

  // PATCH /api/v1/inventory/returns/:id/status
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const returnId = String(req.params.id);
      const { status, debitNoteNo } = req.body || {};

      const allowed = ['PENDING_DISPATCH', 'DISPATCHED', 'CREDITED'];
      if (!allowed.includes(String(status))) {
        return res.status(400).json({ success: false, message: 'Invalid return status.' });
      }

      const updRes = await db.execute(sql`
        UPDATE supplier_returns
        SET status = ${String(status)},
            debit_note_no = COALESCE(${debitNoteNo ? String(debitNoteNo).trim() : null}, debit_note_no),
            updated_at = NOW()
        WHERE id = ${returnId} AND tenant_id = ${tenantId}
        RETURNING id, manifest_number AS "manifestNumber", debit_note_no AS "debitNoteNo", status
      `);

      const updated = rowsOf(updRes)[0];
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Return manifest not found.' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[SUPPLIER RETURNS STATUS ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to update return manifest status',
      });
    }
  }
}