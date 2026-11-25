import { Router } from 'express';
import { AuditsController } from './audits.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', AuditsController.getAll);
router.get('/:id', AuditsController.getById);
router.post('/', AuditsController.create);

export const auditsRoutes = router;
export default router;