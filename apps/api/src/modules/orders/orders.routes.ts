import { Router } from 'express';
import { OrderController } from './orders.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.post('/', OrderController.create);
router.get('/', OrderController.getAll);

export const orderRoutes = router;