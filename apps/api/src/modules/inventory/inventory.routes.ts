import { Router } from 'express';
import { getStockLevels, adjustStock } from './inventory.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', getStockLevels);
router.post('/adjust', adjustStock);

export default router;