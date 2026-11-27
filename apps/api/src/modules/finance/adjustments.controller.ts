import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

const parseGlAccount = (raw: string): { code: string; name: string } => {
  const parts = String(raw || '').split('-');
  if (parts.length >= 2) {
    return {
      code: parts[0].trim(),
      name: parts.slice(1).join('-').trim(),
    };
  }
  return { code: '9999', name: String(raw || 'General Ledger').trim() };
};

export class FinanceAdjustmentsController {
  // GET /api/v1/finance/adjustments
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const result = await db.execute(sql`
        SELECT id,
               voucher_number AS "voucherNumber",
               adjustment_type AS "adjustmentType",
               reason_code AS "reasonCode",
               amount::float AS amount,
               linked_shift_seq AS "linkedShiftSeq",
               debit_gl_account AS "debitGlAccount",
               credit_gl_account AS "creditGlAccount",
               audit_remarks AS "auditRemarks",
               status,
               maker_name AS "makerName",
               checker_name AS "checkerName",
               journal_entry_id AS "journalEntryId",
               created_at AS "createdAt",
               checked_at AS "checkedAt"
        FROM finance_adjustment_vouchers
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT 100
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      console.error('[ADJUSTMENTS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to load adjustment vouchers',
      });
    }
  }

  // POST /api/v1/finance/adjustments
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const makerUserId = req.auth?.userId || req.user?.userId || null;
      const makerName = req.auth?.email || req.user?.email || 'Admin';
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const {
        adjustmentType = 'Till Variance Write-Off',
        reasonCode = 'Drawer Cash Discrepancy',
        amount,
        linkedShiftSeq = '',
        debitGlAccount = '5210 - Cash Over/Short Expense',
        creditGlAccount = '1010 - Main Till Cash',
        auditRemarks = '',
      } = req.body || {};

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Enter a valid adjustment amount greater than 0.' });
      }
      if (!auditRemarks || !String(auditRemarks).trim()) {
        return res.status(400).json({ success: false, message: 'Audit justification & remarks are required.' });
      }

      const voucherNumber = `ADJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const safeType = String(adjustmentType).trim();
      const safeReason = String(reasonCode).trim();
      const safeShift = linkedShiftSeq ? String(linkedShiftSeq).trim() : null;
      const safeDebit = String(debitGlAccount).trim();
      const safeCredit = String(creditGlAccount).trim();
      const safeRemarks = String(auditRemarks).trim();
      const amountStr = numericAmount.toFixed(2);

      const inserted = await db.execute(sql`
        INSERT INTO finance_adjustment_vouchers (
          tenant_id, voucher_number, adjustment_type, reason_code, amount,
          linked_shift_seq, debit_gl_account, credit_gl_account, audit_remarks,
          status, maker_user_id, maker_name
        )
        VALUES (
          ${tenantId}, ${voucherNumber}, ${safeType}, ${safeReason}, ${amountStr},
          ${safeShift}, ${safeDebit}, ${safeCredit}, ${safeRemarks},
          'AWAITING_SIGN_OFF', ${makerUserId}, ${makerName}
        )
        RETURNING id, voucher_number AS "voucherNumber", status
      `);

      return res.status(201).json({ success: true, data: rowsOf(inserted)[0] });
    } catch (error: any) {
      console.error('[ADJUSTMENTS CREATE ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to submit adjustment voucher',
      });
    }
  }

  // PATCH /api/v1/finance/adjustments/:id/review  { action: 'POST' | 'DECLINE' }
  static async review(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const checkerUserId = req.auth?.userId || req.user?.userId || null;
      const checkerName = req.auth?.email || req.user?.email || 'Admin';
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const voucherId = String(req.params.id);
      const action = String(req.body?.action || '').toUpperCase();
      if (!['POST', 'DECLINE'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Action must be POST or DECLINE.' });
      }

      const result = await db.transaction(async (tx) => {
        const existingRes = await tx.execute(sql`
          SELECT * FROM finance_adjustment_vouchers
          WHERE id = ${voucherId} AND tenant_id = ${tenantId}
          LIMIT 1
        `);
        const v = rowsOf(existingRes)[0];
        if (!v) throw new Error('Adjustment voucher not found.');
        if (v.status !== 'AWAITING_SIGN_OFF') {
          throw new Error(`Voucher is already ${v.status}.`);
        }

        if (action === 'DECLINE') {
          const decRes = await tx.execute(sql`
            UPDATE finance_adjustment_vouchers
            SET status = 'DECLINED',
                checker_user_id = ${checkerUserId},
                checker_name = ${checkerName},
                checked_at = NOW()
            WHERE id = ${voucherId} AND tenant_id = ${tenantId}
            RETURNING id, voucher_number AS "voucherNumber", status
          `);
          return rowsOf(decRes)[0];
        }

        // Approve & Post to General Journal (Bidirectional GL Sync)
        const debitGl = parseGlAccount(v.debit_gl_account);
        const creditGl = parseGlAccount(v.credit_gl_account);
        const entryNumber = `JRN-${v.voucher_number}`;
        const narration = `${v.adjustment_type} (${v.reason_code}): ${v.audit_remarks}`;
        const amtStr = Number(v.amount).toFixed(2);

        const jRes = await tx.execute(sql`
          INSERT INTO general_journal_entries (
            tenant_id, entry_number, entry_date, reference_no, description,
            source_module, total_debit, total_credit, posted_by
          )
          VALUES (
            ${tenantId}, ${entryNumber}, CURRENT_DATE, ${v.voucher_number}, ${narration},
            'ADJUSTMENT', ${amtStr}, ${amtStr}, ${checkerName}
          )
          RETURNING id
        `);
        const journalEntryId = rowsOf(jRes)[0]?.id || null;

        if (journalEntryId) {
          await tx.execute(sql`
            INSERT INTO general_journal_lines (tenant_id, entry_id, account_code, account_name, debit, credit)
            VALUES
              (${tenantId}, ${journalEntryId}, ${debitGl.code}, ${debitGl.name}, ${amtStr}, 0),
              (${tenantId}, ${journalEntryId}, ${creditGl.code}, ${creditGl.name}, 0, ${amtStr})
          `);
        }

        const postRes = await tx.execute(sql`
          UPDATE finance_adjustment_vouchers
          SET status = 'POSTED',
              checker_user_id = ${checkerUserId},
              checker_name = ${checkerName},
              journal_entry_id = ${journalEntryId},
              checked_at = NOW()
          WHERE id = ${voucherId} AND tenant_id = ${tenantId}
          RETURNING id, voucher_number AS "voucherNumber", status, journal_entry_id AS "journalEntryId"
        `);

        return rowsOf(postRes)[0];
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      console.error('[ADJUSTMENTS REVIEW ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to review adjustment voucher',
      });
    }
  }
}