import { Router } from 'express';
import { TreasuryController } from './treasury.controller';
import { MpesaGatewayController } from './mpesa.controller';
import { ReconciliationController } from './reconciliation.controller';
import { EtimsController } from './etims.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

// Tender Settlement
router.get('/tender-settlement', TreasuryController.getAll);
router.post('/tender-settlement', TreasuryController.create);
router.patch('/tender-settlement/:id/reconcile', TreasuryController.reconcile);
router.post('/tender-settlement/:id/reverse', TreasuryController.stornoReverse);

// M-Pesa Gateway
router.get('/mpesa', MpesaGatewayController.getAll);
router.post('/mpesa/stk-push', MpesaGatewayController.requestStkPush);
router.post('/mpesa/b2b-payout', MpesaGatewayController.authorizeB2bPayout);
router.patch('/mpesa/:id/status', MpesaGatewayController.updateStatus);

// Two-Sided Bank Reconciliation
router.get('/reconciliation', ReconciliationController.getWorkbench);
router.post('/reconciliation/import', ReconciliationController.importStatement);
router.post('/reconciliation/match', ReconciliationController.confirmMatch);
router.post('/reconciliation/auto-match', ReconciliationController.autoMatch);

// KRA eTIMS & Statutory Tax Ledger
router.get('/etims', EtimsController.getDashboard);
router.put('/etims/settings', EtimsController.saveSettings);

export const financeRoutes = router;
export default router;