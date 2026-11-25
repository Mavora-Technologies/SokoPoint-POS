import { Router } from 'express';
import { TreasuryController } from './treasury.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/tender-settlement', TreasuryController.getAll);
router.post('/tender-settlement', TreasuryController.create);
router.patch('/tender-settlement/:id/reconcile', TreasuryController.reconcile);
router.post('/tender-settlement/:id/reverse', TreasuryController.stornoReverse);

export const financeRoutes = router;
export default router;