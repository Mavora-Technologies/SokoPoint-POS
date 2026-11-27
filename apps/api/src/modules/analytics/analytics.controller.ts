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

  // =========================================================================
  // GROSS MARGIN & PROFITABILITY INTELLIGENCE (/api/v1/analytics/margins)
  // =========================================================================
  static async getMargins(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const todayStr = new Date().toISOString().slice(0, 10);
      const startDate = String(req.query.startDate || todayStr).slice(0, 10);
      const endDate = String(req.query.endDate || todayStr).slice(0, 10);
      const branchId = String(req.query.branchId || 'ALL');

      const startTs = `${startDate} 00:00:00`;
      const endTs = `${endDate} 23:59:59`;
      const hasBranch = branchId !== 'ALL' && branchId.trim() !== '';

      const [branchesRes, trendRes, categoryRes, branchMarginRes, skuRes] = await Promise.all([
        db.execute(sql`
          SELECT id, name FROM branches WHERE tenant_id = ${tenantId} ORDER BY name ASC
        `),
        db.execute(sql`
          SELECT
            TO_CHAR(DATE(o.created_at), 'YYYY-MM-DD') AS period,
            COALESCE(SUM(oi.subtotal), 0)::float AS revenue,
            COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0)::float AS cogs,
            COALESCE(SUM(oi.subtotal - (oi.quantity * COALESCE(p.cost_price, 0))), 0)::float AS "grossProfit"
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          LEFT JOIN products p ON p.id = oi.product_id AND p.tenant_id = o.tenant_id
          WHERE o.tenant_id = ${tenantId}
            AND LOWER(COALESCE(o.status, 'completed')) NOT IN ('cancelled', 'refunded')
            AND o.created_at >= ${startTs}::timestamp
            AND o.created_at <= ${endTs}::timestamp
            ${hasBranch ? sql`AND o.branch_id = ${branchId}` : sql``}
          GROUP BY DATE(o.created_at)
          ORDER BY DATE(o.created_at) ASC
        `),
        db.execute(sql`
          SELECT
            COALESCE(NULLIF(TRIM(c.name), ''), 'General Merchandise') AS category,
            COALESCE(SUM(oi.quantity), 0)::int AS "unitsSold",
            COALESCE(SUM(oi.subtotal), 0)::float AS revenue,
            COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0)::float AS cogs
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          LEFT JOIN products p ON p.id = oi.product_id AND p.tenant_id = o.tenant_id
          LEFT JOIN categories c ON c.id = p.category_id AND c.tenant_id = o.tenant_id
          WHERE o.tenant_id = ${tenantId}
            AND LOWER(COALESCE(o.status, 'completed')) NOT IN ('cancelled', 'refunded')
            AND o.created_at >= ${startTs}::timestamp
            AND o.created_at <= ${endTs}::timestamp
            ${hasBranch ? sql`AND o.branch_id = ${branchId}` : sql``}
          GROUP BY COALESCE(NULLIF(TRIM(c.name), ''), 'General Merchandise')
          ORDER BY revenue DESC
          LIMIT 10
        `),
        db.execute(sql`
          SELECT
            COALESCE(b.name, 'Main Branch') AS "branchName",
            COALESCE(SUM(oi.subtotal), 0)::float AS revenue,
            COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0)::float AS cogs
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          LEFT JOIN branches b ON b.id = o.branch_id AND b.tenant_id = o.tenant_id
          LEFT JOIN products p ON p.id = oi.product_id AND p.tenant_id = o.tenant_id
          WHERE o.tenant_id = ${tenantId}
            AND LOWER(COALESCE(o.status, 'completed')) NOT IN ('cancelled', 'refunded')
            AND o.created_at >= ${startTs}::timestamp
            AND o.created_at <= ${endTs}::timestamp
            ${hasBranch ? sql`AND o.branch_id = ${branchId}` : sql``}
          GROUP BY b.name
          ORDER BY revenue DESC
          LIMIT 8
        `),
        db.execute(sql`
          SELECT
            p.id AS "productId",
            COALESCE(p.name, 'SKU Item') AS "productName",
            COALESCE(p.sku, 'N/A') AS sku,
            COALESCE(NULLIF(TRIM(c.name), ''), 'General Merchandise') AS category,
            COALESCE(p.cost_price, 0)::float AS "unitCost",
            COALESCE(p.selling_price, 0)::float AS "unitPrice",
            COALESCE(SUM(oi.quantity), 0)::int AS "unitsSold",
            COALESCE(SUM(oi.subtotal), 0)::float AS revenue,
            COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0)::float AS cogs
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          INNER JOIN products p ON p.id = oi.product_id AND p.tenant_id = o.tenant_id
          LEFT JOIN categories c ON c.id = p.category_id AND c.tenant_id = o.tenant_id
          WHERE o.tenant_id = ${tenantId}
            AND LOWER(COALESCE(o.status, 'completed')) NOT IN ('cancelled', 'refunded')
            AND o.created_at >= ${startTs}::timestamp
            AND o.created_at <= ${endTs}::timestamp
            ${hasBranch ? sql`AND o.branch_id = ${branchId}` : sql``}
          GROUP BY p.id, p.name, p.sku, c.name, p.cost_price, p.selling_price
          ORDER BY revenue DESC
          LIMIT 100
        `),
      ]);

      const skuMargins = rowsOf(skuRes).map((s: any) => {
        const rev = Number(s.revenue || 0);
        const cogs = Number(s.cogs || 0);
        const profit = Number((rev - cogs).toFixed(2));
        const marginPct = rev > 0 ? Number(((profit / rev) * 100).toFixed(1)) : 0;
        return { ...s, grossProfit: profit, marginPct };
      });

      const categoryMargins = rowsOf(categoryRes).map((c: any) => {
        const rev = Number(c.revenue || 0);
        const cogs = Number(c.cogs || 0);
        const profit = Number((rev - cogs).toFixed(2));
        const marginPct = rev > 0 ? Number(((profit / rev) * 100).toFixed(1)) : 0;
        return { ...c, grossProfit: profit, marginPct };
      });

      const branchMargins = rowsOf(branchMarginRes).map((b: any) => {
        const rev = Number(b.revenue || 0);
        const cogs = Number(b.cogs || 0);
        const profit = Number((rev - cogs).toFixed(2));
        const marginPct = rev > 0 ? Number(((profit / rev) * 100).toFixed(1)) : 0;
        return { ...b, grossProfit: profit, marginPct };
      });

      const totalRevenue = skuMargins.reduce((acc, s) => acc + Number(s.revenue || 0), 0);
      const totalCogs = skuMargins.reduce((acc, s) => acc + Number(s.cogs || 0), 0);
      const grossProfit = Number((totalRevenue - totalCogs).toFixed(2));
      const blendedMarginPct = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;
      const lowMarginSkuCount = skuMargins.filter((s) => s.marginPct < 15).length;

      return res.status(200).json({
        success: true,
        data: {
          branches: rowsOf(branchesRes),
          kpis: {
            totalRevenue,
            totalCogs,
            grossProfit,
            blendedMarginPct,
            lowMarginSkuCount,
            trackedSkuCount: skuMargins.length,
          },
          trend: rowsOf(trendRes),
          categoryMargins,
          branchMargins,
          skuMargins,
        },
      });
    } catch (error: any) {
      console.error('[ANALYTICS MARGINS ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to compute margin intelligence',
      });
    }
  }

  // PATCH /api/v1/analytics/margins/sku/:productId
  static async updateSkuPricing(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const productId = String(req.params.productId);
      const costPrice = Number(req.body?.costPrice);
      const sellingPrice = Number(req.body?.sellingPrice);

      if (!Number.isFinite(costPrice) || costPrice < 0 || !Number.isFinite(sellingPrice) || sellingPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Enter valid non-negative cost price and positive selling price.',
        });
      }

      const updRes = await db.execute(sql`
        UPDATE products
        SET cost_price = ${costPrice.toFixed(2)},
            selling_price = ${sellingPrice.toFixed(2)},
            updated_at = NOW()
        WHERE id = ${productId} AND tenant_id = ${tenantId}
        RETURNING id, name, cost_price::float AS "costPrice", selling_price::float AS "sellingPrice"
      `);

      const updated = rowsOf(updRes)[0];
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Product not found in tenant catalog.' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[ANALYTICS SKU PRICING ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to update SKU pricing',
      });
    }
  }

  // =========================================================================
  // INVENTORY VALUATION & DEPLETION ANALYSIS (/api/v1/analytics/inventory)
  // =========================================================================
  static async getInventoryAnalytics(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const startDate = String(req.query.startDate || '').slice(0, 10);
      const endDate = String(req.query.endDate || '').slice(0, 10);
      const categoryFilter = String(req.query.category || 'ALL');
      const hasDates = Boolean(startDate && endDate);

      const [branchesRes, categoriesRes, productsRes] = await Promise.all([
        db.execute(sql`
          SELECT id, name FROM branches WHERE tenant_id = ${tenantId} ORDER BY name ASC
        `),
        db.execute(sql`
          SELECT id, name FROM categories WHERE tenant_id = ${tenantId} ORDER BY name ASC
        `),
        db.execute(sql`
          SELECT
            p.id,
            p.name,
            COALESCE(NULLIF(TRIM(p.sku), ''), 'N/A') AS sku,
            COALESCE(NULLIF(TRIM(c.name), ''), 'General Merchandise') AS category,
            COALESCE(p.reorder_level, 0)::float AS "physicalStock",
            COALESCE(p.minimum_stock, 0)::float AS "parMin",
            COALESCE(p.cost_price, 0)::float AS "unitCost",
            COALESCE(p.selling_price, 0)::float AS "sellingPrice",
            COALESCE(NULLIF(TRIM(p.unit), ''), 'pcs') AS "baseUnit"
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id AND c.tenant_id = p.tenant_id
          WHERE p.tenant_id = ${tenantId}
          ORDER BY (COALESCE(p.reorder_level, 0) * COALESCE(p.cost_price, 0)) DESC, p.name ASC
        `),
      ]);

      // Optional Wastage / Spoilage table lookup (safe if table not yet populated)
      let wasteLoss = 0;
      let wasteCount = 0;
      try {
        const wTableRes = await db.execute(sql`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name IN ('wastage_logs', 'stock_wastage', 'wastage')
          LIMIT 1
        `);
        const wTable = rowsOf(wTableRes)[0]?.table_name;
        if (wTable) {
          const wRes = await db.execute(sql`
            SELECT COUNT(*)::int AS cnt,
                   COALESCE(SUM(COALESCE(total_cost, cost_loss, amount, 0)), 0)::float AS loss
            FROM ${sql.raw(wTable)}
            WHERE tenant_id = ${tenantId}
              ${hasDates ? sql`AND created_at >= ${`${startDate} 00:00:00`}::timestamp AND created_at <= ${`${endDate} 23:59:59`}::timestamp` : sql``}
          `);
          wasteCount = rowsOf(wRes)[0]?.cnt || 0;
          wasteLoss = Number(rowsOf(wRes)[0]?.loss || 0);
        }
      } catch {
        // Ignore if wastage table has different schema
      }

      // Optional Batch Expiry Radar lookup (safe if expiry_date exists on products or batches)
      let expiringBatches: any[] = [];
      try {
        const expColRes = await db.execute(sql`
          SELECT table_name, column_name FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name IN ('inventory_batches', 'product_batches', 'products')
            AND column_name IN ('expiry_date', 'expires_at')
          LIMIT 1
        `);
        const expMeta = rowsOf(expColRes)[0];
        if (expMeta && expMeta.table_name === 'products') {
          const eRes = await db.execute(sql`
            SELECT id,
                   name,
                   COALESCE(sku, 'LOT-N/A') AS "lotRef",
                   COALESCE(reorder_level, 0)::float AS qty,
                   (COALESCE(reorder_level, 0) * COALESCE(cost_price, 0))::float AS "bookValue",
                   (${sql.raw(expMeta.column_name)}::date - CURRENT_DATE)::int AS "daysLeft"
            FROM products
            WHERE tenant_id = ${tenantId}
              AND ${sql.raw(expMeta.column_name)} IS NOT NULL
              AND ${sql.raw(expMeta.column_name)}::date <= (CURRENT_DATE + INTERVAL '30 days')
            ORDER BY ${sql.raw(expMeta.column_name)} ASC
            LIMIT 12
          `);
          expiringBatches = rowsOf(eRes);
        }
      } catch {
        // Ignore if no expiry column exists
      }

      let allItems = rowsOf(productsRes).map((p: any) => {
        const stock = Number(p.physicalStock || 0);
        const parMin = Number(p.parMin || 0);
        const unitCost = Number(p.unitCost || 0);
        const bookValue = Number((stock * unitCost).toFixed(2));
        const status = stock <= 0 ? 'DEPLETED' : stock <= parMin ? 'REORDER' : 'ADEQUATE';
        return {
          ...p,
          physicalStock: stock,
          parMin,
          unitCost,
          bookValue,
          status,
        };
      });

      if (categoryFilter !== 'ALL') {
        allItems = allItems.filter((i) => i.category.toLowerCase() === categoryFilter.toLowerCase());
      }

      const totalAssetValuation = Number(
        allItems.reduce((acc, i) => acc + Number(i.bookValue || 0), 0).toFixed(2)
      );
      const depletedCount = allItems.filter((i) => i.status === 'DEPLETED').length;
      const reorderCount = allItems.filter((i) => i.status === 'REORDER').length;
      const adequateCount = allItems.filter((i) => i.status === 'ADEQUATE').length;

      // Capitalization by Category
      const catMap = new Map<string, { category: string; skuCount: number; totalUnits: number; totalValue: number }>();
      for (const item of allItems) {
        const curr = catMap.get(item.category) || {
          category: item.category,
          skuCount: 0,
          totalUnits: 0,
          totalValue: 0,
        };
        curr.skuCount += 1;
        curr.totalUnits += Number(item.physicalStock || 0);
        curr.totalValue = Number((curr.totalValue + Number(item.bookValue || 0)).toFixed(2));
        catMap.set(item.category, curr);
      }
      const capitalizationByCategory = Array.from(catMap.values()).sort((a, b) => b.totalValue - a.totalValue);

      return res.status(200).json({
        success: true,
        data: {
          branches: rowsOf(branchesRes),
          categories: rowsOf(categoriesRes),
          kpis: {
            totalAssetValuation,
            totalSkus: allItems.length,
            depletedCount,
            reorderCount,
            adequateCount,
            wasteLoss,
            wasteCount,
          },
          expiringBatches,
          capitalizationByCategory,
          items: allItems,
        },
      });
    } catch (error: any) {
      console.error('[ANALYTICS INVENTORY ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to load inventory valuation analysis',
      });
    }
  }

  // PATCH /api/v1/analytics/inventory/:productId (Bidirectional Stock & Par Min Sync)
  static async adjustInventoryStock(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const productId = String(req.params.productId);
      const physicalStock = Number(req.body?.physicalStock);
      const parMin = Number(req.body?.parMin);

      if (!Number.isFinite(physicalStock) || physicalStock < 0 || !Number.isFinite(parMin) || parMin < 0) {
        return res.status(400).json({
          success: false,
          message: 'Enter valid non-negative stock count and par minimum threshold.',
        });
      }

      const updRes = await db.execute(sql`
        UPDATE products
        SET reorder_level = ${Math.round(physicalStock)},
            minimum_stock = ${Math.round(parMin)},
            updated_at = NOW()
        WHERE id = ${productId} AND tenant_id = ${tenantId}
        RETURNING id, name, reorder_level::int AS "physicalStock", minimum_stock::int AS "parMin"
      `);

      const updated = rowsOf(updRes)[0];
      if (!updated) {
        return res.status(404).json({ success: false, message: 'SKU not found in tenant catalog.' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[ANALYTICS INVENTORY ADJUST ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to adjust stock level',
      });
    }
  }
}