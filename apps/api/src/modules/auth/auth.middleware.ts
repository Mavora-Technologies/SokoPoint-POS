import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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

    const decoded = jwt.verify(
      token, 
      process.env.AUTH_SECRET || 'super_secret_auth_key_vora_pos_2026'
    );
    
    // Injects userId, businessName, and role into the request for isolated database queries
    (req as any).user = decoded; 
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
    return;
  }
};