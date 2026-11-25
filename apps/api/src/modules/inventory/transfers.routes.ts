import { Router } from 'express';
import { TransfersController } from './transfers.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/fleet', TransfersController.getFleet);
router.post('/fleet', TransfersController.createVehicle);

router.get('/', TransfersController.getAll);
router.post('/', TransfersController.create);
router.patch('/:id/dispatch', TransfersController.dispatch);
router.patch('/:id/receive', TransfersController.receive);

export const transfersRoutes = router;
export default router;