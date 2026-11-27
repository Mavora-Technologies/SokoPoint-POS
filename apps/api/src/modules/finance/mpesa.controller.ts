import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

const isDarajaConfigured = (): boolean =>
  Boolean(
    process.env.DARAJA_CONSUMER_KEY &&
      process.env.DARAJA_CONSUMER_SECRET &&
      process.env.DARAJA_SHORTCODE &&
      process.env.DARAJA_PASSKEY
  );

const normalizeKenyanPhone = (raw: string): string => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) return `254${digits}`;
  return digits;
};

export class MpesaGatewayController {
  // GET /api/v1/finance/mpesa
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const result = await db.execute(sql`
        SELECT m.id,
               COALESCE(NULLIF(TRIM(m.mpesa_receipt_no), ''), 'PENDING-CALLBACK') AS "mpesaReceiptNo",
               m.direction,
               m.channel_type AS "channelType",
               m.phone_or_shortcode AS "phoneOrShortcode",
               m.account_reference AS "accountReference",
               m.supplier_id AS "supplierId",
               m.supplier_invoice_id AS "supplierInvoiceId",
               COALESCE(s.name, m.beneficiary_or_order, 'Direct Counter Checkout') AS "beneficiaryOrOrder",
               m.amount::float AS amount,
               m.gateway_status AS "gatewayStatus",
               m.remarks,
               m.initiated_by AS "initiatedBy",
               m.created_at AS "createdAt"
        FROM mpesa_transactions m
        LEFT JOIN suppliers s
          ON s.id = m.supplier_id
         AND s.tenant_id = m.tenant_id
        WHERE m.tenant_id = ${tenantId}
        ORDER BY m.created_at DESC
      `);

