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

      await db.execute(sql`
        INSERT INTO ai_advisory_messages (tenant_id, session_id, role, content)
        VALUES (${tenantId}, ${activeSessionId}, 'user', ${cleanPrompt})
      `);

      const telemetry = await fetchLiveTenantTelemetry(tenantId);
      const replyContent = buildDataGroundedReply(String(domain), cleanPrompt, telemetry);

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

  // =========================================================================
  // PREDICTIVE DEMAND & WORKFORCE CAPACITY PLANNING (/api/v1/ai/forecasting)
  // =========================================================================
  static async getForecasting(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const horizonDays = Math.min(30, Math.max(7, Number(req.query.horizon) || 7));
      const branchId = String(req.query.branchId || 'ALL');
      const hasBranch = branchId !== 'ALL' && branchId.trim() !== '';

      const [branchesRes, settingsRes, historyRes, dailyRes, skuVelocityRes] = await Promise.all([
        db.execute(sql`
          SELECT id, name FROM branches WHERE tenant_id = ${tenantId} ORDER BY name ASC
        `),
        db.execute(sql`
          SELECT target_labor_ratio::float AS "targetLaborRatio",
                 avg_hourly_wage::float AS "avgHourlyWage",
                 default_horizon_days::int AS "defaultHorizonDays"
          FROM ai_forecast_settings
          WHERE tenant_id = ${tenantId}
          LIMIT 1
        `),
        db.execute(sql`
          SELECT
            COUNT(*)::int AS "totalOrders",
            COUNT(*) FILTER (WHERE LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded'))::int AS "validOrders",
            COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded') THEN total ELSE 0 END), 0)::float AS "totalRevenue"
          FROM orders
          WHERE tenant_id = ${tenantId}
            ${hasBranch ? sql`AND branch_id = ${branchId}` : sql``}
        `),
        db.execute(sql`
          SELECT
            TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day,
            EXTRACT(DOW FROM created_at)::int AS dow,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded'))::int AS orders,
            COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'completed')) NOT IN ('cancelled', 'refunded') THEN total ELSE 0 END), 0)::float AS revenue
          FROM orders
          WHERE tenant_id = ${tenantId}
            AND created_at >= NOW() - INTERVAL '30 days'
            ${hasBranch ? sql`AND branch_id = ${branchId}` : sql``}
          GROUP BY DATE(created_at), EXTRACT(DOW FROM created_at)
          ORDER BY DATE(created_at) ASC
        `),
        db.execute(sql`
          SELECT
            p.id,
            p.name,
            COALESCE(p.sku, 'N/A') AS sku,
            COALESCE(p.reorder_level, 0)::float AS "currentStock",
            COALESCE(SUM(oi.quantity), 0)::float AS "unitsSold30d"
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          INNER JOIN products p ON p.id = oi.product_id AND p.tenant_id = o.tenant_id
          WHERE o.tenant_id = ${tenantId}
            AND o.created_at >= NOW() - INTERVAL '30 days'
            AND LOWER(COALESCE(o.status, 'completed')) NOT IN ('cancelled', 'refunded')
            ${hasBranch ? sql`AND o.branch_id = ${branchId}` : sql``}
          GROUP BY p.id, p.name, p.sku, p.reorder_level
          ORDER BY "unitsSold30d" DESC
          LIMIT 10
        `),
      ]);

      const settings = rowsOf(settingsRes)[0] || {
        targetLaborRatio: 12,
        avgHourlyWage: 250,
        defaultHorizonDays: 7,
      };

      const history = rowsOf(historyRes)[0] || { totalOrders: 0, validOrders: 0, totalRevenue: 0 };
      const dailyRows = rowsOf(dailyRes);

      if (history.totalOrders === 0) {
        return res.status(200).json({
          success: true,
          data: {
            branches: rowsOf(branchesRes),
            settings,
            recordedOrders: 0,
            horizonDays,
            kpis: {
              projectedSales: 0,
              projectedTransactions: 0,
              laborBudgetCeiling: 0,
              optimalLaborHours: 0,
            },
            dailyForecast: [],
            restockForecast: [],
          },
        });
      }

      const activeDays = Math.max(1, dailyRows.length);
      const sumRev30 = dailyRows.reduce((a, r) => a + Number(r.revenue || 0), 0);
      const sumOrd30 = dailyRows.reduce((a, r) => a + Number(r.orders || 0), 0);
      const baseDailyRev = sumRev30 > 0 ? sumRev30 / activeDays : history.totalRevenue / 30;
      const baseDailyOrd = sumOrd30 > 0 ? sumOrd30 / activeDays : history.validOrders / 30;

      const dowBuckets = new Map<number, { rev: number; ord: number; cnt: number }>();
      for (const r of dailyRows) {
        const curr = dowBuckets.get(r.dow) || { rev: 0, ord: 0, cnt: 0 };
        curr.rev += Number(r.revenue || 0);
        curr.ord += Number(r.orders || 0);
        curr.cnt += 1;
        dowBuckets.set(r.dow, curr);
      }

      const dailyForecast: any[] = [];
      let projectedSales = 0;
      let projectedTransactions = 0;
      const today = new Date();

      for (let i = 1; i <= horizonDays; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dow = d.getDay();
        const bucket = dowBuckets.get(dow);

        const dayRev = bucket && bucket.cnt > 0 ? bucket.rev / bucket.cnt : baseDailyRev;
        const dayOrd = bucket && bucket.cnt > 0 ? bucket.ord / bucket.cnt : baseDailyOrd;
        const dayLaborBudget = dayRev * (Number(settings.targetLaborRatio) / 100);
        const dayHours = settings.avgHourlyWage > 0 ? Math.round(dayLaborBudget / settings.avgHourlyWage) : 0;

        projectedSales += dayRev;
        projectedTransactions += dayOrd;

        dailyForecast.push({
          date: d.toISOString().slice(0, 10),
          dayLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          projectedRevenue: Number(dayRev.toFixed(2)),
          projectedOrders: Math.max(1, Math.round(dayOrd)),
          recommendedHours: dayHours,
        });
      }

      const laborBudgetCeiling = Number((projectedSales * (Number(settings.targetLaborRatio) / 100)).toFixed(2));
      const optimalLaborHours =
        settings.avgHourlyWage > 0 ? Math.round(laborBudgetCeiling / settings.avgHourlyWage) : 0;

      const restockForecast = rowsOf(skuVelocityRes).map((s: any) => {
        const dailyVelocity = Number(s.unitsSold30d || 0) / 30;
        const projectedDemand = Math.ceil(dailyVelocity * horizonDays);
        const currentStock = Number(s.currentStock || 0);
        const shortfall = Math.max(0, projectedDemand - currentStock);
        const daysOfCover = dailyVelocity > 0 ? Math.floor(currentStock / dailyVelocity) : 999;
        return {
          id: s.id,
          name: s.name,
          sku: s.sku,
          currentStock,
          projectedDemand,
          shortfall,
          daysOfCover,
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          branches: rowsOf(branchesRes),
          settings,
          recordedOrders: history.totalOrders,
          horizonDays,
          kpis: {
            projectedSales: Number(projectedSales.toFixed(2)),
            projectedTransactions: Math.round(projectedTransactions),
            laborBudgetCeiling,
            optimalLaborHours,
          },
          dailyForecast,
          restockForecast,
        },
      });
    } catch (error: any) {
      console.error('[AI FORECASTING ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to compute demand forecast',
      });
    }
  }

  // PUT /api/v1/ai/forecasting/settings
  static async saveForecastSettings(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const targetLaborRatio = Math.min(50, Math.max(1, Number(req.body?.targetLaborRatio) || 12));
      const avgHourlyWage = Math.max(50, Number(req.body?.avgHourlyWage) || 250);
      const defaultHorizonDays = [7, 14, 30].includes(Number(req.body?.defaultHorizonDays))
        ? Number(req.body.defaultHorizonDays)
        : 7;

      const saved = await db.execute(sql`
        INSERT INTO ai_forecast_settings (tenant_id, target_labor_ratio, avg_hourly_wage, default_horizon_days, updated_at)
        VALUES (${tenantId}, ${targetLaborRatio.toFixed(2)}, ${avgHourlyWage.toFixed(2)}, ${defaultHorizonDays}, NOW())
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          target_labor_ratio = EXCLUDED.target_labor_ratio,
          avg_hourly_wage = EXCLUDED.avg_hourly_wage,
          default_horizon_days = EXCLUDED.default_horizon_days,
          updated_at = NOW()
        RETURNING target_labor_ratio::float AS "targetLaborRatio",
                  avg_hourly_wage::float AS "avgHourlyWage",
                  default_horizon_days::int AS "defaultHorizonDays"
      `);

      return res.status(200).json({ success: true, data: rowsOf(saved)[0] });
    } catch (error: any) {
      console.error('[AI FORECAST SETTINGS ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to save forecast settings',
      });
    }
  }
}