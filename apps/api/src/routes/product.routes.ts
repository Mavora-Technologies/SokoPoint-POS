import { Router } from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller';

const router = Router();

router.get('/', getProducts);
router.post('/', createProduct);
// THIS FIXES THE 404: It tells Express to listen for the PUT request
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;