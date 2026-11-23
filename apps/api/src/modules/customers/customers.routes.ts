import { Router } from 'express';
import { CustomerController } from './customers.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.use(requireAuth);

router.get('/', CustomerController.getAll);
router.get('/:id', CustomerController.getById);
router.post('/', CustomerController.create);
router.put('/:id', CustomerController.update);
router.patch('/:id', CustomerController.update);
router.delete('/:id', CustomerController.remove);

export const customerRoutes = router;
export default router;