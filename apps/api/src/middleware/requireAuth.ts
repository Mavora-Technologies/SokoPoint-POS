import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const FALLBACK_SECRET = 'super_secret_auth_key_vora_pos_2026';

export const getJwtSecret = (): string => {
  return (process.env.AUTH_SECRET || FALLBACK_SECRET).trim();
};

const cleanToken = (raw?: string | null): string => {
  if (!raw) return '';
  const cleaned = raw.trim().replace(/^["']|["']$/g, '');
  if (!cleaned || cleaned === 'null' || cleaned === 'undefined') return '';
  return cleaned;
};

const extractCookieToken = (cookieHeader?: string): string => {
  if (!cookieHeader) return '';
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === 'token') {
      return cleanToken(decodeURIComponent(v.join('=')));
    }
  }
  return '';
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let token = '';

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = cleanToken(authHeader.slice(7));
    }
    if (!token && req.headers['x-auth-token']) {
      token = cleanToken(String(req.headers['x-auth-token']));
    }
    if (!token && (req as any).cookies?.token) {
      token = cleanToken((req as any).cookies.token);
    }
    if (!token && req.headers.cookie) {
      token = extractCookieToken(req.headers.cookie);
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as Record<string, any>;
    if (!decoded?.userId || !decoded?.tenantId) {
      res.status(401).json({ success: false, message: 'Invalid token: missing tenant isolation context.' });
      return;
    }

    (req as any).user = decoded;
    (req as any).auth = decoded;
    next();
  } catch (error: any) {
    console.error('[AUTH VERIFY FAILED]', error?.name, error?.message);
    res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = ((req as any).auth?.role || (req as any).user?.role || '').toUpperCase();
    if (!userRole || !normalizedAllowed.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: insufficient role permissions for this action.',
      });
      return;
    }
    next();
  };
};

export const requireAuthorisation = requireAuth;