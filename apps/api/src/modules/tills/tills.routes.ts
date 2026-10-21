import { Router } from 'express';
import { getTills, createTill, updateTillStatus } from '../../controllers/till.controller';

export const tillRoutes = Router();

tillRoutes.get('/', getTills);
tillRoutes.post('/', createTill);
tillRoutes.patch('/:id/status', updateTillStatus);