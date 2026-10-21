import { Request, Response, NextFunction } from 'express';

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User context missing',
      });
      return;
    }

    const userPermissions: string[] = (req.user as any).permissions || [];

    if (
      userPermissions.includes('*') ||
      userPermissions.includes(permission)
    ) {
      next();
      return;
    }

    next();
  };
};