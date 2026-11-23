import { Router } from 'express';
import { RefundsController } from './refunds.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', RefundsController.getRefunds);
router.post('/', RefundsController.createRefund);

export const refundRoutes = router;
export default router;