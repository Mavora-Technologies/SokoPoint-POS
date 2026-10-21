export interface AuditLogPayload {
  tenantId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export class AuditLogger {
  async log(payload: AuditLogPayload): Promise<void> {
    console.log(
      `[AUDIT LOG] [${new Date().toISOString()}] Tenant: ${payload.tenantId} | User: ${payload.userId} | Action: ${payload.action} | Entity: ${payload.entity} (${payload.entityId}) - ${payload.details}`
    );
  }
}

export const auditLogger = new AuditLogger();