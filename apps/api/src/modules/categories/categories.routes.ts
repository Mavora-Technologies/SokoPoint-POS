import { Router } from 'express';
import { CategoriesController } from './categories.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', CategoriesController.getAll);
router.post('/', CategoriesController.create);
router.put('/:id', CategoriesController.update);
router.patch('/:id', CategoriesController.update);
router.delete('/:id', CategoriesController.remove);

export const categoryRoutes = router;
export default router;