import { Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string; branchId?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string; branchId?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

// GET /api/v1/tills
export const getTills = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
    }

    const [shiftsRes, staffRes, registersRes, branchesRes] = await Promise.all([
      db.execute(sql`
        SELECT s.id,
               s.shift_seq AS "shiftSeq",
               s.register_name AS "registerName",
               s.cashier_name AS "cashierName",
               COALESCE(s.cashier_email, '') AS "cashierEmail",
               COALESCE(s.cashier_role, 'CASHIER') AS "cashierRole",
               COALESCE(s.shift_rotation, 'Morning Shift') AS "shiftRotation",
               COALESCE(b.name, 'Main Branch') AS "branchName",
               s.opening_float::float AS "openingFloat",
               s.cash_sales::float AS "cashSales",
               s.expected_drawer::float AS "expectedCash",
               s.physical_count::float AS "countedCash",
               COALESCE(s.cash_variance, 0)::float AS variance,
               s.status,
               s.supervisor_signoff AS "supervisorSignoff",
               s.handover_notes AS "handoverNotes",
               s.opened_at AS "openedAt",
               s.closed_at AS "closedAt"
        FROM finance_till_shifts s
        LEFT JOIN branches b
          ON b.id = s.branch_id
         AND b.tenant_id = s.tenant_id
        WHERE s.tenant_id = ${tenantId}
        ORDER BY s.opened_at DESC
        LIMIT 100
      `),
      db.execute(sql`
        SELECT id,
               TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) AS name,
               email,
               'STAFF' AS role
        FROM users
        WHERE tenant_id = ${tenantId}
          AND is_active = TRUE
        ORDER BY first_name ASC
      `),
      db.execute(sql`
        SELECT r.id,
               r.name,
               r.terminal_code AS "terminalCode",
               COALESCE(b.name, 'Main Branch') AS "branchName"
        FROM pos_registers r
        LEFT JOIN branches b
          ON b.id = r.branch_id
         AND b.tenant_id = r.tenant_id
        WHERE r.tenant_id = ${tenantId}
          AND r.is_active = TRUE
        ORDER BY r.name ASC
      `),
      db.execute(sql`
        SELECT id, name
        FROM branches
        WHERE tenant_id = ${tenantId}
        ORDER BY name ASC
      `),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        shifts: rowsOf(shiftsRes),
        staff: rowsOf(staffRes),
        registers: rowsOf(registersRes),
        branches: rowsOf(branchesRes),
      },
    });
  } catch (error: any) {
    console.error('[TILLS GET ERROR]', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to load cashier shifts' });
  }
};

// POST /api/v1/tills (Open Cashier Shift Session)
export const createTill = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenantId || req.user?.tenantId;
    const authUserId = req.auth?.userId || req.user?.userId || null;
    const authEmail = req.auth?.email || req.user?.email || 'Admin';
    const authRole = req.auth?.role || req.user?.role || 'ADMIN';
    const authBranchId = req.auth?.branchId || req.user?.branchId || null;

    if (!tenantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      cashierUserId = '',
      registerName = 'No Physical Drawer',
      shiftRotation = 'Morning Shift',
      openingFloat = 0,
      branchId = '',
      handoverNotes = '',
    } = req.body || {};

    const floatAmt = Math.max(0, Number(openingFloat) || 0).toFixed(2);
    const safeRegister = String(registerName || 'No Physical Drawer').trim();
    const safeRotation = String(shiftRotation || 'Morning Shift').trim();
    const safeNotes = handoverNotes ? String(handoverNotes).trim() : null;

    // Resolve cashier custodian from tenant users
    let resolvedUserId: string | null = authUserId;
    let resolvedName = authEmail;
    let resolvedEmail = authEmail;
    let resolvedRole = authRole;

    const targetUserId = cashierUserId ? String(cashierUserId) : authUserId;
    if (targetUserId) {
      const uRes = await db.execute(sql`
        SELECT id, first_name AS "firstName", last_name AS "lastName", email
        FROM users
        WHERE id = ${targetUserId} AND tenant_id = ${tenantId}
        LIMIT 1
      `);
      const u = rowsOf(uRes)[0];
      if (u) {
        resolvedUserId = u.id;
        resolvedName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
        resolvedEmail = u.email;
      }
    }

    const resolvedBranchId = branchId ? String(branchId) : authBranchId;

    const inserted = await db.execute(sql`
      INSERT INTO finance_till_shifts (
        tenant_id, branch_id, register_name, cashier_user_id, cashier_name,
        cashier_email, cashier_role, shift_rotation, operational_date,
        opening_float, cash_sales, expected_drawer, status, handover_notes
      )
      VALUES (
        ${tenantId}, ${resolvedBranchId}, ${safeRegister}, ${resolvedUserId}, ${resolvedName},
        ${resolvedEmail}, ${resolvedRole}, ${safeRotation}, CURRENT_DATE,
        ${floatAmt}, 0, ${floatAmt}, 'OPEN', ${safeNotes}
      )
      RETURNING id, shift_seq AS "shiftSeq", register_name AS "registerName", status
    `);

    return res.status(201).json({ success: true, data: rowsOf(inserted)[0] });
  } catch (error: any) {
    console.error('[TILLS CREATE ERROR]', error);
    return res.status(400).json({ success: false, message: error?.message || 'Failed to open cashier shift' });
  }
};

// PATCH /api/v1/tills/:id/status (Blind Z-Report Closeout)
export const updateTillStatus = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const shiftId = String(req.params.id);
    const { countedCash = 0, closingNotes = '' } = req.body || {};
    const countStr = Math.max(0, Number(countedCash) || 0).toFixed(2);
    const supervisor = req.auth?.email || req.user?.email || 'Admin';
    const safeClosingNotes = closingNotes ? String(closingNotes).trim() : null;

    const updRes = await db.execute(sql`
      UPDATE finance_till_shifts
      SET physical_count = ${countStr},
          cash_variance = (${countStr}::numeric - expected_drawer),
          status = 'CLOSED',
          supervisor_signoff = ${supervisor},
          handover_notes = COALESCE(${safeClosingNotes}, handover_notes),
          closed_at = NOW()
      WHERE id = ${shiftId} AND tenant_id = ${tenantId}
      RETURNING id, status, physical_count::float AS "countedCash", cash_variance::float AS variance
    `);

    const updated = rowsOf(updRes)[0];
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Cashier shift not found.' });
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[TILLS CLOSE ERROR]', error);
    return res.status(400).json({ success: false, message: error?.message || 'Failed to close cashier shift' });
  }
};

// POST /api/v1/tills/registers (Provision a physical POS register for this tenant)
export const createRegister = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { name, terminalCode = '', branchId = null } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Register name is required.' });
    }

    const code = String(terminalCode || `POS-TERM-${Math.floor(10 + Math.random() * 89)}`).trim().toUpperCase();
    const safeBranch = branchId ? String(branchId) : req.auth?.branchId || req.user?.branchId || null;

    const inserted = await db.execute(sql`
      INSERT INTO pos_registers (tenant_id, branch_id, name, terminal_code, is_active)
      VALUES (${tenantId}, ${safeBranch}, ${String(name).trim()}, ${code}, TRUE)
      RETURNING id, name, terminal_code AS "terminalCode"
    `);

    return res.status(201).json({ success: true, data: rowsOf(inserted)[0] });
  } catch (error: any) {
    console.error('[TILLS REGISTER ERROR]', error);
    return res.status(400).json({ success: false, message: error?.message || 'Failed to create register' });
  }
};