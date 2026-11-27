import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

async function fetchLiveTenantTelemetry(tenantId: string) {
  const [salesRes, stockRes, treasuryRes, shiftsRes, topSkusRes] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded'))::int AS "orderCount30d",
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded') THEN total ELSE 0 END), 0)::float AS "revenue30d",
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE AND LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded') THEN total ELSE 0 END), 0)::float AS "revenueToday",
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)::int AS "ordersToday",
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, 'completed')) IN ('cancelled', 'refunded'))::int AS "voidedCount"
      FROM orders
      WHERE tenant_id = ${tenantId}
        AND created_at >= NOW() - INTERVAL '30 days'
    `),
    db.execute(sql`
      SELECT
        COUNT(*)::int AS "totalSkus",
        COUNT(*) FILTER (WHERE COALESCE(reorder_level, 0) <= 0)::int AS "outOfStock",
        COUNT(*) FILTER (WHERE COALESCE(reorder_level, 0) > 0 AND COALESCE(reorder_level, 0) <= COALESCE(minimum_stock, 5))::int AS "lowStock",
        COALESCE(SUM(COALESCE(reorder_level, 0) * COALESCE(cost_price, 0)), 0)::float AS "inventoryValue"
      FROM products
      WHERE tenant_id = ${tenantId}
    `),
    db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN flow_direction = 'INBOUND_AR' AND clearing_status != 'REVERSED' THEN amount ELSE 0 END), 0)::float AS "inflow",
        COALESCE(SUM(CASE WHEN flow_direction = 'OUTBOUND_AP' AND clearing_status != 'REVERSED' THEN amount ELSE 0 END), 0)::float AS "outflow",
        COUNT(*) FILTER (WHERE clearing_status = 'POSTED_UNRECONCILED')::int AS "unreconciledCount"
      FROM treasury_payments
      WHERE tenant_id = ${tenantId}
    `),
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'OPEN')::int AS "openShifts",
        COALESCE(SUM(CASE WHEN status = 'CLOSED' THEN COALESCE(cash_variance, 0) ELSE 0 END), 0)::float AS "cumulativeDrift"
      FROM finance_till_shifts
      WHERE tenant_id = ${tenantId}
    `),
    db.execute(sql`
      SELECT p.name, COALESCE(SUM(oi.quantity), 0)::int AS qty, COALESCE(SUM(oi.subtotal), 0)::float AS rev
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products p ON p.id = oi.product_id AND p.tenant_id = o.tenant_id
      WHERE o.tenant_id = ${tenantId}
        AND o.created_at >= NOW() - INTERVAL '30 days'
        AND LOWER(COALESCE(o.status, 'completed')) NOT IN ('cancelled', 'refunded')
      GROUP BY p.id, p.name
      ORDER BY rev DESC
      LIMIT 3
    `),
  ]);

  return {
    sales: rowsOf(salesRes)[0] || { orderCount30d: 0, revenue30d: 0, revenueToday: 0, ordersToday: 0, voidedCount: 0 },
    stock: rowsOf(stockRes)[0] || { totalSkus: 0, outOfStock: 0, lowStock: 0, inventoryValue: 0 },
    treasury: rowsOf(treasuryRes)[0] || { inflow: 0, outflow: 0, unreconciledCount: 0 },
    shifts: rowsOf(shiftsRes)[0] || { openShifts: 0, cumulativeDrift: 0 },
    topSkus: rowsOf(topSkusRes),
  };
}

function buildDataGroundedReply(domain: string, prompt: string, t: Awaited<ReturnType<typeof fetchLiveTenantTelemetry>>): string {
  const fmt = (n: number) => `KES ${Math.round(Number(n || 0)).toLocaleString('en-KE')}`;
  const avgTicket = t.sales.orderCount30d > 0 ? t.sales.revenue30d / t.sales.orderCount30d : 0;
  const netLiquidity = t.treasury.inflow - t.treasury.outflow;
  const topList =
    t.topSkus.length > 0
      ? t.topSkus.map((s: any, i: number) => `${i + 1}. **${s.name}** (${s.qty} units — ${fmt(s.rev)})`).join('\n')
      : 'No itemized SKU sales recorded in the last 30 days.';

  const q = prompt.toLowerCase();

  if (domain === 'INVENTORY_STOCK' || q.includes('stock') || q.includes('inventory') || q.includes('restock') || q.includes('sku')) {
    return [
      `### Inventory & Restock Telemetry`,
      `- **Catalog Valuation:** ${fmt(t.stock.inventoryValue)} across **${t.stock.totalSkus} SKUs**`,
      `- **Out of Stock (Depleted):** ${t.stock.outOfStock} SKUs`,
      `- **Low Stock Warnings:** ${t.stock.lowStock} SKUs below par minimum`,
      ``,
      `**Top Moving SKUs (30 Days):**`,
      topList,
      ``,
      `**Recommended Action:** Prioritize purchase orders for the ${t.stock.outOfStock} depleted SKUs and review par levels under *Analytics › Inventory* to prevent lost retail & wholesale turnover.`,
    ].join('\n');
  }

  if (domain === 'TREASURY_MARGINS' || q.includes('treasury') || q.includes('margin') || q.includes('cash') || q.includes('drift') || q.includes('reconcil')) {
    return [
      `### Treasury, Cash Custody & Margin Brief`,
      `- **Net Treasury Liquidity:** ${fmt(netLiquidity)} (Inflow: ${fmt(t.treasury.inflow)} | Outflow: ${fmt(t.treasury.outflow)})`,
      `- **Unreconciled Payments:** ${t.treasury.unreconciledCount} pending bank/M-Pesa clearing`,
      `- **Cashier Till Custody:** ${t.shifts.openShifts} active open shift(s) | Cumulative closed drift: ${fmt(t.shifts.cumulativeDrift)}`,
      ``,
      `**Recommended Action:** Clear the ${t.treasury.unreconciledCount} unreconciled payments in *Payments › Reconciliation* and audit any shift drift exceeding KES 50 under *Finance › General Journal*.`,
    ].join('\n');
  }

  return [
    `### Live Store Operations Summary (30-Day Window)`,
    `- **Today's Turnover:** ${fmt(t.sales.revenueToday)} (${t.sales.ordersToday} orders)`,
    `- **30-Day Gross Revenue:** ${fmt(t.sales.revenue30d)} across **${t.sales.orderCount30d} orders** (Avg Ticket: ${fmt(avgTicket)})`,
    `- **Inventory Health:** ${t.stock.totalSkus} SKUs valued at ${fmt(t.stock.inventoryValue)} (${t.stock.outOfStock} out of stock, ${t.stock.lowStock} low stock)`,
    `- **Treasury Position:** ${fmt(netLiquidity)} net liquidity (${t.treasury.unreconciledCount} unreconciled items)`,
    ``,
    `**Top Performing Products:**`,
    topList,
  ].join('\n');
}

