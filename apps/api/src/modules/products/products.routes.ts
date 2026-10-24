import { Router } from 'express';
import multer from 'multer';
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from './products.controller';

const router = Router();

// Configure multer to handle file uploads in memory buffer
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // limit to 5MB
});

// Routes with multer single file upload middleware ('file')
router.get('/', getProducts);
router.post('/', upload.single('file'), createProduct);
router.put('/:id', upload.single('file'), updateProduct);
router.delete('/:id', deleteProduct);

export default router;