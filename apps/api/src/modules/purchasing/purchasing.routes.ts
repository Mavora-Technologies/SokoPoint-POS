import { Router } from 'express';
import { PurchasingController } from './purchasing.controller';
import { requireAuth } from '../../middleware/auth.middleware'; 

const router = Router();

// Apply auth middleware if you are using it
router.use(requireAuth);

// Only route the functions that actually exist in the controller
router.get('/', PurchasingController.getAll);
router.post('/', PurchasingController.create);

export const purchasingRoutes = router;