export class AiAdvisoryController {
  // GET /api/v1/ai/sessions
  static async getSessions(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const userId = req.auth?.userId || req.user?.userId || null;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const result = await db.execute(sql`
        SELECT id, domain, title, created_at AS "createdAt", updated_at AS "updatedAt"
        FROM ai_advisory_sessions
        WHERE tenant_id = ${tenantId}
          ${userId ? sql`AND (user_id = ${userId} OR user_id IS NULL)` : sql``}
        ORDER BY updated_at DESC
        LIMIT 30
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to load advisory sessions',
      });
    }
  }

  // GET /api/v1/ai/sessions/:id/messages
  static async getMessages(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const sessionId = String(req.params.id);
      const result = await db.execute(sql`
        SELECT id, role, content, created_at AS "createdAt"
        FROM ai_advisory_messages
        WHERE tenant_id = ${tenantId} AND session_id = ${sessionId}
        ORDER BY created_at ASC
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to load messages',
      });
    }
  }

  // POST /api/v1/ai/ask
  static async ask(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      const userId = req.auth?.userId || req.user?.userId || null;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { sessionId = null, domain = 'GENERAL_OPS', prompt = '' } = req.body || {};
      const cleanPrompt = String(prompt || '').trim();
      if (!cleanPrompt) {
        return res.status(400).json({ success: false, message: 'Prompt cannot be empty.' });
      }

      let activeSessionId = sessionId ? String(sessionId) : null;
      if (!activeSessionId) {
        const title = cleanPrompt.length > 52 ? `${cleanPrompt.slice(0, 52)}...` : cleanPrompt;
        const sRes = await db.execute(sql`
          INSERT INTO ai_advisory_sessions (tenant_id, user_id, domain, title)
          VALUES (${tenantId}, ${userId}, ${String(domain)}, ${title})
          RETURNING id
        `);
        activeSessionId = rowsOf(sRes)[0]?.id;
      } else {
        await db.execute(sql`
          UPDATE ai_advisory_sessions SET updated_at = NOW()
          WHERE id = ${activeSessionId} AND tenant_id = ${tenantId}
        `);
      }

      // Persist user message
      await db.execute(sql`
        INSERT INTO ai_advisory_messages (tenant_id, session_id, role, content)
        VALUES (${tenantId}, ${activeSessionId}, 'user', ${cleanPrompt})
      `);

      // Pull live tenant telemetry from PostgreSQL
      const telemetry = await fetchLiveTenantTelemetry(tenantId);
      const replyContent = buildDataGroundedReply(String(domain), cleanPrompt, telemetry);

      // Persist assistant response
      const msgRes = await db.execute(sql`
        INSERT INTO ai_advisory_messages (tenant_id, session_id, role, content)
        VALUES (${tenantId}, ${activeSessionId}, 'assistant', ${replyContent})
        RETURNING id, role, content, created_at AS "createdAt"
      `);

      return res.status(200).json({
        success: true,
        data: {
          sessionId: activeSessionId,
          message: rowsOf(msgRes)[0],
        },
      });
    } catch (error: any) {
      console.error('[AI ASK ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to process advisory inquiry',
      });
    }
  }

  // DELETE /api/v1/ai/sessions/:id
  static async deleteSession(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      await db.execute(sql`
        DELETE FROM ai_advisory_sessions
        WHERE id = ${String(req.params.id)} AND tenant_id = ${tenantId}
      `);

      return res.status(200).json({ success: true, message: 'Session deleted.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.cause?.message || error?.message });
    }
  }
}