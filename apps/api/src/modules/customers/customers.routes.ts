import { Router } from 'express';
import { CustomerController } from './customers.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.post('/', CustomerController.create);
router.get('/', CustomerController.getAll);

export const customerRoutes = router;