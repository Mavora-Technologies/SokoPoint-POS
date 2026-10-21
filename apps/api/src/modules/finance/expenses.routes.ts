import { Router } from 'express';
import { ExpensesController } from './expenses.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', ExpensesController.getExpenses);
router.post('/', ExpensesController.create);

export const expenseRoutes = router;