import { Router } from 'express';
import { CreditController } from './credit.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', CreditController.getAll);
router.post('/', CreditController.create);
router.patch('/:id/payment', CreditController.adjustBalance);
router.delete('/:id', CreditController.remove);

export const creditRoutes = router;
export default router;