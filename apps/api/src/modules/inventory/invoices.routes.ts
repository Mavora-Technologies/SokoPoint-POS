import { Router } from 'express';
import { SupplierInvoicesController } from './invoices.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', SupplierInvoicesController.getAll);
router.post('/', SupplierInvoicesController.create);
router.patch('/:id/pay', SupplierInvoicesController.recordPayment);

export const supplierInvoicesRoutes = router;
export default router;