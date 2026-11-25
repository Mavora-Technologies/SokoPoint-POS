import { Router } from 'express';
import { SupplierReturnsController } from './returns.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', SupplierReturnsController.getAll);
router.post('/', SupplierReturnsController.create);
router.patch('/:id/status', SupplierReturnsController.updateStatus);

export const supplierReturnsRoutes = router;
export default router;