import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class TreasuryController {
  // GET /api/v1/finance/tender-settlement
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const result = await db.execute(sql`
        SELECT tp.id,
               tp.document_number AS "documentNumber",
               tp.flow_direction AS "flowDirection",
               tp.payment_method AS "paymentMethod",
               tp.clearing_channel AS "clearingChannel",
               COALESCE(NULLIF(TRIM(tp.transaction_ref), ''), 'NO-REF') AS "transactionRef",
               tp.supplier_id AS "supplierId",
               COALESCE(s.name, tp.counterparty_name, 'General Counterparty') AS "counterpartyName",
               COALESCE(tp.allocated_bill, 'General Settlement') AS "allocatedBill",
               tp.amount::float AS amount,
               tp.clearing_status AS "clearingStatus",
               tp.reversed_document_id AS "reversedDocumentId",
               tp.audit_notes AS "auditNotes",
               tp.processed_by AS "processedBy",
               tp.created_at AS "createdAt"
        FROM treasury_payments tp
        LEFT JOIN suppliers s
          ON s.id = tp.supplier_id
         AND s.tenant_id = tp.tenant_id
        WHERE tp.tenant_id = ${tenantId}
        ORDER BY tp.created_at DESC
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      console.error('[TREASURY GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load treasury payment documents',
      });
    }
  }

  // POST /api/v1/finance/tender-settlement
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const {
        flowDirection = 'OUTBOUND_AP',
        paymentMethod = 'M_PESA_B2B',
        clearingChannel = 'M-Pesa B2B Corporate Paybill',
        amount,
        transactionRef = '',
        supplierId = null,
        counterpartyName = '',
        allocatedBill = 'General Settlement',
        auditNotes = '',
      } = req.body || {};

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Enter a valid disbursement/receipt amount greater than 0.' });
      }

      const validFlow = flowDirection === 'INBOUND_AR' ? 'INBOUND_AR' : 'OUTBOUND_AP';
      let resolvedCounterparty = String(counterpartyName || '').trim();

      if (supplierId) {
        const supRes = await db.execute(sql`
          SELECT name FROM suppliers WHERE id = ${String(supplierId)} AND tenant_id = ${tenantId} LIMIT 1
        `);
        const sup = rowsOf(supRes)[0];
        if (sup?.name) resolvedCounterparty = sup.name;
      }

      if (!resolvedCounterparty) {
        resolvedCounterparty = validFlow === 'INBOUND_AR' ? 'Cash Collection' : 'Supplier Payout';
      }

      const docNum = `PMT-${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(10 + Math.random() * 89)}`;
      const processedBy = req.auth?.email || req.user?.email || 'Admin';

      const inserted = await db.execute(sql`
        INSERT INTO treasury_payments (
          tenant_id, document_number, flow_direction, payment_method, clearing_channel,
          transaction_ref, supplier_id, counterparty_name, allocated_bill,
          amount, clearing_status, audit_notes, processed_by
        )
        VALUES (
          ${tenantId},
          ${docNum},
          ${validFlow},
          ${String(paymentMethod)},
          ${String(clearingChannel)},
          ${transactionRef ? String(transactionRef).trim() : null},
          ${supplierId || null},
          ${resolvedCounterparty},
          ${String(allocatedBill || 'General Settlement').trim()},
          ${numericAmount.toFixed(2)},
          'POSTED_UNRECONCILED',
          ${auditNotes ? String(auditNotes).trim() : null},
          ${processedBy}
        )
        RETURNING id, document_number AS "documentNumber", amount::float AS amount, clearing_status AS "clearingStatus"
      `);

      return res.status(201).json({ success: true, data: rowsOf(inserted)[0] });
    } catch (error: any) {
      console.error('[TREASURY CREATE ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.message || 'Failed to commit treasury payment document',
      });
    }
  }

  // PATCH /api/v1/finance/tender-settlement/:id/reconcile
  static async reconcile(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const docId = String(req.params.id);

      const updRes = await db.execute(sql`
        UPDATE treasury_payments
        SET clearing_status = 'CLEARED',
            updated_at = NOW()
        WHERE id = ${docId}
          AND tenant_id = ${tenantId}
          AND clearing_status != 'REVERSED'
        RETURNING id, document_number AS "documentNumber", clearing_status AS "clearingStatus"
      `);

      const updated = rowsOf(updRes)[0];
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Payment document not found or already reversed.' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[TREASURY RECONCILE ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to reconcile payment document',
      });
    }
  }

  // POST /api/v1/finance/tender-settlement/:id/reverse
  static async stornoReverse(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const docId = String(req.params.id);
      const processedBy = req.auth?.email || req.user?.email || 'Admin';

      const result = await db.transaction(async (tx) => {
        const origRes = await tx.execute(sql`
          SELECT * FROM treasury_payments
          WHERE id = ${docId} AND tenant_id = ${tenantId}
          LIMIT 1
        `);
        const orig = rowsOf(origRes)[0];
        if (!orig) {
          throw new Error('Payment document not found.');
        }
        if (orig.clearing_status === 'REVERSED') {
          throw new Error('This payment document has already been reversed.');
        }

        await tx.execute(sql`
          UPDATE treasury_payments
          SET clearing_status = 'REVERSED',
              updated_at = NOW()
          WHERE id = ${docId} AND tenant_id = ${tenantId}
        `);

        const oppositeFlow = orig.flow_direction === 'INBOUND_AR' ? 'OUTBOUND_AP' : 'INBOUND_AR';
        const stornoNum = `REV-${Math.floor(100000 + Math.random() * 900000)}`;

        const revInsert = await tx.execute(sql`
          INSERT INTO treasury_payments (
            tenant_id, document_number, flow_direction, payment_method, clearing_channel,
            transaction_ref, supplier_id, counterparty_name, allocated_bill,
            amount, clearing_status, reversed_document_id, audit_notes, processed_by
          )
          VALUES (
            ${tenantId},
            ${stornoNum},
            ${oppositeFlow},
            ${orig.payment_method},
            ${orig.clearing_channel},
            ${orig.transaction_ref ? `STN-${orig.transaction_ref}` : `STN-${orig.document_number}`},
            ${orig.supplier_id || null},
            ${orig.counterparty_name},
            ${`Storno Reversal of ${orig.document_number}`},
            ${orig.amount},
            'CLEARED',
            ${orig.id},
            ${`Compensating Storno Reversal for ${orig.document_number}`},
            ${processedBy}
          )
          RETURNING id, document_number AS "documentNumber", clearing_status AS "clearingStatus"
        `);

        return rowsOf(revInsert)[0];
      });

      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TREASURY REVERSE ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.message || 'Failed to post compensating storno reversal',
      });
    }
  }
}