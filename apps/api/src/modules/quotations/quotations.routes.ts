import { Router } from 'express';
import { QuotationsController } from './quotations.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', QuotationsController.getQuotations);
router.post('/', QuotationsController.createQuotation);
router.patch('/:id/convert', QuotationsController.convertToInvoice);
router.patch('/:id/status', QuotationsController.updateStatus);

export const quotationsRoutes = router;
export default router;