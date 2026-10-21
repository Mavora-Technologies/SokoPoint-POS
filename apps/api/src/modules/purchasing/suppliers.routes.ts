import { Router } from 'express';
import { SupplierController } from './suppliers.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.post('/', SupplierController.create);
router.get('/', SupplierController.getAll);

export const supplierRoutes = router;