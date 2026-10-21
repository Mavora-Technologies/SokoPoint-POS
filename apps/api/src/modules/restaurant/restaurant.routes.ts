import { Router } from 'express';
import {
  createFloor,
  createTable,
  getTables,
  updateTableStatus,
  createRecipe,
} from './restaurant.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permissions.middleware';

const router = Router();

router.use(requireAuth);

router.post('/floors', requirePermission('restaurant.manage'), createFloor);
router.get('/tables', requirePermission('restaurant.view'), getTables);
router.post('/tables', requirePermission('restaurant.manage'), createTable);
router.patch('/tables/status', requirePermission('restaurant.manage'), updateTableStatus);

router.post('/recipes', requirePermission('restaurant.manage'), createRecipe);

export default router;