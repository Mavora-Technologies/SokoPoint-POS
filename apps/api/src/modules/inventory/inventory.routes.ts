import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { auditsRoutes } from './audits.routes';
import { transfersRoutes } from './transfers.routes';
import { reorderRoutes } from './reorder.routes';
import { wastageRoutes } from './wastage.routes';
import { inventorySuppliersRoutes } from './suppliers.routes';
import { requireAuth } from '../../middleware/requireAuth';
import { requisitionsRoutes } from './requisitions.routes';

const router = Router();
router.use(requireAuth);

router.get('/movements', InventoryController.getMovements);
router.use('/audits', auditsRoutes);
router.use('/transfers', transfersRoutes);
router.use('/reorder', reorderRoutes);
router.use('/wastage', wastageRoutes);
router.use('/requisitions', requisitionsRoutes);
router.use('/suppliers', inventorySuppliersRoutes);
router.get('/batches', InventoryController.getBatches);
router.patch('/batches/:id/quarantine', InventoryController.quarantineBatch);

export const inventoryRoutes = router;
export default router;