import { Router, Request, Response } from 'express';

const router = Router();

// Reports endpoints
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Reports module operational',
    data: {
      salesSummary: { totalRevenue: 0, totalOrders: 0 },
      inventorySummary: { totalItems: 0, lowStockItems: 0 }
    }
  });
});

router.get('/sales', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: []
  });
});

router.get('/inventory', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: []
  });
});

// Dual exports to ensure 100% compatibility with any import style
export default router;
export const reportRoutes = router;