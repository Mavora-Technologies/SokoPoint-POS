//apps/api/src/modules/orders/orders.routes.ts
import { Router } from 'express';
import { OrderController } from './orders.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.post('/', OrderController.create);
router.get('/', OrderController.getAll); // <-- NEW

export const orderRoutes = router;