      return res.status(200).json({
        success: true,
        darajaConfigured: isDarajaConfigured(),
        data: rowsOf(result),
      });
    } catch (error: any) {
      console.error('[MPESA GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load M-Pesa gateway transactions',
      });
    }
  }

  // POST /api/v1/finance/mpesa/stk-push
  static async requestStkPush(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const {
        phoneNumber,
        amount,
        accountReference,
        beneficiaryOrOrder = 'Direct Counter Checkout',
        remarks = '',
      } = req.body || {};

      const normalizedPhone = normalizeKenyanPhone(phoneNumber);
      if (!normalizedPhone || normalizedPhone.length < 12) {
        return res.status(400).json({
          success: false,
          message: 'Enter a valid Kenyan mobile number (e.g. 0712345678 or 254712345678).',
        });
      }

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Enter a valid amount greater than 0.' });
      }

      const ref = String(accountReference || `SKP-${Math.floor(100000 + Math.random() * 900000)}`).trim();
      const initiatedBy = req.auth?.email || req.user?.email || 'Admin';

      const inserted = await db.execute(sql`
        INSERT INTO mpesa_transactions (
          tenant_id, mpesa_receipt_no, direction, channel_type, phone_or_shortcode,
          account_reference, beneficiary_or_order, amount, gateway_status, remarks, initiated_by
        )
        VALUES (
          ${tenantId}, NULL, 'C2B_INBOUND', 'STK_PUSH', ${normalizedPhone},
          ${ref}, ${String(beneficiaryOrOrder).trim()}, ${numericAmount.toFixed(2)},
          'AWAITING_PIN', ${remarks ? String(remarks).trim() : null}, ${initiatedBy}
        )
        RETURNING id, account_reference AS "accountReference", gateway_status AS "gatewayStatus"
      `);

      return res.status(201).json({ success: true, data: rowsOf(inserted)[0] });
    } catch (error: any) {
      console.error('[MPESA STK PUSH ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to dispatch STK Push' });
    }
  }

  // POST /api/v1/finance/mpesa/b2b-payout
  static async authorizeB2bPayout(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const {
        receiverType = 'PAYBILL_B2B',
        shortcode,
        amount,
        accountReference,
        supplierId = null,
        supplierInvoiceId = null,
        remarks = '',
      } = req.body || {};

      if (!shortcode || !String(shortcode).trim()) {
        return res.status(400).json({ success: false, message: 'Paybill or Till Number is required.' });
      }
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Enter a valid disbursement amount.' });
      }
      if (!accountReference || !String(accountReference).trim()) {
        return res.status(400).json({ success: false, message: 'Account Reference / Acc No is required.' });
      }

      let supplierName = 'Supplier Paybill Payout';
      if (supplierId) {
        const supRes = await db.execute(sql`
          SELECT name FROM suppliers WHERE id = ${String(supplierId)} AND tenant_id = ${tenantId} LIMIT 1
        `);
        if (rowsOf(supRes)[0]?.name) supplierName = rowsOf(supRes)[0].name;
      }

      const initiatedBy = req.auth?.email || req.user?.email || 'Admin';
      const receiptCode = `B2B${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const docNum = `PMT-B2B-${Math.floor(100000 + Math.random() * 900000)}`;

      const created = await db.transaction(async (tx) => {
        // 1. Post outbound payout to treasury_payments
        const tpRes = await tx.execute(sql`
          INSERT INTO treasury_payments (
            tenant_id, document_number, flow_direction, payment_method, clearing_channel,
            transaction_ref, supplier_id, counterparty_name, allocated_bill,
            amount, clearing_status, audit_notes, processed_by
          )
          VALUES (
            ${tenantId}, ${docNum}, 'OUTBOUND_AP', 'M_PESA_B2B',
            ${receiverType === 'TILL_B2B' ? `M-Pesa Buy Goods Till (${shortcode})` : `M-Pesa Business Paybill (${shortcode})`},
            ${receiptCode}, ${supplierId || null}, ${supplierName}, ${String(accountReference).trim()},
            ${numericAmount.toFixed(2)}, 'POSTED_UNRECONCILED',
            ${remarks ? String(remarks).trim() : `M-Pesa B2B payout to ${supplierName}`}, ${initiatedBy}
          )
          RETURNING id
        `);
        const treasuryId = rowsOf(tpRes)[0]?.id || null;

        // 2. If linked to an open Supplier Invoice, credit amount_paid & balance_due
        if (supplierInvoiceId) {
          const invRes = await tx.execute(sql`
            SELECT id, invoice_total::float AS "invoiceTotal", amount_paid::float AS "amountPaid"
            FROM supplier_invoices
            WHERE id = ${String(supplierInvoiceId)} AND tenant_id = ${tenantId}
            LIMIT 1
          `);
          const inv = rowsOf(invRes)[0];
          if (inv) {
            const nextPaid = Math.min(inv.invoiceTotal, Number((inv.amountPaid + numericAmount).toFixed(2)));
            const nextBal = Math.max(0, Number((inv.invoiceTotal - nextPaid).toFixed(2)));
            const nextStatus = nextBal <= 0 ? 'PAID' : 'PARTIAL';
            await tx.execute(sql`
              UPDATE supplier_invoices
              SET amount_paid = ${nextPaid}, balance_due = ${nextBal}, status = ${nextStatus}, updated_at = NOW()
              WHERE id = ${inv.id} AND tenant_id = ${tenantId}
            `);
          }
        }

        // 3. Record M-Pesa B2B transaction
        const mpRes = await tx.execute(sql`
          INSERT INTO mpesa_transactions (
            tenant_id, mpesa_receipt_no, direction, channel_type, phone_or_shortcode,
            account_reference, supplier_id, supplier_invoice_id, beneficiary_or_order, amount,
            gateway_status, remarks, treasury_payment_id, initiated_by
          )
          VALUES (
            ${tenantId}, ${receiptCode}, 'B2B_OUTBOUND',
            ${receiverType === 'TILL_B2B' ? 'TILL_B2B' : 'PAYBILL_B2B'},
            ${String(shortcode).trim()}, ${String(accountReference).trim()},
            ${supplierId || null}, ${supplierInvoiceId || null}, ${supplierName},
            ${numericAmount.toFixed(2)}, 'COMPLETED',
            ${remarks ? String(remarks).trim() : null}, ${treasuryId}, ${initiatedBy}
          )
          RETURNING id, mpesa_receipt_no AS "mpesaReceiptNo", gateway_status AS "gatewayStatus"
        `);

        return rowsOf(mpRes)[0];
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[MPESA B2B ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to authorize B2B payout' });
    }
  }

  // PATCH /api/v1/finance/mpesa/:id/status
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const txId = String(req.params.id);
      const { gatewayStatus, mpesaReceiptNo } = req.body || {};
      if (!['COMPLETED', 'FAILED'].includes(String(gatewayStatus))) {
        return res.status(400).json({ success: false, message: 'Status must be COMPLETED or FAILED.' });
      }

      const processedBy = req.auth?.email || req.user?.email || 'Admin';

      const updated = await db.transaction(async (tx) => {
        const existingRes = await tx.execute(sql`
          SELECT * FROM mpesa_transactions WHERE id = ${txId} AND tenant_id = ${tenantId} LIMIT 1
        `);
        const existing = rowsOf(existingRes)[0];
        if (!existing) throw new Error('M-Pesa transaction not found.');

        let treasuryId = existing.treasury_payment_id;
        const finalReceipt =
          mpesaReceiptNo && String(mpesaReceiptNo).trim()
            ? String(mpesaReceiptNo).trim().toUpperCase()
            : existing.mpesa_receipt_no || `SKP${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        if (gatewayStatus === 'COMPLETED' && existing.direction === 'C2B_INBOUND' && !treasuryId) {
          const docNum = `PMT-MP-${Math.floor(100000 + Math.random() * 900000)}`;
          const tpRes = await tx.execute(sql`
            INSERT INTO treasury_payments (
              tenant_id, document_number, flow_direction, payment_method, clearing_channel,
              transaction_ref, counterparty_name, allocated_bill,
              amount, clearing_status, audit_notes, processed_by
            )
            VALUES (
              ${tenantId}, ${docNum}, 'INBOUND_AR', 'M_PESA_B2B', 'M-Pesa Express Till Clearing',
              ${finalReceipt}, ${existing.beneficiary_or_order || 'Retail POS Collection'},
              ${existing.account_reference}, ${existing.amount}, 'POSTED_UNRECONCILED',
              ${`M-Pesa STK Push confirmed for ${existing.phone_or_shortcode}`}, ${processedBy}
            )
            RETURNING id
          `);
          treasuryId = rowsOf(tpRes)[0]?.id || null;
        }

        const updRes = await tx.execute(sql`
          UPDATE mpesa_transactions
          SET gateway_status = ${String(gatewayStatus)},
              mpesa_receipt_no = ${gatewayStatus === 'COMPLETED' ? finalReceipt : existing.mpesa_receipt_no},
              treasury_payment_id = ${treasuryId},
              updated_at = NOW()
          WHERE id = ${txId} AND tenant_id = ${tenantId}
          RETURNING id, mpesa_receipt_no AS "mpesaReceiptNo", gateway_status AS "gatewayStatus"
        `);

        return rowsOf(updRes)[0];
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[MPESA STATUS ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to update status' });
    }
  }
}