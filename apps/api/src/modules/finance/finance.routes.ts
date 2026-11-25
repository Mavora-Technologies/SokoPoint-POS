import { Router } from 'express';
import { TreasuryController } from './treasury.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { MpesaGatewayController } from './mpesa.controller';

const router = Router();
router.use(requireAuth);

router.get('/tender-settlement', TreasuryController.getAll);
router.post('/tender-settlement', TreasuryController.create);
router.patch('/tender-settlement/:id/reconcile', TreasuryController.reconcile);
router.post('/tender-settlement/:id/reverse', TreasuryController.stornoReverse);

router.get('/mpesa', MpesaGatewayController.getAll);
router.post('/mpesa/stk-push', MpesaGatewayController.requestStkPush);
router.post('/mpesa/b2b-payout', MpesaGatewayController.authorizeB2bPayout);
router.patch('/mpesa/:id/status', MpesaGatewayController.updateStatus);

export const financeRoutes = router;
export default router;