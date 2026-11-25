import { Router } from 'express';
import { WastageController } from './wastage.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', WastageController.getAll);
router.post('/', WastageController.create);

export const wastageRoutes = router;
export default router;