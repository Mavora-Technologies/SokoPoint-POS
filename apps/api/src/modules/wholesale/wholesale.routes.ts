import { Router } from 'express';
import { WholesaleController } from './wholesale.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', WholesaleController.getWholesaleOrders);
router.post('/', WholesaleController.createWholesaleOrder);
router.patch('/:id/status', WholesaleController.updateStatus);

export const wholesaleRoutes = router;
export default router;