import { Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string; branchId?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string; branchId?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

const getStaffTableName = async (): Promise<'employees' | 'staff' | null> => {
  const res = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('employees', 'staff')
    LIMIT 1
  `);
  const name = rowsOf(res)[0]?.table_name;
  return name === 'employees' || name === 'staff' ? name : null;
};

// GET /api/v1/tills
export const getTills = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
    }

    const [shiftsRes, usersRes, registersRes, branchesRes, staffTable] = await Promise.all([
      db.execute(sql`
        SELECT s.id,
               s.shift_seq AS "shiftSeq",
               s.register_name AS "registerName",
               s.cashier_name AS "cashierName",
               COALESCE(s.cashier_email, '') AS "cashierEmail",
               COALESCE(s.cashier_role, 'CASHIER') AS "cashierRole",
               COALESCE(s.shift_rotation, 'Morning Shift') AS "shiftRotation",
               COALESCE(b.name, 'Main Branch') AS "branchName",
               COALESCE(s.opening_float, 0)::float AS "openingFloat",
               COALESCE(s.cash_sales, 0)::float AS "cashSales",
               COALESCE(s.expected_drawer, 0)::float AS "expectedCash",
               s.physical_count::float AS "countedCash",
               COALESCE(s.cash_variance, 0)::float AS variance,
               COALESCE(s.status, 'OPEN') AS status,
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
               'ADMIN' AS role
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
      getStaffTableName(),
    ]);

    // Merge users + employees/staff table without duplicates
    const staffMap = new Map<string, { id: string; name: string; email: string; role: string }>();

    for (const u of rowsOf(usersRes)) {
      const key = (u.email || u.id).toLowerCase();
      staffMap.set(key, {
        id: `user:${u.id}`,
        name: u.name || u.email,
        email: u.email || '',
        role: u.role || 'ADMIN',
      });
    }

    if (staffTable) {
      try {
        const empRes = await db.execute(sql`
          SELECT id,
                 COALESCE(
                   NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''),
                   NULLIF(TRIM(COALESCE(full_name, '')), ''),
                   NULLIF(TRIM(COALESCE(name, '')), ''),
                   email
                 ) AS name,
                 COALESCE(email, '') AS email,
                 COALESCE(role, 'CASHIER') AS role
          FROM ${sql.raw(staffTable)}
          WHERE tenant_id = ${tenantId}
          ORDER BY name ASC
        `);
        for (const e of rowsOf(empRes)) {
          const key = (e.email || e.id).toLowerCase();
          staffMap.set(key, {
            id: `staff:${e.id}`,
            name: e.name || e.email || 'Staff Member',
            email: e.email || '',
            role: String(e.role || 'CASHIER').toUpperCase(),
          });
        }
      } catch (staffErr) {
        console.warn('[TILLS STAFF MERGE WARNING]', staffErr);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        shifts: rowsOf(shiftsRes),
        staff: Array.from(staffMap.values()),
        registers: rowsOf(registersRes),
        branches: rowsOf(branchesRes),
      },
    });
  } catch (error: any) {
    console.error('[TILLS GET ERROR]', error);
    return res.status(500).json({
      success: false,
      message: error?.cause?.message || error?.message || 'Failed to load cashier shifts',
    });
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

    let resolvedUserId: string | null = null;
    let resolvedName = authEmail;
    let resolvedEmail = authEmail;
    let resolvedRole = authRole;

    const rawSelection = String(cashierUserId || '').trim();

    if (rawSelection.startsWith('staff:')) {
      const empId = rawSelection.slice(6);
      const staffTable = await getStaffTableName();
      if (staffTable) {
        const eRes = await db.execute(sql`
          SELECT COALESCE(
                   NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''),
                   NULLIF(TRIM(COALESCE(full_name, '')), ''),
                   NULLIF(TRIM(COALESCE(name, '')), ''),
                   email
                 ) AS name,
                 COALESCE(email, '') AS email,
                 COALESCE(role, 'CASHIER') AS role
          FROM ${sql.raw(staffTable)}
          WHERE id = ${empId} AND tenant_id = ${tenantId}
          LIMIT 1
        `);
        const emp = rowsOf(eRes)[0];
        if (emp) {
          resolvedName = emp.name || emp.email || 'Staff Member';
          resolvedEmail = emp.email || '';
          resolvedRole = String(emp.role || 'CASHIER').toUpperCase();
        }
      }
    } else {
      const targetUserId = rawSelection.startsWith('user:')
        ? rawSelection.slice(5)
        : rawSelection || authUserId;

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
    }

    // Verify branchId belongs to this tenant before inserting
    let resolvedBranchId: string | null = null;
    const candidateBranch = branchId ? String(branchId) : authBranchId;
    if (candidateBranch) {
      const bRes = await db.execute(sql`
        SELECT id FROM branches WHERE id = ${candidateBranch} AND tenant_id = ${tenantId} LIMIT 1
      `);
      if (rowsOf(bRes)[0]?.id) resolvedBranchId = rowsOf(bRes)[0].id;
    }

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
    return res.status(400).json({
      success: false,
      message: error?.cause?.message || error?.message || 'Failed to open cashier shift',
    });
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
    return res.status(400).json({
      success: false,
      message: error?.cause?.message || error?.message || 'Failed to close cashier shift',
    });
  }
};

// POST /api/v1/tills/registers
export const createRegister = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { name, terminalCode = '', branchId = null } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Register name is required.' });
    }

    const code = String(terminalCode || `POS-TERM-${Math.floor(10 + Math.random() * 89)}`)
      .trim()
      .toUpperCase();
    const safeBranch = branchId ? String(branchId) : req.auth?.branchId || req.user?.branchId || null;

    const inserted = await db.execute(sql`
      INSERT INTO pos_registers (tenant_id, branch_id, name, terminal_code, is_active)
      VALUES (${tenantId}, ${safeBranch}, ${String(name).trim()}, ${code}, TRUE)
      RETURNING id, name, terminal_code AS "terminalCode"
    `);

    return res.status(201).json({ success: true, data: rowsOf(inserted)[0] });
  } catch (error: any) {
    console.error('[TILLS REGISTER ERROR]', error);
    return res.status(400).json({
      success: false,
      message: error?.cause?.message || error?.message || 'Failed to create register',
    });
  }
};