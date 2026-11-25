import { Router } from 'express';
import { AuditsController } from './audits.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', AuditsController.getAll);
router.post('/', AuditsController.create);
router.get('/:id', AuditsController.getById);
router.patch('/:id/reconcile', AuditsController.reconcile);

export const auditsRoutes = router;
export default router;