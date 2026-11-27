import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string; branchId?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string; branchId?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class FinanceOperationsController {
  // =========================================================================
  // 1. REFUNDS & CREDIT MEMOS
  // =========================================================================
  static async getRefunds(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [refundsRes, colRes] = await Promise.all([
        db.execute(sql`
          SELECT id,
                 document_number AS "documentNumber",
                 flow_direction AS "flowDirection",
                 method,
                 reason_code AS "reasonCode",
                 clearing_channel AS "clearingChannel",
                 original_ref AS "originalRef",
                 counterparty_name AS "counterpartyName",
                 amount::float AS amount,
                 audit_notes AS "auditNotes",
                 processed_by AS "processedBy",
                 created_at AS "createdAt"
          FROM finance_refunds
          WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `),
        db.execute(sql`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'orders' AND column_name IN ('total_amount', 'total', 'grand_total', 'amount')
          LIMIT 1
        `),
      ]);

      // Fetch recent tenant POS sales for mandatory audit trace dropdown
      let refundableSales: any[] = [];
      const amtCol = rowsOf(colRes)[0]?.column_name;
      if (amtCol) {
        const salesRes = await db.execute(sql`
          SELECT id,
                 COALESCE(${sql.raw(amtCol)}, 0)::float AS amount,
                 created_at AS "createdAt"
          FROM orders
          WHERE tenant_id = ${tenantId}
            AND COALESCE(${sql.raw(amtCol)}, 0) > 0
          ORDER BY created_at DESC
          LIMIT 30
        `);
        refundableSales = rowsOf(salesRes).map((s: any, idx: number) => ({
          id: s.id,
          ref: `SKP-SALE-${String(s.id).slice(0, 6).toUpperCase()}`,
          label: `SKP-SALE-${String(s.id).slice(0, 6).toUpperCase()} — Refundable: KES ${Number(s.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
          amount: Number(s.amount),
          createdAt: s.createdAt,
          seq: idx + 1,
        }));
      }

      return res.status(200).json({
        success: true,
        data: {
          refunds: rowsOf(refundsRes),
          refundableSales,
        },
      });
    } catch (error: any) {
      console.error('[FINANCE REFUNDS GET ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load refunds' });
    }
  }

  static async createRefund(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const {
        flowDirection = 'AR_REFUND',
        method = 'M-Pesa Mobile Money Reversal',
        reasonCode = 'Customer Order Cancellation',
        clearingChannel = 'POS Cash Drawer Register',
        originalOrderId = null,
        originalRef = '',
        supplierId = null,
        counterpartyName = '',
        amount,
        auditNotes = '',
      } = req.body || {};

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Enter a valid refund amount greater than 0.' });
      }

      const validFlow = flowDirection === 'AP_CREDIT_MEMO' ? 'AP_CREDIT_MEMO' : 'AR_REFUND';
      let resolvedCounterparty = String(counterpartyName || '').trim();
      if (supplierId) {
        const supRes = await db.execute(sql`
          SELECT name FROM suppliers WHERE id = ${String(supplierId)} AND tenant_id = ${tenantId} LIMIT 1
        `);
        if (rowsOf(supRes)[0]?.name) resolvedCounterparty = rowsOf(supRes)[0].name;
      }
      if (!resolvedCounterparty) {
        resolvedCounterparty = validFlow === 'AR_REFUND' ? 'Walk-in Customer' : 'Wholesale Supplier';
      }

      const docNum = `${validFlow === 'AR_REFUND' ? 'RFD' : 'CRM'}-${Math.floor(100000 + Math.random() * 900000)}`;
      const processedBy = req.auth?.email || req.user?.email || 'Admin';

      const created = await db.transaction(async (tx) => {
        // 1. Sync to treasury_payments
        const tpFlow = validFlow === 'AR_REFUND' ? 'OUTBOUND_AP' : 'INBOUND_AR';
        const tpRes = await tx.execute(sql`
          INSERT INTO treasury_payments (
            tenant_id, document_number, flow_direction, payment_method, clearing_channel,
            transaction_ref, supplier_id, counterparty_name, allocated_bill,
            amount, clearing_status, audit_notes, processed_by
          )
          VALUES (
            ${tenantId}, ${`PMT-${docNum}`}, ${tpFlow}, ${String(method)}, ${String(clearingChannel)},
            ${originalRef ? String(originalRef).trim() : docNum}, ${supplierId || null},
            ${resolvedCounterparty}, ${`${validFlow === 'AR_REFUND' ? 'Customer Refund' : 'Vendor Credit Memo'} (${reasonCode})`},
            ${numericAmount.toFixed(2)}, 'POSTED_UNRECONCILED',
            ${auditNotes ? String(auditNotes).trim() : reasonCode}, ${processedBy}
          )
          RETURNING id
        `);
        const treasuryId = rowsOf(tpRes)[0]?.id || null;

        // 2. Insert refund record
        const rfdRes = await tx.execute(sql`
          INSERT INTO finance_refunds (
            tenant_id, document_number, flow_direction, method, reason_code, clearing_channel,
            original_order_id, original_ref, supplier_id, counterparty_name,
            amount, audit_notes, treasury_payment_id, processed_by
          )
          VALUES (
            ${tenantId}, ${docNum}, ${validFlow}, ${String(method)}, ${String(reasonCode)},
            ${String(clearingChannel)}, ${originalOrderId || null},
            ${originalRef ? String(originalRef).trim() : null}, ${supplierId || null},
            ${resolvedCounterparty}, ${numericAmount.toFixed(2)},
            ${auditNotes ? String(auditNotes).trim() : null}, ${treasuryId}, ${processedBy}
          )
          RETURNING id, document_number AS "documentNumber", amount::float AS amount
        `);

        return rowsOf(rfdRes)[0];
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[FINANCE REFUNDS CREATE ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to commit refund document' });
    }
  }

  // =========================================================================
  // 2. CASH DRAWER
  // =========================================================================
  static async getCashDrawer(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [shiftsRes, movementsRes] = await Promise.all([
        db.execute(sql`
          SELECT id, register_name AS "registerName", cashier_name AS "cashierName",
                 operational_date AS "operationalDate", opening_float::float AS "openingFloat",
                 cash_sales::float AS "cashSales", expected_drawer::float AS "expectedDrawer",
                 physical_count::float AS "physicalCount", cash_variance::float AS "cashVariance",
                 status, opened_at AS "openedAt", closed_at AS "closedAt"
          FROM finance_till_shifts
          WHERE tenant_id = ${tenantId}
          ORDER BY opened_at DESC
          LIMIT 25
        `),
        db.execute(sql`
          SELECT m.id, m.shift_id AS "shiftId", m.movement_type AS "movementType",
                 m.amount::float AS amount, m.reason, m.reference_no AS "referenceNo",
                 m.recorded_by AS "recordedBy", m.created_at AS "createdAt",
                 COALESCE(s.register_name, 'Main Register') AS "registerName"
          FROM cash_drawer_movements m
          LEFT JOIN finance_till_shifts s ON s.id = m.shift_id AND s.tenant_id = m.tenant_id
          WHERE m.tenant_id = ${tenantId}
          ORDER BY m.created_at DESC
          LIMIT 50
        `),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          shifts: rowsOf(shiftsRes),
          movements: rowsOf(movementsRes),
        },
      });
    } catch (error: any) {
      console.error('[CASH DRAWER GET ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load cash drawer' });
    }
  }

  static async recordDrawerMovement(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { shiftId = null, movementType = 'SAFE_DROP', amount, reason, referenceNo = '' } = req.body || {};
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Enter a valid movement amount.' });
      }
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({ success: false, message: 'Reason is required for drawer audit trail.' });
      }

      const validType = ['PAY_IN', 'PAY_OUT', 'SAFE_DROP'].includes(movementType) ? movementType : 'SAFE_DROP';
      const recordedBy = req.auth?.email || req.user?.email || 'Admin';

      const created = await db.transaction(async (tx) => {
        const movRes = await tx.execute(sql`
          INSERT INTO cash_drawer_movements (tenant_id, shift_id, movement_type, amount, reason, reference_no, recorded_by)
          VALUES (${tenantId}, ${shiftId || null}, ${validType}, ${numericAmount.toFixed(2)},
                  ${String(reason).trim()}, ${referenceNo ? String(referenceNo).trim() : null}, ${recordedBy})
          RETURNING id, movement_type AS "movementType", amount::float AS amount
        `);

        if (shiftId) {
          const delta = validType === 'PAY_IN' ? numericAmount : -numericAmount;
          await tx.execute(sql`
            UPDATE finance_till_shifts
            SET expected_drawer = GREATEST(0, expected_drawer + ${delta})
            WHERE id = ${String(shiftId)} AND tenant_id = ${tenantId} AND status = 'OPEN'
          `);
        }

        return rowsOf(movRes)[0];
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[CASH DRAWER MOVEMENT ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to record drawer movement' });
    }
  }

  // =========================================================================
  // 3. Z-REPORTS & TILL SHIFTS
  // =========================================================================
  static async getZReports(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const opDate = String(req.query.date || new Date().toISOString().slice(0, 10));

      const [shiftsRes, paymentsRes] = await Promise.all([
        db.execute(sql`
          SELECT id, register_name AS "registerName", cashier_name AS "cashierName",
                 operational_date AS "operationalDate", opening_float::float AS "openingFloat",
                 cash_sales::float AS "cashSales", expected_drawer::float AS "expectedDrawer",
                 physical_count::float AS "physicalCount", cash_variance::float AS "cashVariance",
                 status, supervisor_signoff AS "supervisorSignoff",
                 opened_at AS "openedAt", closed_at AS "closedAt"
          FROM finance_till_shifts
          WHERE tenant_id = ${tenantId}
            AND operational_date = ${opDate}::date
          ORDER BY opened_at DESC
        `),
        db.execute(sql`
          SELECT payment_method AS "paymentMethod",
                 clearing_channel AS "clearingChannel",
                 COUNT(*)::int AS cnt,
                 COALESCE(SUM(amount), 0)::float AS total
          FROM treasury_payments
          WHERE tenant_id = ${tenantId}
            AND flow_direction = 'INBOUND_AR'
            AND clearing_status != 'REVERSED'
            AND DATE(created_at) = ${opDate}::date
          GROUP BY payment_method, clearing_channel
        `),
      ]);

      const shifts = rowsOf(shiftsRes);
      const breakdownRows = rowsOf(paymentsRes);

      let cashTotal = 0;
      let mpesaTotal = 0;
      let mpesaCount = 0;
      let cardTotal = 0;
      let cardCount = 0;
      let creditTotal = 0;
      let creditCount = 0;
      let bankTotal = 0;
      let bankCount = 0;
      let totalTxns = 0;

      for (const r of breakdownRows) {
        const m = String(r.paymentMethod || '').toUpperCase();
        const amt = Number(r.total || 0);
        const cnt = Number(r.cnt || 0);
        totalTxns += cnt;
        if (m.includes('MPESA') || m.includes('M_PESA')) {
          mpesaTotal += amt;
          mpesaCount += cnt;
        } else if (m.includes('CARD') || m.includes('PDQ')) {
          cardTotal += amt;
          cardCount += cnt;
        } else if (m.includes('CREDIT') || m.includes('TAB')) {
          creditTotal += amt;
          creditCount += cnt;
        } else if (m.includes('BANK') || m.includes('EFT')) {
          bankTotal += amt;
          bankCount += cnt;
        } else {
          cashTotal += amt;
        }
      }

      const grossSales = cashTotal + mpesaTotal + cardTotal + creditTotal + bankTotal;
      const estimatedVat = Number((grossSales - grossSales / 1.16).toFixed(2));

      return res.status(200).json({
        success: true,
        data: {
          operationalDate: opDate,
          summary: {
            grossSales,
            settledSalesCount: totalTxns,
            estimatedVat,
            cashTotal,
            mpesaTotal,
            mpesaCount,
            cardTotal,
            cardCount,
            creditTotal,
            creditCount,
            bankTotal,
            bankCount,
          },
          shifts,
        },
      });
    } catch (error: any) {
      console.error('[Z-REPORTS GET ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load Z-Report data' });
    }
  }

  static async openTillShift(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const {
        registerName = 'Main Checkout Till 1',
        openingFloat = 0,
        cashierName = '',
        operationalDate = new Date().toISOString().slice(0, 10),
      } = req.body || {};

      const floatAmt = Math.max(0, Number(openingFloat) || 0);
      const custodian = String(cashierName || '').trim() || req.auth?.email || req.user?.email || 'Admin';
      const branchId = req.auth?.branchId || req.user?.branchId || null;

      const inserted = await db.execute(sql`
        INSERT INTO finance_till_shifts (
          tenant_id, branch_id, register_name, cashier_name, operational_date,
          opening_float, cash_sales, expected_drawer, status
        )
        VALUES (
          ${tenantId}, ${branchId}, ${String(registerName).trim()}, ${custodian},
          ${String(operationalDate)}::date, ${floatAmt.toFixed(2)}, 0, ${floatAmt.toFixed(2)}, 'OPEN'
        )
        RETURNING id, register_name AS "registerName", status
      `);

      return res.status(201).json({ success: true, data: rowsOf(inserted)[0] });
    } catch (error: any) {
      console.error('[OPEN SHIFT ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to open till shift' });
    }
  }

  static async closeTillShift(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const shiftId = String(req.params.id);
      const { physicalCount = 0 } = req.body || {};
      const countAmt = Math.max(0, Number(physicalCount) || 0);
      const supervisor = req.auth?.email || req.user?.email || 'Admin';

      const updRes = await db.execute(sql`
        UPDATE finance_till_shifts
        SET physical_count = ${countAmt.toFixed(2)},
            cash_variance = (${countAmt.toFixed(2)}::numeric - expected_drawer),
            status = 'CLOSED',
            supervisor_signoff = ${supervisor},
            closed_at = NOW()
        WHERE id = ${shiftId} AND tenant_id = ${tenantId}
        RETURNING id, status, physical_count::float AS "physicalCount", cash_variance::float AS "cashVariance"
      `);

      const updated = rowsOf(updRes)[0];
      if (!updated) return res.status(404).json({ success: false, message: 'Till shift not found.' });

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[CLOSE SHIFT ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to close till shift' });
    }
  }

  // =========================================================================
  // 4. FINANCIAL CONTROL
  // =========================================================================
  static async getFinancialControl(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [tpRes, apRes, periodsRes] = await Promise.all([
        db.execute(sql`
          SELECT
            COALESCE(SUM(CASE WHEN flow_direction = 'INBOUND_AR' AND clearing_status != 'REVERSED' THEN amount ELSE 0 END), 0)::float AS "totalInflow",
            COALESCE(SUM(CASE WHEN flow_direction = 'OUTBOUND_AP' AND clearing_status != 'REVERSED' THEN amount ELSE 0 END), 0)::float AS "totalOutflow",
            COUNT(*) FILTER (WHERE clearing_status = 'POSTED_UNRECONCILED')::int AS "unreconciledCount"
          FROM treasury_payments
          WHERE tenant_id = ${tenantId}
        `),
        db.execute(sql`
          SELECT COALESCE(SUM(balance_due), 0)::float AS "outstandingAp"
          FROM supplier_invoices
          WHERE tenant_id = ${tenantId}
        `),
        db.execute(sql`
          SELECT id, period_key AS "periodKey", is_locked AS "isLocked",
                 approval_threshold::float AS "approvalThreshold",
                 locked_by AS "lockedBy", updated_at AS "updatedAt"
          FROM financial_control_periods
          WHERE tenant_id = ${tenantId}
          ORDER BY period_key DESC
        `),
      ]);

      const tp = rowsOf(tpRes)[0] || { totalInflow: 0, totalOutflow: 0, unreconciledCount: 0 };
      const ap = rowsOf(apRes)[0] || { outstandingAp: 0 };

      return res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalInflow: tp.totalInflow,
            totalOutflow: tp.totalOutflow,
            netLiquidity: Number((tp.totalInflow - tp.totalOutflow).toFixed(2)),
            outstandingAp: ap.outstandingAp,
            unreconciledCount: tp.unreconciledCount,
          },
          periods: rowsOf(periodsRes),
        },
      });
    } catch (error: any) {
      console.error('[FINANCIAL CONTROL GET ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load financial control' });
    }
  }

  static async upsertPeriodLock(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const {
        periodKey = new Date().toISOString().slice(0, 7),
        isLocked = false,
        approvalThreshold = 50000,
      } = req.body || {};

      const lockedBy = req.auth?.email || req.user?.email || 'Admin';

      const saved = await db.execute(sql`
        INSERT INTO financial_control_periods (tenant_id, period_key, is_locked, approval_threshold, locked_by, updated_at)
        VALUES (${tenantId}, ${String(periodKey).trim()}, ${Boolean(isLocked)}, ${Number(approvalThreshold) || 50000}, ${lockedBy}, NOW())
        ON CONFLICT (tenant_id, period_key)
        DO UPDATE SET
          is_locked = EXCLUDED.is_locked,
          approval_threshold = EXCLUDED.approval_threshold,
          locked_by = EXCLUDED.locked_by,
          updated_at = NOW()
        RETURNING id, period_key AS "periodKey", is_locked AS "isLocked", approval_threshold::float AS "approvalThreshold"
      `);

      return res.status(200).json({ success: true, data: rowsOf(saved)[0] });
    } catch (error: any) {
      console.error('[FINANCIAL CONTROL LOCK ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to update fiscal period lock' });
    }
  }

  // =========================================================================
  // 5. GENERAL JOURNAL (DOUBLE-ENTRY GL)
  // =========================================================================
  static async getJournal(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [entriesRes, linesRes] = await Promise.all([
        db.execute(sql`
          SELECT id, entry_number AS "entryNumber", entry_date AS "entryDate",
                 reference_no AS "referenceNo", description, source_module AS "sourceModule",
                 total_debit::float AS "totalDebit", total_credit::float AS "totalCredit",
                 posted_by AS "postedBy", created_at AS "createdAt"
          FROM general_journal_entries
          WHERE tenant_id = ${tenantId}
          ORDER BY entry_date DESC, created_at DESC
          LIMIT 50
        `),
        db.execute(sql`
          SELECT id, entry_id AS "entryId", account_code AS "accountCode",
                 account_name AS "accountName", debit::float AS debit, credit::float AS credit
          FROM general_journal_lines
          WHERE tenant_id = ${tenantId}
        `),
      ]);

      const linesByEntry = new Map<string, any[]>();
      for (const l of rowsOf(linesRes)) {
        const list = linesByEntry.get(l.entryId) || [];
        list.push(l);
        linesByEntry.set(l.entryId, list);
      }

      const entries = rowsOf(entriesRes).map((e: any) => ({
        ...e,
        lines: linesByEntry.get(e.id) || [],
      }));

      return res.status(200).json({ success: true, data: entries });
    } catch (error: any) {
      console.error('[GENERAL JOURNAL GET ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load general journal' });
    }
  }

  static async createJournalEntry(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const {
        entryDate = new Date().toISOString().slice(0, 10),
        referenceNo = '',
        description,
        lines = [],
      } = req.body || {};

      if (!description || !String(description).trim()) {
        return res.status(400).json({ success: false, message: 'Journal narration/description is required.' });
      }
      if (!Array.isArray(lines) || lines.length < 2) {
        return res.status(400).json({ success: false, message: 'A double-entry journal requires at least 2 lines.' });
      }

      let totalDebit = 0;
      let totalCredit = 0;
      const parsedLines = lines.map((l: any) => {
        const d = Math.max(0, Number(l.debit) || 0);
        const c = Math.max(0, Number(l.credit) || 0);
        totalDebit += d;
        totalCredit += c;
        return {
          accountCode: String(l.accountCode || '1000').trim(),
          accountName: String(l.accountName || 'General Account').trim(),
          debit: Number(d.toFixed(2)),
          credit: Number(c.toFixed(2)),
        };
      });

      if (totalDebit <= 0 || Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Journal entry is out of balance. Debits (KES ${totalDebit.toFixed(2)}) must equal Credits (KES ${totalCredit.toFixed(2)}).`,
        });
      }

      const entryNumber = `JRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const postedBy = req.auth?.email || req.user?.email || 'Admin';

      const created = await db.transaction(async (tx) => {
        const jRes = await tx.execute(sql`
          INSERT INTO general_journal_entries (
            tenant_id, entry_number, entry_date, reference_no, description,
            source_module, total_debit, total_credit, posted_by
          )
          VALUES (
            ${tenantId}, ${entryNumber}, ${String(entryDate)}::date,
            ${referenceNo ? String(referenceNo).trim() : null}, ${String(description).trim()},
            'MANUAL', ${totalDebit.toFixed(2)}, ${totalCredit.toFixed(2)}, ${postedBy}
          )
          RETURNING id, entry_number AS "entryNumber"
        `);
        const entry = rowsOf(jRes)[0];

        for (const l of parsedLines) {
          await tx.execute(sql`
            INSERT INTO general_journal_lines (tenant_id, entry_id, account_code, account_name, debit, credit)
            VALUES (${tenantId}, ${entry.id}, ${l.accountCode}, ${l.accountName}, ${l.debit}, ${l.credit})
          `);
        }

        return entry;
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[GENERAL JOURNAL CREATE ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to post journal entry' });
    }
  }
}