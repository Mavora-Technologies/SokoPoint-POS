import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

const getTenantId = (req: AuthRequest): string | null =>
  req.auth?.tenantId || req.user?.tenantId || (req.headers['x-tenant-id'] as string) || null;

const getUserId = (req: AuthRequest): string | null =>
  req.auth?.userId || req.user?.userId || null;

export interface OperationalAlert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  module: 'FINANCE & TREASURY' | 'INVENTORY & STOCK' | 'POS & SALES' | 'COMPLIANCE & AUDIT';
  category: 'ACTION_ITEMS' | 'POS_FEED' | 'COMPLIANCE';
  title: string;
  refTag: string;
  message: string;
  branchName: string;
  createdAt: string;
  actionRequired: boolean;
  actionLabel: string;
  actionHref: string;
  detailsHref: string;
  isRead: boolean;
}

export class NotificationsController {
  // GET /api/v1/notifications
  static async getAlerts(req: AuthRequest, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const [shiftsRes, stockRes, treasuryRes, vouchersRes, ordersRes, ackRes] = await Promise.all([
        // 1. Cash Shift Discrepancy Escalations
        db.execute(sql`
          SELECT s.id,
                 s.shift_seq AS "shiftSeq",
                 COALESCE(s.expected_drawer, 0)::float AS "expectedDrawer",
                 COALESCE(s.physical_count, 0)::float AS "physicalCount",
                 COALESCE(s.cash_variance, 0)::float AS "cashVariance",
                 COALESCE(b.name, 'Main Branch') AS "branchName",
                 COALESCE(s.closed_at, s.opened_at) AS "eventTime"
          FROM finance_till_shifts s
          LEFT JOIN branches b ON b.id = s.branch_id AND b.tenant_id = s.tenant_id
          WHERE s.tenant_id = ${tenantId}
            AND ABS(COALESCE(s.cash_variance, 0)) > 0
          ORDER BY COALESCE(s.closed_at, s.opened_at) DESC
          LIMIT 20
        `).catch(() => ({ rows: [] })),

        // 2. Depleted & Low-Stock SKU Warnings
        db.execute(sql`
          SELECT id,
                 name,
                 COALESCE(sku, 'SKU') AS sku,
                 COALESCE(reorder_level, 0)::int AS stock,
                 COALESCE(minimum_stock, 5)::int AS "minStock",
                 COALESCE(updated_at, created_at, NOW()) AS "eventTime"
          FROM products
          WHERE tenant_id = ${tenantId}
            AND COALESCE(reorder_level, 0) <= COALESCE(minimum_stock, 5)
          ORDER BY COALESCE(reorder_level, 0) ASC
          LIMIT 25
        `).catch(() => ({ rows: [] })),

        // 3. Unreconciled Treasury / M-Pesa / Bank Payments
        db.execute(sql`
          SELECT id,
                 document_number AS "docNum",
                 counterparty_name AS counterparty,
                 clearing_channel AS channel,
                 amount::float AS amount,
                 created_at AS "eventTime"
          FROM treasury_payments
          WHERE tenant_id = ${tenantId}
            AND clearing_status = 'POSTED_UNRECONCILED'
          ORDER BY created_at DESC
          LIMIT 15
        `).catch(() => ({ rows: [] })),

        // 4. Pending Maker-Checker GL Adjustment Vouchers
        db.execute(sql`
          SELECT id,
                 voucher_number AS "voucherNum",
                 adjustment_type AS "adjType",
                 amount::float AS amount,
                 maker_name AS maker,
                 created_at AS "eventTime"
          FROM finance_adjustment_vouchers
          WHERE tenant_id = ${tenantId}
            AND UPPER(COALESCE(status, 'PENDING')) = 'PENDING'
          ORDER BY created_at DESC
          LIMIT 15
        `).catch(() => ({ rows: [] })),

        // 5. Recent POS & Wholesale Sales Activity
        db.execute(sql`
          SELECT o.id,
                 o.order_number AS "orderNum",
                 COALESCE(o.total, 0)::float AS total,
                 UPPER(COALESCE(o.payment_method, 'CASH')) AS method,
                 COALESCE(b.name, 'Main Branch') AS "branchName",
                 o.created_at AS "eventTime"
          FROM orders o
          LEFT JOIN branches b ON b.id = o.branch_id AND b.tenant_id = o.tenant_id
          WHERE o.tenant_id = ${tenantId}
          ORDER BY o.created_at DESC
          LIMIT 10
        `).catch(() => ({ rows: [] })),

        // 6. User's Persisted Acknowledgements
        userId
          ? db.execute(sql`
              SELECT alert_key AS "alertKey"
              FROM notification_acknowledgements
              WHERE tenant_id = ${tenantId} AND user_id = ${userId}
            `).catch(() => ({ rows: [] }))
          : Promise.resolve({ rows: [] }),
      ]);

      const ackSet = new Set<string>(rowsOf(ackRes).map((r: any) => String(r.alertKey)));
      const alerts: OperationalAlert[] = [];

      // Shift Discrepancies
      for (const s of rowsOf(shiftsRes)) {
        const key = `shift-drift-${s.id}`;
        const absVar = Math.abs(Number(s.cashVariance || 0));
        alerts.push({
          id: key,
          severity: absVar >= 500 ? 'CRITICAL' : 'WARNING',
          module: 'FINANCE & TREASURY',
          category: 'ACTION_ITEMS',
          title: `Cash Shift Discrepancy Escalation: Shift #${s.shiftSeq}`,
          refTag: `#${s.shiftSeq}`,
          message: `Cashier registered a variance of KES ${Math.round(s.cashVariance).toLocaleString('en-KE')} (Expected KES ${Math.round(s.expectedDrawer).toLocaleString('en-KE')}, Counted KES ${Math.round(s.physicalCount).toLocaleString('en-KE')}). Requires supervisor audit.`,
          branchName: s.branchName || 'Main Branch',
          createdAt: new Date(s.eventTime).toISOString(),
          actionRequired: true,
          actionLabel: 'Execute Action',
          actionHref: '/dashboard/tills',
          detailsHref: '/dashboard/tills',
          isRead: ackSet.has(key),
        });
      }

      // Pending Maker-Checker Vouchers
      for (const v of rowsOf(vouchersRes)) {
        const key = `voucher-pending-${v.id}`;
        alerts.push({
          id: key,
          severity: 'WARNING',
          module: 'COMPLIANCE & AUDIT',
          category: 'COMPLIANCE',
          title: `GL Adjustment Approval Required: ${v.voucherNum}`,
          refTag: v.voucherNum,
          message: `${v.maker || 'Staff'} submitted a ${v.adjType} voucher for KES ${Math.round(v.amount).toLocaleString('en-KE')}. Checker sign-off required.`,
          branchName: 'Tenant-Wide',
          createdAt: new Date(v.eventTime).toISOString(),
          actionRequired: true,
          actionLabel: 'Review Voucher',
          actionHref: '/dashboard/finance/journal',
          detailsHref: '/dashboard/finance/journal',
          isRead: ackSet.has(key),
        });
      }

      // Unreconciled Treasury Payments
      for (const t of rowsOf(treasuryRes)) {
        const key = `treasury-unrec-${t.id}`;
        alerts.push({
          id: key,
          severity: 'WARNING',
          module: 'FINANCE & TREASURY',
          category: 'ACTION_ITEMS',
          title: `Unreconciled Payment Clearing: ${t.docNum}`,
          refTag: t.docNum,
          message: `${t.channel} transaction of KES ${Math.round(t.amount).toLocaleString('en-KE')} with ${t.counterparty} awaits bank/M-Pesa reconciliation.`,
          branchName: 'Treasury Hub',
          createdAt: new Date(t.eventTime).toISOString(),
          actionRequired: true,
          actionLabel: 'Reconcile Now',
          actionHref: '/dashboard/payments',
          detailsHref: '/dashboard/payments',
          isRead: ackSet.has(key),
        });
      }

      // Low / Out-of-Stock Inventory
      for (const p of rowsOf(stockRes)) {
        const key = `stock-low-${p.id}`;
        const isOut = Number(p.stock) <= 0;
        alerts.push({
          id: key,
          severity: isOut ? 'CRITICAL' : 'WARNING',
          module: 'INVENTORY & STOCK',
          category: 'POS_FEED',
          title: isOut ? `Stockout Alert: ${p.name}` : `Low Stock Warning: ${p.name}`,
          refTag: p.sku,
          message: isOut
            ? `${p.name} (${p.sku}) is completely depleted (0 units on hand). Immediate restock required.`
            : `${p.name} (${p.sku}) is below par minimum (${p.stock} on hand vs. ${p.minStock} min threshold).`,
          branchName: 'Inventory Catalog',
          createdAt: new Date(p.eventTime).toISOString(),
          actionRequired: isOut,
          actionLabel: 'Restock SKU',
          actionHref: '/dashboard/analytics/inventory',
          detailsHref: '/dashboard/products',
          isRead: ackSet.has(key),
        });
      }

      // Recent POS Orders
      for (const o of rowsOf(ordersRes)) {
        const key = `order-done-${o.id}`;
        alerts.push({
          id: key,
          severity: 'INFO',
          module: 'POS & SALES',
          category: 'POS_FEED',
          title: `POS Order Processed: ${o.orderNum}`,
          refTag: o.orderNum,
          message: `Sale of KES ${Math.round(o.total).toLocaleString('en-KE')} settled via ${o.method}.`,
          branchName: o.branchName || 'Main Branch',
          createdAt: new Date(o.eventTime).toISOString(),
          actionRequired: false,
          actionLabel: 'View Order',
          actionHref: '/dashboard/orders',
          detailsHref: '/dashboard/orders',
          isRead: ackSet.has(key),
        });
      }

      alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const kpis = {
        actionRequired: alerts.filter((a) => a.actionRequired && !a.isRead).length,
        criticalAlerts: alerts.filter((a) => a.severity === 'CRITICAL' && !a.isRead).length,
        warnings: alerts.filter((a) => a.severity === 'WARNING' && !a.isRead).length,
        totalUnread: alerts.filter((a) => !a.isRead).length,
        totalCount: alerts.length,
      };

      return res.status(200).json({
        success: true,
        data: { kpis, alerts },
      });
    } catch (error: any) {
      console.error('[NOTIFICATIONS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to load operational alerts',
      });
    }
  }

  // POST /api/v1/notifications/acknowledge
  static async acknowledgeAlerts(req: AuthRequest, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const alertKeys: string[] = Array.isArray(req.body?.alertKeys)
        ? req.body.alertKeys.map((k: any) => String(k).trim()).filter(Boolean)
        : [];

      if (alertKeys.length === 0) {
        return res.status(400).json({ success: false, message: 'No alert keys provided.' });
      }

      for (const key of alertKeys.slice(0, 200)) {
        await db.execute(sql`
          INSERT INTO notification_acknowledgements (tenant_id, user_id, alert_key)
          VALUES (${tenantId}, ${userId}, ${key})
          ON CONFLICT (tenant_id, user_id, alert_key) DO NOTHING
        `);
      }

      return res.status(200).json({ success: true, message: 'Alerts acknowledged.' });
    } catch (error: any) {
      console.error('[NOTIFICATIONS ACK ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to acknowledge alerts',
      });
    }
  }
}