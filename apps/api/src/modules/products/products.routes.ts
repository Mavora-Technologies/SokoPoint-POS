import { Router } from 'express';
import { ProductsController } from './products.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.use(requireAuth);

router.get('/', ProductsController.getProducts);
router.post('/', ProductsController.createProduct);

export const productsRoutes = router;
export default router;