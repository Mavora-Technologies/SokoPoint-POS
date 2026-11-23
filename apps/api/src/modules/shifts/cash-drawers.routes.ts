import { Router } from 'express';
import { CashDrawersController } from './cash-drawers.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', CashDrawersController.getDrawers);

export const cashDrawersRoutes = router;
export default router;