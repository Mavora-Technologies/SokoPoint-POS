import { Router } from 'express';
import { BarcodesController } from './barcodes.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', BarcodesController.getAll);
router.post('/generate', BarcodesController.generateBarcodes);
router.patch('/:productId', BarcodesController.updateBarcode);

export const barcodeRoutes = router;
export default router;