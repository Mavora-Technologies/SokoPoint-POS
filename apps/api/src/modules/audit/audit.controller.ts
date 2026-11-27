import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string; name?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string; name?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

const getTenantId = (req: AuthRequest): string | null =>
  req.auth?.tenantId || req.user?.tenantId || (req.headers['x-tenant-id'] as string) || null;

export interface AuditChangeDiff {
  attribute: string;
  previousValue: unknown;
  newValue: unknown;
}

/**
 * Reusable helper for any controller to record real, tenant-isolated audit events.
 */
export async function recordAuditLog(params: {
  tenantId: string;
  branchId?: string | null;
  module: 'POS' | 'INVENTORY' | 'FINANCE' | 'PAYMENTS' | 'SETTINGS' | 'AUTH' | string;
  action: string;
  entityTable: string;
  entityId: string | number;
  actorName?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null;
  endpointNarrative?: string | null;
  changes?: AuditChangeDiff[];
}) {
  try {
    const safeModule = String(params.module || 'POS').toUpperCase();
    const safeAction = String(params.action || 'SYSTEM_MUTATION').toUpperCase();
    const safeTable = String(params.entityTable || 'records');
    const safeEntityId = String(params.entityId ?? '');
    const safeActorName = String(params.actorName || params.actorEmail || 'Operator').trim();
    const safeActorEmail = params.actorEmail ? String(params.actorEmail).trim() : null;
    const safeRole = String(params.actorRole || 'USER').toUpperCase();
    const safeIp = params.ipAddress ? String(params.ipAddress).trim() : null;
    const safeNarrative = params.endpointNarrative ? String(params.endpointNarrative).trim() : null;
    const changesJson = JSON.stringify(Array.isArray(params.changes) ? params.changes : []);

    await db.execute(sql`
      INSERT INTO audit_logs (
        tenant_id, branch_id, module, action, entity_table, entity_id,
        actor_name, actor_email, actor_role, ip_address, endpoint_narrative, changes
      )
      VALUES (
        ${params.tenantId},
        ${params.branchId || null},
        ${safeModule},
        ${safeAction},
        ${safeTable},
        ${safeEntityId},
        ${safeActorName},
        ${safeActorEmail},
        ${safeRole},
        ${safeIp},
        ${safeNarrative},
        ${changesJson}::jsonb
      )
    `);
  } catch (err) {
    console.warn('[AUDIT LOG WRITE WARNING]', err);
  }
}

export class AuditController {
  // GET /api/v1/audit/logs
  static async getLogs(req: AuthRequest, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const [logsRes, statsRes] = await Promise.all([
        db.execute(sql`
          SELECT a.id,
                 a.audit_seq::int AS "auditSeq",
                 a.module,
                 a.action,
                 a.entity_table AS "entityTable",
                 a.entity_id AS "entityId",
                 a.actor_name AS "actorName",
                 COALESCE(a.actor_email, '') AS "actorEmail",
                 COALESCE(a.actor_role, 'ADMIN') AS "actorRole",
                 COALESCE(b.name, '') AS "branchName",
                 COALESCE(a.ip_address, '') AS "ipAddress",
                 COALESCE(a.endpoint_narrative, '') AS "endpointNarrative",
                 COALESCE(a.changes, '[]'::jsonb) AS changes,
                 a.created_at AS "createdAt"
          FROM audit_logs a
          LEFT JOIN branches b ON b.id = a.branch_id AND b.tenant_id = a.tenant_id
          WHERE a.tenant_id = ${tenantId}
          ORDER BY a.created_at DESC, a.audit_seq DESC
          LIMIT 300
        `),
        db.execute(sql`
          SELECT
            COUNT(*)::int AS "totalEvents",
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS "events24h",
            COUNT(DISTINCT COALESCE(NULLIF(TRIM(actor_email), ''), actor_name))::int AS "activeOperators",
            MODE() WITHIN GROUP (ORDER BY module) AS "primaryModule"
          FROM audit_logs
          WHERE tenant_id = ${tenantId}
        `),
      ]);

      const logs = rowsOf(logsRes);
      const rawStats = rowsOf(statsRes)[0] || {};

      return res.status(200).json({
        success: true,
        data: {
          kpis: {
            totalEvents: Number(rawStats.totalEvents || 0),
            events24h: Number(rawStats.events24h || 0),
            activeOperators: Number(rawStats.activeOperators || 0),
            primaryModule: rawStats.primaryModule || 'POS',
          },
          logs,
        },
      });
    } catch (error: any) {
      console.error('[AUDIT LOGS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to load audit logs',
      });
    }
  }

  // GET /api/v1/audit/export?format=csv|json
  static async exportLogs(req: AuthRequest, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const format = String(req.query.format || 'csv').toLowerCase();
      const result = await db.execute(sql`
        SELECT a.audit_seq::int AS "auditSeq",
               a.created_at AS "timestamp",
               a.module,
               a.action,
               a.entity_table AS "entityTable",
               a.entity_id AS "entityId",
               a.actor_name AS "actorName",
               COALESCE(a.actor_email, '') AS "actorEmail",
               COALESCE(a.actor_role, 'ADMIN') AS "actorRole",
               COALESCE(b.name, 'Tenant-Wide') AS "branchName",
               COALESCE(a.ip_address, '') AS "ipAddress",
               COALESCE(a.endpoint_narrative, '') AS "endpointNarrative",
               COALESCE(a.changes, '[]'::jsonb) AS changes
        FROM audit_logs a
        LEFT JOIN branches b ON b.id = a.branch_id AND b.tenant_id = a.tenant_id
        WHERE a.tenant_id = ${tenantId}
        ORDER BY a.created_at DESC, a.audit_seq DESC
        LIMIT 1000
      `);

      const rows = rowsOf(result);

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="SokoPoint-Audit-Log-${new Date().toISOString().slice(0, 10)}.json"`);
        return res.status(200).send(JSON.stringify(rows, null, 2));
      }

      const headers = [
        'Seq',
        'Timestamp',
        'Module',
        'Action',
        'Entity Target',
        'Actor Name',
        'Actor Email',
        'Role',
        'Branch',
        'IP Address',
        'Narrative / Endpoint',
      ];
      const csvLines = [
        headers.join(','),
        ...rows.map((r: any) =>
          [
            r.auditSeq,
            new Date(r.timestamp).toISOString(),
            r.module,
            r.action,
            `${r.entityTable}: ${r.entityId}`,
            r.actorName,
            r.actorEmail,
            r.actorRole,
            r.branchName,
            r.ipAddress,
            r.endpointNarrative,
          ]
            .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="SokoPoint-Audit-Log-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.status(200).send(csvLines);
    } catch (error: any) {
      console.error('[AUDIT EXPORT ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to export audit logs',
      });
    }
  }
}