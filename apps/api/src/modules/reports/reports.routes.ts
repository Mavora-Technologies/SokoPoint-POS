import { Router } from 'express';
import { getSalesOverview, exportTransactions } from '../../controllers/report.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/sales-overview', getSalesOverview);
router.get('/export', exportTransactions);

export default router;
export const reportRoutes = router;