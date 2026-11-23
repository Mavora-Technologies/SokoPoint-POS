import { Router } from 'express';
import { LoyaltyController } from './loyalty.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', LoyaltyController.getOverview);
router.post('/adjust', LoyaltyController.adjustPoints);

export const loyaltyRoutes = router;
export default router;