import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { auditsRoutes } from './audits.routes';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/movements', InventoryController.getMovements);
router.use('/audits', auditsRoutes);
router.get('/batches', InventoryController.getBatches);
router.patch('/batches/:id/quarantine', InventoryController.quarantineBatch);
router.get('/transfers', InventoryController.getTransfers);
router.post('/transfers', InventoryController.createTransfer);
router.patch('/transfers/:id/status', InventoryController.updateTransferStatus);
router.get('/wastage', InventoryController.getWastage);
router.post('/wastage', InventoryController.createWastage);

export const inventoryRoutes = router;
export default router;