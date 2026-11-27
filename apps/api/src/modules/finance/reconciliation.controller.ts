import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class ReconciliationController {
  // GET /api/v1/finance/reconciliation
  static async getWorkbench(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [bookRes, bankRes, historyRes] = await Promise.all([
        db.execute(sql`
          SELECT id,
                 document_number AS "documentNumber",
                 flow_direction AS "flowDirection",
                 payment_method AS "paymentMethod",
                 clearing_channel AS "clearingChannel",
                 COALESCE(NULLIF(TRIM(transaction_ref), ''), 'NO-REF') AS "transactionRef",
                 counterparty_name AS "counterpartyName",
                 allocated_bill AS "allocatedBill",
                 amount::float AS amount,
                 created_at AS "createdAt"
          FROM treasury_payments
          WHERE tenant_id = ${tenantId}
            AND clearing_status = 'POSTED_UNRECONCILED'
          ORDER BY created_at DESC
        `),
        db.execute(sql`
          SELECT id,
                 statement_id AS "statementId",
                 clearing_channel AS "clearingChannel",
                 tx_date AS "txDate",
                 reference_no AS "referenceNo",
                 COALESCE(description, '') AS description,
                 amount::float AS amount,
                 status
          FROM bank_statement_lines
          WHERE tenant_id = ${tenantId}
            AND status = 'UNMATCHED'
          ORDER BY tx_date DESC, created_at DESC
        `),
        db.execute(sql`
          SELECT bsl.id,
                 bsl.tx_date AS "txDate",
                 bsl.reference_no AS "referenceNo",
                 bsl.description,
                 bsl.amount::float AS amount,
                 bsl.clearing_channel AS "clearingChannel",
                 bsl.matched_at AS "matchedAt",
                 tp.document_number AS "documentNumber",
                 tp.counterparty_name AS "counterpartyName"
          FROM bank_statement_lines bsl
          LEFT JOIN treasury_payments tp
            ON tp.id = bsl.matched_payment_id
           AND tp.tenant_id = bsl.tenant_id
          WHERE bsl.tenant_id = ${tenantId}
            AND bsl.status = 'MATCHED'
          ORDER BY bsl.matched_at DESC
          LIMIT 50
        `),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          bookPayments: rowsOf(bookRes),
          bankLines: rowsOf(bankRes),
          clearedHistory: rowsOf(historyRes),
        },
      });
    } catch (error: any) {
      console.error('[RECONCILIATION GET ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load workbench' });
    }
  }

  // POST /api/v1/finance/reconciliation/import
  static async importStatement(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const {
        clearingChannel = 'POS Cash Drawer Register',
        statementRef = `BST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        openingBalance = 0,
        closingBalance = 0,
        statementDate = new Date().toISOString().slice(0, 10),
        lines = [],
      } = req.body || {};

      if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ success: false, message: 'Add or parse at least one statement line.' });
      }

      const uploadedBy = req.auth?.email || req.user?.email || 'Admin';

      const created = await db.transaction(async (tx) => {
        const stmtRes = await tx.execute(sql`
          INSERT INTO bank_statements (
            tenant_id, statement_ref, clearing_channel, opening_balance, closing_balance, statement_date, uploaded_by
          )
          VALUES (
            ${tenantId}, ${String(statementRef).trim()}, ${String(clearingChannel).trim()},
            ${Number(openingBalance) || 0}, ${Number(closingBalance) || 0}, ${String(statementDate)}, ${uploadedBy}
          )
          RETURNING id, statement_ref AS "statementRef"
        `);
        const stmt = rowsOf(stmtRes)[0];

        let insertedCount = 0;
        for (const l of lines) {
          const amt = Number(l.amount);
          if (!Number.isFinite(amt) || amt === 0) continue;
          await tx.execute(sql`
            INSERT INTO bank_statement_lines (
              tenant_id, statement_id, clearing_channel, tx_date, reference_no, description, amount, status
            )
            VALUES (
              ${tenantId}, ${stmt.id}, ${String(clearingChannel).trim()},
              ${l.txDate ? String(l.txDate) : String(statementDate)},
              ${String(l.referenceNo || 'NO-REF').trim()},
              ${String(l.description || 'Bank Statement Entry').trim()},
              ${amt.toFixed(2)}, 'UNMATCHED'
            )
          `);
          insertedCount += 1;
        }

        return { ...stmt, insertedCount };
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[RECONCILIATION IMPORT ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to import statement feed' });
    }
  }

  // POST /api/v1/finance/reconciliation/match
  static async confirmMatch(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { paymentId, bankLineId } = req.body || {};
      if (!paymentId || !bankLineId) {
        return res.status(400).json({ success: false, message: 'Select one book payment and one bank line to match.' });
      }

      await db.transaction(async (tx) => {
        await tx.execute(sql`
          UPDATE treasury_payments
          SET clearing_status = 'CLEARED', updated_at = NOW()
          WHERE id = ${String(paymentId)} AND tenant_id = ${tenantId}
        `);
        await tx.execute(sql`
          UPDATE bank_statement_lines
          SET status = 'MATCHED', matched_payment_id = ${String(paymentId)}, matched_at = NOW()
          WHERE id = ${String(bankLineId)} AND tenant_id = ${tenantId}
        `);
      });

      return res.status(200).json({ success: true, message: 'Matched and cleared successfully.' });
    } catch (error: any) {
      console.error('[RECONCILIATION MATCH ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to confirm match' });
    }
  }

  // POST /api/v1/finance/reconciliation/auto-match
  static async autoMatch(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const matchedCount = await db.transaction(async (tx) => {
        const bookRes = await tx.execute(sql`
          SELECT id, flow_direction AS "flowDirection", transaction_ref AS "transactionRef", amount::float AS amount
          FROM treasury_payments
          WHERE tenant_id = ${tenantId} AND clearing_status = 'POSTED_UNRECONCILED'
        `);
        const bankRes = await tx.execute(sql`
          SELECT id, reference_no AS "referenceNo", amount::float AS amount
          FROM bank_statement_lines
          WHERE tenant_id = ${tenantId} AND status = 'UNMATCHED'
        `);

        const books = rowsOf(bookRes);
        const banks = rowsOf(bankRes);
        const usedBookIds = new Set<string>();
        let pairs = 0;

        for (const bl of banks) {
          const signedAmt = Number(bl.amount);
          const match = books.find((b) => {
            if (usedBookIds.has(b.id)) return false;
            const bookSigned = b.flowDirection === 'OUTBOUND_AP' ? -Math.abs(b.amount) : Math.abs(b.amount);
            const amtMatch = Math.abs(bookSigned - signedAmt) < 0.01;
            const refMatch =
              bl.referenceNo &&
              b.transactionRef &&
              bl.referenceNo.toLowerCase() === b.transactionRef.toLowerCase();
            return refMatch || amtMatch;
          });

          if (match) {
            usedBookIds.add(match.id);
            await tx.execute(sql`
              UPDATE treasury_payments SET clearing_status = 'CLEARED', updated_at = NOW()
              WHERE id = ${match.id} AND tenant_id = ${tenantId}
            `);
            await tx.execute(sql`
              UPDATE bank_statement_lines
              SET status = 'MATCHED', matched_payment_id = ${match.id}, matched_at = NOW()
              WHERE id = ${bl.id} AND tenant_id = ${tenantId}
            `);
            pairs += 1;
          }
        }
        return pairs;
      });

      return res.status(200).json({ success: true, data: { matchedCount } });
    } catch (error: any) {
      console.error('[RECONCILIATION AUTO-MATCH ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Auto-match failed' });
    }
  }
}