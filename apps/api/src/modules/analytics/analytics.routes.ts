import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/hub', AnalyticsController.getHub);
router.post('/run', AnalyticsController.runReport);
router.post('/schedules', AnalyticsController.createSchedule);
router.delete('/schedules/:id', AnalyticsController.deleteSchedule);

// Gross Margin & Profitability Intelligence
router.get('/margins', AnalyticsController.getMargins);
router.patch('/margins/sku/:productId', AnalyticsController.updateSkuPricing);

// Inventory Valuation & Depletion Analysis
router.get('/inventory', AnalyticsController.getInventoryAnalytics);
router.patch('/inventory/:productId', AnalyticsController.adjustInventoryStock);

export const analyticsRoutes = router;
export default router;