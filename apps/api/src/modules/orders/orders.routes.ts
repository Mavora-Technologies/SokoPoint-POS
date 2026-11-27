import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.use(requireAuth);

router.get('/', OrdersController.getOrders);
router.post('/', OrdersController.createOrder);
router.patch('/:id/status', OrdersController.updateStatus);

export const ordersRoutes = router;
export default router;