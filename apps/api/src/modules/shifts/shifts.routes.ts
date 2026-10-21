import { Router } from 'express';
import { getShifts, createShift, endShift } from '../../controllers/shift.controller';

export const shiftRoutes = Router();

shiftRoutes.get('/', getShifts);
shiftRoutes.post('/', createShift);
shiftRoutes.patch('/:id/end', endShift);