import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export const REPORT_CATALOG = [
  {
    key: 'SALES_ORDERS_REVENUE',
    identifier: 'SKP_SALES_REVENUE_01',
    name: 'Sales Orders & Revenue Velocity',
    description: 'Order-to-cash turnover, VAT (16%), tender breakdown, and branch sales ledger.',
    category: 'Sales & Revenue',
    badge: 'REVENUE SALES',
  },
  {
    key: 'INVENTORY_VALUATION',
    identifier: 'SKP_INVENTORY_STOCK_02',
    name: 'Inventory Valuation & Low-Stock Audit',
    description: 'Live SKU stock levels, reorder thresholds, cost vs. selling price valuation.',
    category: 'Inventory & Stock',
    badge: 'INVENTORY',
  },
  {
    key: 'TREASURY_PAYMENTS_LEDGER',
    identifier: 'SKP_TREASURY_AUDIT_03',
    name: 'Treasury Payments & Clearing Ledger',
    description: 'Inbound AR collections, outbound AP supplier payouts, and clearing status.',
    category: 'Treasury & Audit',
    badge: 'AUDIT LEDGER',
  },
  {
    key: 'CASHIER_SHIFT_SETTLEMENTS',
    identifier: 'SKP_WORKFORCE_SHIFTS_04',
    name: 'Cashier Shift & Cash Drift Audit',
    description: 'Opening floats, expected vs. counted drawer cash, and variance sign-offs.',
    category: 'Workforce & Shifts',
    badge: 'WORKFORCE',
  },
];

