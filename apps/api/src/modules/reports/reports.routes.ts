import { Router } from 'express';
import { getDashboardAnalytics } from '../../controllers/reports.controller';

const router = Router();

// Support both /analytics and /summary to satisfy your frontend
router.get('/analytics', getDashboardAnalytics);
router.get('/summary', getDashboardAnalytics); 

export const reportRoutes = router;