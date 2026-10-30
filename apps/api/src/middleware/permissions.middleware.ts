import { Request, Response, NextFunction } from 'express';

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Cast req to 'any' to resolve the TypeScript error
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User context missing',
      });
      return;
    }

    const userPermissions: string[] = user.permissions || [];

    if (
      userPermissions.includes('*') ||
      userPermissions.includes(permission)
    ) {
      next();
      return;
    }

    // 2. Return a 403 Forbidden instead of calling next() to prevent unauthorized access
    res.status(403).json({
      success: false,
      message: 'Forbidden: Insufficient permissions',
    });
  };
};