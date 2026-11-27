import { Router } from 'express';
import { ExpensesController } from './expenses.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.use(requireAuth);

router.get('/', ExpensesController.getExpenses);
router.post('/', ExpensesController.create);
router.patch('/:id/action', ExpensesController.transitionStatus);

export const expenseRoutes = router;
export default router;