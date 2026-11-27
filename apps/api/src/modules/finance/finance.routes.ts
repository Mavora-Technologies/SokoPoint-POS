import { Router } from 'express';
import { TreasuryController } from './treasury.controller';
import { MpesaGatewayController } from './mpesa.controller';
import { ReconciliationController } from './reconciliation.controller';
import { EtimsController } from './etims.controller';
import { FinanceOperationsController } from './operations.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { FinanceAdjustmentsController } from './adjustments.controller';

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

// Refunds & Credit Memos
router.get('/refunds', FinanceOperationsController.getRefunds);
router.post('/refunds', FinanceOperationsController.createRefund);

// Cash Drawer
router.get('/cash-drawer', FinanceOperationsController.getCashDrawer);
router.post('/cash-drawer/movement', FinanceOperationsController.recordDrawerMovement);

// Z-Reports & Till Shifts
router.get('/z-reports', FinanceOperationsController.getZReports);
router.post('/z-reports/open-shift', FinanceOperationsController.openTillShift);
router.patch('/z-reports/:id/close', FinanceOperationsController.closeTillShift);

// Financial Control
router.get('/control', FinanceOperationsController.getFinancialControl);
router.put('/control/periods', FinanceOperationsController.upsertPeriodLock);

// General Journal
router.get('/journal', FinanceOperationsController.getJournal);
router.post('/journal', FinanceOperationsController.createJournalEntry);

// Financial Adjustments & Maker-Checker GL Audit
router.get('/adjustments', FinanceAdjustmentsController.getAll);
router.post('/adjustments', FinanceAdjustmentsController.create);
router.patch('/adjustments/:id/review', FinanceAdjustmentsController.review);

export const financeRoutes = router;
export default router;