import { Router } from 'express';
import {
  getTills,
  createTill,
  updateTillStatus,
  createRegister,
} from '../../controllers/till.controller';
import { requireAuth } from '../../middleware/requireAuth';

export const tillRoutes = Router();

tillRoutes.use(requireAuth);

tillRoutes.get('/', getTills);
tillRoutes.post('/', createTill);
tillRoutes.patch('/:id/status', updateTillStatus);
tillRoutes.post('/registers', createRegister);