export class AnalyticsController {
  // GET /api/v1/analytics/hub
  static async getHub(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [runsRes, schedulesRes, branchesRes] = await Promise.all([
        db.execute(sql`
          SELECT id,
                 execution_ref AS "executionRef",
                 template_key AS "templateKey",
                 report_name AS "reportName",
                 category,
                 branch_scope AS "branchScope",
                 export_format AS "exportFormat",
                 operator_name AS "operatorName",
                 row_count::int AS "rowCount",
                 duration_ms::int AS "durationMs",
                 status,
                 created_at AS "createdAt"
          FROM analytics_report_runs
          WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC
          LIMIT 100
        `),
        db.execute(sql`
          SELECT s.id,
                 s.template_key AS "templateKey",
                 s.report_name AS "reportName",
                 s.category,
                 s.branch_id AS "branchId",
                 COALESCE(b.name, 'All Locations') AS "branchName",
                 s.frequency,
                 s.export_format AS "exportFormat",
                 s.recipient_email AS "recipientEmail",
                 s.is_active AS "isActive",
                 s.created_by AS "createdBy",
                 s.created_at AS "createdAt"
          FROM analytics_report_schedules s
          LEFT JOIN branches b ON b.id = s.branch_id AND b.tenant_id = s.tenant_id
          WHERE s.tenant_id = ${tenantId}
          ORDER BY s.created_at DESC
        `),
        db.execute(sql`
          SELECT id, name
          FROM branches
          WHERE tenant_id = ${tenantId}
          ORDER BY name ASC
        `),
      ]);

      const runs = rowsOf(runsRes);
      const schedules = rowsOf(schedulesRes);

      const totalExecutions = runs.length;
      const completedExecutions = runs.filter((r) => r.status === 'COMPLETED').length;
      const activeSchedules = schedules.filter((s) => s.isActive).length;
      const totalRecordsExported = runs.reduce((acc, r) => acc + Number(r.rowCount || 0), 0);
      const avgLatencyMs =
        totalExecutions > 0
          ? Math.round(runs.reduce((acc, r) => acc + Number(r.durationMs || 0), 0) / totalExecutions)
          : 0;

      return res.status(200).json({
        success: true,
        data: {
          catalog: REPORT_CATALOG,
          branches: rowsOf(branchesRes),
          kpis: {
            totalExecutions,
            completedExecutions,
            activeSchedules,
            avgLatencyMs,
            totalRecordsExported,
          },
          runs,
          schedules,
        },
      });
    } catch (error: any) {
      console.error('[ANALYTICS HUB ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to load analytics hub',
      });
    }
  }

  // POST /api/v1/analytics/run
  static async runReport(req: AuthRequest, res: Response) {
    const startedAt = Date.now();
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const operatorName = req.auth?.email || req.user?.email || 'Admin';
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const {
        templateKey = 'SALES_ORDERS_REVENUE',
        branchId = 'ALL',
        startDate = '',
        endDate = '',
        exportFormat = 'CSV',
      } = req.body || {};

      const template = REPORT_CATALOG.find((t) => t.key === templateKey);
      if (!template) {
        return res.status(400).json({ success: false, message: 'Unknown report template.' });
      }

      const safeStart = startDate ? `${String(startDate).slice(0, 10)} 00:00:00` : '2000-01-01 00:00:00';
      const safeEnd = endDate ? `${String(endDate).slice(0, 10)} 23:59:59` : '2100-12-31 23:59:59';

      let branchScope = 'All Locations';
      if (branchId && branchId !== 'ALL') {
        const bRes = await db.execute(sql`
          SELECT name FROM branches WHERE id = ${String(branchId)} AND tenant_id = ${tenantId} LIMIT 1
        `);
        if (rowsOf(bRes)[0]?.name) branchScope = rowsOf(bRes)[0].name;
      }

      let rows: any[] = [];
      let columns: string[] = [];

      if (templateKey === 'SALES_ORDERS_REVENUE') {
        const qRes = await db.execute(sql`
          SELECT o.order_number AS "Order #",
                 COALESCE(b.name, 'Main Branch') AS "Branch",
                 COALESCE(NULLIF(TRIM(o.sale_channel), ''), 'Retail Checkout') AS "Channel",
                 COALESCE(NULLIF(TRIM(o.customer_name), ''), 'Walk-in Customer') AS "Customer",
                 UPPER(COALESCE(o.payment_method, 'CASH')) AS "Tender",
                 UPPER(COALESCE(o.status, 'COMPLETED')) AS "Status",
                 COALESCE(o.tax, 0)::float AS "VAT (KES)",
                 COALESCE(o.total, 0)::float AS "Total (KES)",
                 TO_CHAR(o.created_at, 'YYYY-MM-DD HH24:MI') AS "Timestamp"
          FROM orders o
          LEFT JOIN branches b ON b.id = o.branch_id AND b.tenant_id = o.tenant_id
          WHERE o.tenant_id = ${tenantId}
            AND o.created_at >= ${safeStart}::timestamp
            AND o.created_at <= ${safeEnd}::timestamp
            ${branchId && branchId !== 'ALL' ? sql`AND o.branch_id = ${String(branchId)}` : sql``}
          ORDER BY o.created_at DESC
          LIMIT 500
        `);
        rows = rowsOf(qRes);
        columns = ['Order #', 'Branch', 'Channel', 'Customer', 'Tender', 'Status', 'VAT (KES)', 'Total (KES)', 'Timestamp'];
      } else if (templateKey === 'INVENTORY_VALUATION') {
        const qRes = await db.execute(sql`
          SELECT COALESCE(sku, 'N/A') AS "SKU",
                 name AS "Product Name",
                 COALESCE(cost_price, 0)::float AS "Cost Price (KES)",
                 COALESCE(selling_price, 0)::float AS "Selling Price (KES)",
                 COALESCE(reorder_level, 0)::int AS "Stock / Reorder",
                 COALESCE(minimum_stock, 0)::int AS "Min Threshold",
                 CASE WHEN COALESCE(reorder_level, 0) <= COALESCE(minimum_stock, 5) THEN 'LOW STOCK' ELSE 'HEALTHY' END AS "Health"
          FROM products
          WHERE tenant_id = ${tenantId}
          ORDER BY name ASC
          LIMIT 500
        `);
        rows = rowsOf(qRes);
        columns = ['SKU', 'Product Name', 'Cost Price (KES)', 'Selling Price (KES)', 'Stock / Reorder', 'Min Threshold', 'Health'];
      } else if (templateKey === 'TREASURY_PAYMENTS_LEDGER') {
        const qRes = await db.execute(sql`
          SELECT document_number AS "Document #",
                 flow_direction AS "Flow",
                 clearing_channel AS "Channel",
                 COALESCE(transaction_ref, '—') AS "Reference",
                 counterparty_name AS "Counterparty",
                 amount::float AS "Amount (KES)",
                 clearing_status AS "Status",
                 TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS "Timestamp"
          FROM treasury_payments
          WHERE tenant_id = ${tenantId}
            AND created_at >= ${safeStart}::timestamp
            AND created_at <= ${safeEnd}::timestamp
          ORDER BY created_at DESC
          LIMIT 500
        `);
        rows = rowsOf(qRes);
        columns = ['Document #', 'Flow', 'Channel', 'Reference', 'Counterparty', 'Amount (KES)', 'Status', 'Timestamp'];
      } else if (templateKey === 'CASHIER_SHIFT_SETTLEMENTS') {
        const qRes = await db.execute(sql`
          SELECT CONCAT('#', shift_seq) AS "Shift ID",
                 cashier_name AS "Cashier",
                 register_name AS "Register",
                 COALESCE(shift_rotation, 'Morning Shift') AS "Rotation",
                 COALESCE(opening_float, 0)::float AS "Opening Float",
                 COALESCE(expected_drawer, 0)::float AS "Expected Cash",
                 COALESCE(physical_count, 0)::float AS "Counted Cash",
                 COALESCE(cash_variance, 0)::float AS "Variance",
                 status AS "Status"
          FROM finance_till_shifts
          WHERE tenant_id = ${tenantId}
            AND opened_at >= ${safeStart}::timestamp
            AND opened_at <= ${safeEnd}::timestamp
            ${branchId && branchId !== 'ALL' ? sql`AND branch_id = ${String(branchId)}` : sql``}
          ORDER BY opened_at DESC
          LIMIT 500
        `);
        rows = rowsOf(qRes);
        columns = ['Shift ID', 'Cashier', 'Register', 'Rotation', 'Opening Float', 'Expected Cash', 'Counted Cash', 'Variance', 'Status'];
      }

      const durationMs = Math.max(1, Date.now() - startedAt);
      const executionRef = `REP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const safeFormat = String(exportFormat || 'CSV').toUpperCase();

      await db.execute(sql`
        INSERT INTO analytics_report_runs (
          tenant_id, execution_ref, template_key, report_name, category,
          branch_scope, export_format, operator_name, row_count, duration_ms, status
        )
        VALUES (
          ${tenantId}, ${executionRef}, ${template.key}, ${template.name}, ${template.badge},
          ${branchScope}, ${safeFormat}, ${operatorName}, ${rows.length}, ${durationMs}, 'COMPLETED'
        )
      `);

      return res.status(200).json({
        success: true,
        data: {
          executionRef,
          reportName: template.name,
          rowCount: rows.length,
          durationMs,
          columns,
          rows,
        },
      });
    } catch (error: any) {
      console.error('[ANALYTICS RUN ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to execute report query',
      });
    }
  }

  // POST /api/v1/analytics/schedules
  static async createSchedule(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const createdBy = req.auth?.email || req.user?.email || 'Admin';
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const {
        templateKey = 'SALES_ORDERS_REVENUE',
        branchId = '',
        frequency = 'DAILY',
        exportFormat = 'CSV',
        recipientEmail = '',
      } = req.body || {};

      const template = REPORT_CATALOG.find((t) => t.key === templateKey);
      if (!template) return res.status(400).json({ success: false, message: 'Invalid report template.' });
      if (!recipientEmail || !String(recipientEmail).includes('@')) {
        return res.status(400).json({ success: false, message: 'Enter a valid recipient email address.' });
      }

      const safeBranch = branchId && branchId !== 'ALL' ? String(branchId) : null;

      const inserted = await db.execute(sql`
        INSERT INTO analytics_report_schedules (
          tenant_id, template_key, report_name, category, branch_id,
          frequency, export_format, recipient_email, is_active, created_by
        )
        VALUES (
          ${tenantId}, ${template.key}, ${template.name}, ${template.badge}, ${safeBranch},
          ${String(frequency).toUpperCase()}, ${String(exportFormat).toUpperCase()},
          ${String(recipientEmail).trim().toLowerCase()}, TRUE, ${createdBy}
        )
        RETURNING id, report_name AS "reportName", frequency, is_active AS "isActive"
      `);

      return res.status(201).json({ success: true, data: rowsOf(inserted)[0] });
    } catch (error: any) {
      console.error('[ANALYTICS SCHEDULE CREATE ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to create schedule',
      });
    }
  }

  // DELETE /api/v1/analytics/schedules/:id
  static async deleteSchedule(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      await db.execute(sql`
        DELETE FROM analytics_report_schedules
        WHERE id = ${String(req.params.id)} AND tenant_id = ${tenantId}
      `);

      return res.status(200).json({ success: true, message: 'Schedule removed.' });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to delete schedule',
      });
    }
  }
}