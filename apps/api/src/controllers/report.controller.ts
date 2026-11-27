import { Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export const getSalesOverview = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const startDate = String(req.query.startDate || todayStr).slice(0, 10);
    const endDate = String(req.query.endDate || todayStr).slice(0, 10);
    const branchId = String(req.query.branchId || 'ALL');

    const startTs = `${startDate} 00:00:00`;
    const endTs = `${endDate} 23:59:59`;
    const hasBranch = branchId !== 'ALL' && branchId.trim() !== '';

    const [
      branchesRes,
      kpiRes,
      trendRes,
      branchRankRes,
      tenderRes,
      categoryRes,
      topProductsRes,
    ] = await Promise.all([
      // 1. All tenant branches for selector
      db.execute(sql`
        SELECT id, name
        FROM branches
        WHERE tenant_id = ${tenantId}
        ORDER BY name ASC
      `),

      // 2. Summary KPIs
      db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded') THEN total ELSE 0 END), 0)::float AS "grossSales",
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded') THEN subtotal ELSE 0 END), 0)::float AS "netSales",
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded') THEN tax ELSE 0 END), 0)::float AS "totalTax",
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'completed')) IN ('cancelled', 'refunded') THEN total ELSE 0 END), 0)::float AS "voidedAmount",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, 'completed')) IN ('cancelled', 'refunded'))::int AS "voidedCount",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded'))::int AS "fulfilledOrders",
          COUNT(*)::int AS "totalOrders",
          COUNT(DISTINCT branch_id)::int AS "activeBranches"
        FROM orders
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${startTs}::timestamp
          AND created_at <= ${endTs}::timestamp
          ${hasBranch ? sql`AND branch_id = ${branchId}` : sql``}
      `),

      // 3. Daily trend & periodic timeline
      db.execute(sql`
        SELECT
          TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS period,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded'))::int AS "orderVolume",
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded') THEN subtotal ELSE 0 END), 0)::float AS "netSales",
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded') THEN tax ELSE 0 END), 0)::float AS "statutoryTax",
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded') THEN total ELSE 0 END), 0)::float AS "grossCollections"
        FROM orders
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${startTs}::timestamp
          AND created_at <= ${endTs}::timestamp
          ${hasBranch ? sql`AND branch_id = ${branchId}` : sql``}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `),

      // 4. Top Branches by Sales
      db.execute(sql`
        SELECT
          COALESCE(b.name, 'Main Branch') AS "branchName",
          COUNT(o.id)::int AS "orderCount",
          COALESCE(SUM(o.total), 0)::float AS revenue
        FROM orders o
        LEFT JOIN branches b ON b.id = o.branch_id AND b.tenant_id = o.tenant_id
        WHERE o.tenant_id = ${tenantId}
          AND LOWER(COALESCE(o.status, 'completed')) NOT IN ('cancelled', 'refunded')
          AND o.created_at >= ${startTs}::timestamp
          AND o.created_at <= ${endTs}::timestamp
          ${hasBranch ? sql`AND o.branch_id = ${branchId}` : sql``}
        GROUP BY b.name
        ORDER BY revenue DESC
        LIMIT 8
      `),

      // 5. Sales by Payment Method
      db.execute(sql`
        SELECT
          UPPER(COALESCE(NULLIF(TRIM(payment_method), ''), 'CASH')) AS method,
          COUNT(*)::int AS count,
          COALESCE(SUM(total), 0)::float AS total
        FROM orders
        WHERE tenant_id = ${tenantId}
          AND LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded')
          AND created_at >= ${startTs}::timestamp
          AND created_at <= ${endTs}::timestamp
          ${hasBranch ? sql`AND branch_id = ${branchId}` : sql``}
        GROUP BY UPPER(COALESCE(NULLIF(TRIM(payment_method), ''), 'CASH'))
        ORDER BY total DESC
      `),

      // 6. Sales by Product Category
      db.execute(sql`
        SELECT
          COALESCE(NULLIF(TRIM(c.name), ''), 'General Merchandise') AS category,
          COALESCE(SUM(oi.quantity), 0)::int AS "unitsSold",
          COALESCE(SUM(oi.subtotal), 0)::float AS revenue
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
        LIMIT 8
      `),

      // 7. Top Product Sales Velocity
      db.execute(sql`
        SELECT
          COALESCE(p.name, 'SKU Item') AS "itemName",
          COALESCE(p.sku, '') AS sku,
          COALESCE(SUM(oi.quantity), 0)::int AS "unitsSold",
          COALESCE(SUM(oi.subtotal), 0)::float AS "grossRevenue"
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        LEFT JOIN products p ON p.id = oi.product_id AND p.tenant_id = o.tenant_id
        WHERE o.tenant_id = ${tenantId}
          AND LOWER(COALESCE(o.status, 'completed')) NOT IN ('cancelled', 'refunded')
          AND o.created_at >= ${startTs}::timestamp
          AND o.created_at <= ${endTs}::timestamp
          ${hasBranch ? sql`AND o.branch_id = ${branchId}` : sql``}
        GROUP BY p.id, p.name, p.sku
        ORDER BY "grossRevenue" DESC
        LIMIT 15
      `),
    ]);

    const kpi = rowsOf(kpiRes)[0] || {
      grossSales: 0,
      netSales: 0,
      totalTax: 0,
      voidedAmount: 0,
      voidedCount: 0,
      fulfilledOrders: 0,
      totalOrders: 0,
      activeBranches: 0,
    };

    const avgOrderValue = kpi.fulfilledOrders > 0 ? Number((kpi.grossSales / kpi.fulfilledOrders).toFixed(2)) : 0;
    const avgSalesByBranch = kpi.activeBranches > 0 ? Number((kpi.grossSales / kpi.activeBranches).toFixed(2)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        branches: rowsOf(branchesRes),
        kpis: {
          ...kpi,
          avgOrderValue,
          avgSalesByBranch,
        },
        trend: rowsOf(trendRes),
        topBranches: rowsOf(branchRankRes),
        paymentMix: rowsOf(tenderRes),
        categorySales: rowsOf(categoryRes),
        topProducts: rowsOf(topProductsRes),
      },
    });
  } catch (error: any) {
    console.error('[REPORTS SALES OVERVIEW ERROR]', error);
    return res.status(500).json({
      success: false,
      message: error?.cause?.message || error?.message || 'Failed to load sales overview',
    });
  }
};

export const exportTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const startDate = String(req.query.startDate || '').slice(0, 10);
    const endDate = String(req.query.endDate || '').slice(0, 10);
    const branchId = String(req.query.branchId || 'ALL');
    const hasDates = Boolean(startDate && endDate);
    const hasBranch = branchId !== 'ALL' && branchId.trim() !== '';

    const result = await db.execute(sql`
      SELECT o.order_number AS "orderNum",
             TO_CHAR(o.created_at, 'YYYY-MM-DD HH24:MI') AS date,
             COALESCE(b.name, 'Main Branch') AS branch,
             COALESCE(NULLIF(TRIM(o.customer_name), ''), 'Walk-in Customer') AS customer,
             UPPER(COALESCE(o.payment_method, 'CASH')) AS method,
             UPPER(COALESCE(o.status, 'COMPLETED')) AS status,
             COALESCE(o.subtotal, 0)::float AS subtotal,
             COALESCE(o.tax, 0)::float AS tax,
             COALESCE(o.total, 0)::float AS total
      FROM orders o
      LEFT JOIN branches b ON b.id = o.branch_id AND b.tenant_id = o.tenant_id
      WHERE o.tenant_id = ${tenantId}
        ${hasDates ? sql`AND o.created_at >= ${`${startDate} 00:00:00`}::timestamp AND o.created_at <= ${`${endDate} 23:59:59`}::timestamp` : sql``}
        ${hasBranch ? sql`AND o.branch_id = ${branchId}` : sql``}
      ORDER BY o.created_at DESC
    `);

    const rows = rowsOf(result);
    const headers = ['Order Number', 'Date', 'Branch', 'Customer', 'Tender', 'Status', 'Net Sales (KES)', 'VAT (KES)', 'Total (KES)'];
    const csvLines = [
      headers.join(','),
      ...rows.map((r: any) =>
        [
          r.orderNum,
          r.date,
          r.branch,
          r.customer,
          r.method,
          r.status,
          Number(r.subtotal || 0).toFixed(2),
          Number(r.tax || 0).toFixed(2),
          Number(r.total || 0).toFixed(2),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=SokoPoint-Sales-${startDate || 'all'}-to-${endDate || 'all'}.csv`);
    return res.status(200).send(csvLines);
  } catch (error: any) {
    console.error('[REPORTS EXPORT ERROR]', error);
    return res.status(500).json({
      success: false,
      message: error?.cause?.message || error?.message || 'Failed to export sales report',
    });
  }
};