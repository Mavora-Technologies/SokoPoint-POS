import { Router } from 'express';
import { SuppliersController } from './suppliers.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', SuppliersController.getAll);
router.post('/', SuppliersController.create);
router.put('/:id', SuppliersController.update);
router.patch('/:id/toggle', SuppliersController.toggleStatus);

export const inventorySuppliersRoutes = router;
export default router;