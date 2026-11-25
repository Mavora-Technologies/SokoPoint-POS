import { Router } from 'express';
import { RequisitionsController } from './requisitions.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', RequisitionsController.getAll);
router.post('/', RequisitionsController.create);
router.patch('/:id/status', RequisitionsController.updateStatus);

export const requisitionsRoutes = router;
export default router;