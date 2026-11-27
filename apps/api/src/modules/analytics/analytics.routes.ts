import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/hub', AnalyticsController.getHub);
router.post('/run', AnalyticsController.runReport);
router.post('/schedules', AnalyticsController.createSchedule);
router.delete('/schedules/:id', AnalyticsController.deleteSchedule);

export const analyticsRoutes = router;
export default router;