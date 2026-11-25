import { Router } from 'express';
import { ReorderController } from './reorder.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', ReorderController.getSuggestions);
router.post('/pr', ReorderController.createRequisition);
router.post('/generate-pos', ReorderController.generatePurchaseOrders);

export const reorderRoutes = router;
export default router;