import { Router } from 'express';
import { HandoversController } from './handovers.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', HandoversController.getHandovers);
router.post('/', HandoversController.createHandover);

export const handoversRoutes = router;
export default router;