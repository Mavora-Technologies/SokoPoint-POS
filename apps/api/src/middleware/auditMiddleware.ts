import { Request, Response, NextFunction } from 'express';
import { recordAuditLog, AuditChangeDiff } from '../modules/audit/audit.controller';

type AuthReq = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string; name?: string; branchId?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string; name?: string; branchId?: string };
};

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'apikey',
  'authorization',
  'pin',
  'cvv',
]);

function sanitizePayload(input: any, depth = 0): any {
  if (input === null || input === undefined || depth > 5) return input;
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.slice(0, 50).map((item) => sanitizePayload(item, depth + 1));
  }
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = sanitizePayload(val, depth + 1);
    }
  }
  return out;
}

function inferModuleAndEntity(path: string): { moduleName: string; entityTable: string } {
  const clean = path.toLowerCase();
  if (clean.includes('/orders') || clean.includes('/pos')) return { moduleName: 'POS', entityTable: 'orders' };
  if (clean.includes('/products') || clean.includes('/inventory') || clean.includes('/stock')) {
    return { moduleName: 'INVENTORY', entityTable: 'products' };
  }
  if (clean.includes('/tills') || clean.includes('/shifts') || clean.includes('/registers')) {
    return { moduleName: 'FINANCE', entityTable: 'finance_till_shifts' };
  }
  if (clean.includes('/finance') || clean.includes('/journal') || clean.includes('/expenses')) {
    return { moduleName: 'FINANCE', entityTable: 'general_journal_entries' };
  }
  if (clean.includes('/payments') || clean.includes('/reconciliation')) {
    return { moduleName: 'PAYMENTS', entityTable: 'treasury_payments' };
  }
  if (clean.includes('/branches')) return { moduleName: 'SETTINGS', entityTable: 'branches' };
  if (clean.includes('/settings')) return { moduleName: 'SETTINGS', entityTable: 'tenant_settings' };
  if (clean.includes('/auth')) return { moduleName: 'AUTH', entityTable: 'users' };
  if (clean.includes('/analytics') || clean.includes('/reports')) {
    return { moduleName: 'ANALYTICS', entityTable: 'analytics_report_runs' };
  }
  if (clean.includes('/ai')) return { moduleName: 'AI', entityTable: 'ai_advisory_sessions' };

  const seg = clean.replace(/^\/api\/v1\//, '').split('/')[0] || 'system';
  return { moduleName: seg.toUpperCase(), entityTable: seg };
}

function buildActionName(method: string, path: string, statusCode: number): string {
  const clean = path.toLowerCase();
  const prefix = statusCode >= 400 ? 'FAILED_' : '';

  if (clean.includes('/login')) return `${prefix}USER_LOGIN`;
  if (clean.includes('/logout')) return `${prefix}USER_LOGOUT`;
  if (clean.includes('/register') || clean.includes('/signup')) return `${prefix}USER_REGISTERED`;
  if (clean.includes('/export') || clean.includes('/download')) return `${prefix}DATA_EXPORTED`;
  if (clean.includes('/refund')) return `${prefix}ORDER_REFUNDED`;
  if (clean.includes('/status') || clean.includes('/close')) return `${prefix}STATUS_CHANGED`;
  if (clean.includes('/review')) return `${prefix}VOUCHER_REVIEWED`;
  if (clean.includes('/reprice') || clean.includes('/pricing')) return `${prefix}PRICING_UPDATED`;

  switch (method.toUpperCase()) {
    case 'POST':
      return `${prefix}CREATED`;
    case 'PUT':
    case 'PATCH':
      return `${prefix}UPDATED`;
    case 'DELETE':
      return `${prefix}DELETED`;
    case 'GET':
      return `${prefix}ACCESSED`;
    default:
      return `${prefix}${method.toUpperCase()}`;
  }
}

function extractEntityId(req: Request, responseBody: any): string {
  if (req.params?.id) return String(req.params.id);
  if (req.params?.productId) return String(req.params.productId);
  const data = responseBody?.data;
  if (Array.isArray(data) && data[0]?.id) return String(data[0].id);
  if (data?.id) return String(data.id);
  if (data?.user?.id) return String(data.user.id);
  if (data?.orderNum) return String(data.orderNum);
  if (data?.voucherNumber) return String(data.voucherNumber);
  if (data?.executionRef) return String(data.executionRef);
  return req.originalUrl.split('?')[0].replace(/^\/api\/v1\//, '') || 'system';
}

function buildDiffs(req: AuthReq, resBody: any, statusCode: number): AuditChangeDiff[] {
  const diffs: AuditChangeDiff[] = [];
  const method = req.method.toUpperCase();
  const safeBody = sanitizePayload(req.body);
  const safeQuery = sanitizePayload(req.query);
  const dataObj =
    resBody?.data && typeof resBody.data === 'object' && !Array.isArray(resBody.data)
      ? resBody.data
      : null;

  if (dataObj?.changes && Array.isArray(dataObj.changes)) {
    return dataObj.changes;
  }

  if (safeBody && typeof safeBody === 'object' && !Array.isArray(safeBody)) {
    for (const [key, val] of Object.entries(safeBody)) {
      if (val === undefined) continue;
      const newVal = dataObj && key in dataObj ? dataObj[key] : val;
      diffs.push({
        attribute: key,
        previousValue: method === 'POST' ? null : '—',
        newValue: newVal,
      });
    }
  }

  if (safeQuery && typeof safeQuery === 'object') {
    for (const [key, val] of Object.entries(safeQuery)) {
      if (val === undefined || val === '') continue;
      diffs.push({
        attribute: `query.${key}`,
        previousValue: null,
        newValue: val,
      });
    }
  }

  diffs.push({
    attribute: 'http_status',
    previousValue: null,
    newValue: statusCode,
  });

  const ua = req.headers['user-agent'];
  if (ua) {
    diffs.push({
      attribute: 'user_agent',
      previousValue: null,
      newValue: String(ua).slice(0, 160),
    });
  }

  if (statusCode >= 400 && (resBody?.message || resBody?.error)) {
    diffs.push({
      attribute: 'error_message',
      previousValue: null,
      newValue: String(resBody.message || resBody.error),
    });
  }

  return diffs.slice(0, 30);
}

export function systemAuditMiddleware(req: AuthReq, res: Response, next: NextFunction) {
  const cleanPath = req.originalUrl.split('?')[0];

  // Skip healthchecks and /audit/logs polling to avoid infinite self-logging loops
  if (cleanPath === '/health' || cleanPath.endsWith('/audit/logs')) {
    return next();
  }

  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  let capturedBody: any = null;

  res.json = ((body: any) => {
    capturedBody = body;
    return originalJson(body);
  }) as any;

  res.send = ((body: any) => {
    if (capturedBody === null && typeof body === 'string') {
      try {
        capturedBody = JSON.parse(body);
      } catch {
        capturedBody = { rawLength: body.length };
      }
    }
    return originalSend(body);
  }) as any;

  res.on('finish', () => {
    const tenantId =
      req.auth?.tenantId ||
      req.user?.tenantId ||
      capturedBody?.data?.tenantId ||
      capturedBody?.data?.user?.tenantId ||
      capturedBody?.tenantId ||
      (req.headers['x-tenant-id'] as string) ||
      null;

    if (!tenantId) return;

    const actorEmail =
      req.auth?.email ||
      req.user?.email ||
      capturedBody?.data?.email ||
      capturedBody?.data?.user?.email ||
      null;

    const actorName =
      req.auth?.name ||
      req.user?.name ||
      capturedBody?.data?.name ||
      capturedBody?.data?.user?.name ||
      actorEmail ||
      'Operator';

    const actorRole =
      req.auth?.role ||
      req.user?.role ||
      capturedBody?.data?.role ||
      capturedBody?.data?.user?.role ||
      'USER';

    const branchId =
      req.auth?.branchId ||
      req.user?.branchId ||
      (req.body?.branchId as string) ||
      (req.query?.branchId as string) ||
      (req.headers['x-branch-id'] as string) ||
      null;

    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) ||
      req.socket?.remoteAddress ||
      null;

    const method = req.method.toUpperCase();
    const { moduleName, entityTable } = inferModuleAndEntity(cleanPath);
    const action = buildActionName(method, cleanPath, res.statusCode);
    const entityId = extractEntityId(req, capturedBody);
    const endpointNarrative = `${method} ${req.originalUrl} (${res.statusCode})`;
    const changes = buildDiffs(req, capturedBody, res.statusCode);

    void recordAuditLog({
      tenantId,
      branchId,
      module: moduleName,
      action,
      entityTable,
      entityId,
      actorName,
      actorEmail,
      actorRole,
      ipAddress,
      endpointNarrative,
      changes,
    });
  });

  next();
}