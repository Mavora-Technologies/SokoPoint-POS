import { Router } from 'express';
import { GrnController } from './grn.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', GrnController.getAll);
router.post('/', GrnController.create);

export const grnRoutes = router;
export default router;