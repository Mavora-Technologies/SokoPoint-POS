import { Router } from 'express';
import { ProcurementOrdersController } from './orders.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', ProcurementOrdersController.getAll);
router.post('/', ProcurementOrdersController.create);
router.patch('/:id/status', ProcurementOrdersController.updateStatus);

export const procurementOrdersRoutes = router;
export default router;