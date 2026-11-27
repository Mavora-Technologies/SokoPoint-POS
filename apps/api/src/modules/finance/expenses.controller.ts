import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string; branchId?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string; branchId?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export const ExpensesController = {
  // GET /api/v1/expenses
  getExpenses: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const result = await db.execute(sql`
        SELECT e.id,
               e.voucher_number AS "voucherNumber",
               e.expense_date AS "expenseDate",
               e.category_name AS "categoryName",
               e.gl_account_code AS "glAccountCode",
               e.subtotal::float AS subtotal,
               e.vat_amount::float AS "vatAmount",
               e.total_payable::float AS "totalPayable",
               e.settlement_tender AS "settlementTender",
               e.payee_name AS "payeeName",
               e.etr_receipt_no AS "etrReceiptNo",
               e.merchant_kra_pin AS "merchantKraPin",
               e.business_purpose AS "businessPurpose",
               e.status,
               e.claimant_name AS "claimantName",
               COALESCE(b.name, 'Main Branch') AS "branchName",
               e.reviewed_by AS "reviewedBy",
               e.disbursed_by AS "disbursedBy",
               e.created_at AS "createdAt"
        FROM corporate_expense_vouchers e
        LEFT JOIN branches b
          ON b.id = e.branch_id
         AND b.tenant_id = e.tenant_id
        WHERE e.tenant_id = ${tenantId}
        ORDER BY e.created_at DESC
        LIMIT 100
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      console.error('[EXPENSES GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to fetch expense vouchers',
      });
    }
  },

  // POST /api/v1/expenses
  create: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const userId = req.auth?.userId || req.user?.userId || null;
      const branchId = req.auth?.branchId || req.user?.branchId || null;
      const email = req.auth?.email || req.user?.email || 'Admin';

      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const {
        categoryName = 'Store Electricity, Water & Internet',
        glAccountCode = '6210',
        expenseDate = new Date().toISOString().slice(0, 10),
        subtotal,
        amount,
        vatAmount = 0,
        settlementTender = 'Cash Drawer / Safe Drop',
        payeeName = 'Store Vendor',
        etrReceiptNo = '',
        merchantKraPin = '',
        businessPurpose = '',
        notes = '',
        title = '',
      } = req.body || {};

      const baseVal = Number(subtotal ?? amount);
      const vatVal = Math.max(0, Number(vatAmount) || 0);
      if (!Number.isFinite(baseVal) || baseVal <= 0) {
        return res.status(400).json({ success: false, message: 'Base amount must be greater than 0.' });
      }

      const purposeText = String(businessPurpose || notes || title || '').trim();
      if (!purposeText) {
        return res.status(400).json({ success: false, message: 'Detailed business purpose is required.' });
      }

      // Resolve claimant display name from tenant users
      let claimantName = email;
      if (userId) {
        const uRes = await db.execute(sql`
          SELECT first_name AS "firstName", last_name AS "lastName"
          FROM users
          WHERE id = ${userId} AND tenant_id = ${tenantId}
          LIMIT 1
        `);
        const u = rowsOf(uRes)[0];
        if (u) {
          const full = `${u.firstName || ''} ${u.lastName || ''}`.trim();
          if (full) claimantName = full;
        }
      }

      const totalPayable = Number((baseVal + vatVal).toFixed(2));
      const voucherNumber = `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const safeDate = String(expenseDate);
      const safeCategory = String(categoryName).trim();
      const safeGl = String(glAccountCode).trim();
      const safeTender = String(settlementTender).trim();
      const safePayee = String(payeeName || 'Store Vendor').trim();
      const safeEtr = etrReceiptNo ? String(etrReceiptNo).trim() : null;
      const safePin = merchantKraPin ? String(merchantKraPin).trim().toUpperCase() : null;

      const inserted = await db.execute(sql`
        INSERT INTO corporate_expense_vouchers (
          tenant_id, branch_id, voucher_number, expense_date, category_name, gl_account_code,
          subtotal, vat_amount, total_payable, settlement_tender, payee_name,
          etr_receipt_no, merchant_kra_pin, business_purpose, status,
          claimant_user_id, claimant_name
        )
        VALUES (
          ${tenantId}, ${branchId}, ${voucherNumber}, ${safeDate}::date, ${safeCategory}, ${safeGl},
          ${baseVal.toFixed(2)}, ${vatVal.toFixed(2)}, ${totalPayable.toFixed(2)}, ${safeTender}, ${safePayee},
          ${safeEtr}, ${safePin}, ${purposeText}, 'PENDING_REVIEW',
          ${userId}, ${claimantName}
        )
        RETURNING id, voucher_number AS "voucherNumber", status, total_payable::float AS "totalPayable"
      `);

      return res.status(201).json({ success: true, data: rowsOf(inserted)[0] });
    } catch (error: any) {
      console.error('[EXPENSES CREATE ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to submit expense voucher',
      });
    }
  },

  // PATCH /api/v1/expenses/:id/action  { action: 'APPROVE' | 'DISBURSE' | 'DECLINE' }
  transitionStatus: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const actor = req.auth?.email || req.user?.email || 'Admin';
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const voucherId = String(req.params.id);
      const action = String(req.body?.action || '').toUpperCase();
      if (!['APPROVE', 'DISBURSE', 'DECLINE'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Action must be APPROVE, DISBURSE, or DECLINE.' });
      }

      const updated = await db.transaction(async (tx) => {
        const existingRes = await tx.execute(sql`
          SELECT * FROM corporate_expense_vouchers
          WHERE id = ${voucherId} AND tenant_id = ${tenantId}
          LIMIT 1
        `);
        const v = rowsOf(existingRes)[0];
        if (!v) throw new Error('Expense voucher not found.');

        if (action === 'APPROVE') {
          const r = await tx.execute(sql`
            UPDATE corporate_expense_vouchers
            SET status = 'APPROVED', reviewed_by = ${actor}, reviewed_at = NOW()
            WHERE id = ${voucherId} AND tenant_id = ${tenantId}
            RETURNING id, voucher_number AS "voucherNumber", status
          `);
          return rowsOf(r)[0];
        }

        if (action === 'DECLINE') {
          const r = await tx.execute(sql`
            UPDATE corporate_expense_vouchers
            SET status = 'DECLINED', reviewed_by = ${actor}, reviewed_at = NOW()
            WHERE id = ${voucherId} AND tenant_id = ${tenantId}
            RETURNING id, voucher_number AS "voucherNumber", status
          `);
          return rowsOf(r)[0];
        }

        // DISBURSE: Sync bidirectionally to treasury_payments + general_journal_entries
        if (v.status === 'DISBURSED') throw new Error('Expense voucher is already disbursed.');

        const totalStr = Number(v.total_payable).toFixed(2);
        const tpDoc = `PMT-${v.voucher_number}`;
        const txRef = v.etr_receipt_no || v.voucher_number;

        const tpRes = await tx.execute(sql`
          INSERT INTO treasury_payments (
            tenant_id, document_number, flow_direction, payment_method, clearing_channel,
            transaction_ref, counterparty_name, allocated_bill,
            amount, clearing_status, audit_notes, processed_by
          )
          VALUES (
            ${tenantId}, ${tpDoc}, 'OUTBOUND_AP', ${v.settlement_tender}, ${v.settlement_tender},
            ${txRef}, ${v.payee_name}, ${`${v.voucher_number} (${v.category_name})`},
            ${totalStr}, 'POSTED_UNRECONCILED', ${v.business_purpose}, ${actor}
          )
          RETURNING id
        `);
        const treasuryPaymentId = rowsOf(tpRes)[0]?.id || null;

        const jrnNum = `JRN-${v.voucher_number}`;
        const jRes = await tx.execute(sql`
          INSERT INTO general_journal_entries (
            tenant_id, entry_number, entry_date, reference_no, description,
            source_module, total_debit, total_credit, posted_by
          )
          VALUES (
            ${tenantId}, ${jrnNum}, CURRENT_DATE, ${v.voucher_number},
            ${`Expense Disbursement: ${v.category_name} — ${v.payee_name}`},
            'EXPENSES', ${totalStr}, ${totalStr}, ${actor}
          )
          RETURNING id
        `);
        const journalEntryId = rowsOf(jRes)[0]?.id || null;

        if (journalEntryId) {
          await tx.execute(sql`
            INSERT INTO general_journal_lines (tenant_id, entry_id, account_code, account_name, debit, credit)
            VALUES
              (${tenantId}, ${journalEntryId}, ${v.gl_account_code}, ${v.category_name}, ${totalStr}, 0),
              (${tenantId}, ${journalEntryId}, '1010', ${v.settlement_tender}, 0, ${totalStr})
          `);
        }

        const finRes = await tx.execute(sql`
          UPDATE corporate_expense_vouchers
          SET status = 'DISBURSED',
              disbursed_by = ${actor},
              disbursed_at = NOW(),
              treasury_payment_id = ${treasuryPaymentId},
              journal_entry_id = ${journalEntryId}
          WHERE id = ${voucherId} AND tenant_id = ${tenantId}
          RETURNING id, voucher_number AS "voucherNumber", status
        `);

        return rowsOf(finRes)[0];
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[EXPENSES ACTION ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to update expense voucher',
      });
    }
  },
};