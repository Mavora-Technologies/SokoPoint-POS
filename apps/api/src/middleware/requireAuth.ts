import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.AUTH_SECRET || 'super_secret_auth_key_vora_pos_2026';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let token = '';

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'] as string;
    } else if ((req as any).cookies && (req as any).cookies.token) {
      token = (req as any).cookies.token;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    (req as any).auth = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
    return;
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

// Export alias to match any alternative naming
export const requireAuthorisation = requireAuth;