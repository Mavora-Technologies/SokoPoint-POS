import { Router } from 'express';
import { ReportsController } from './reports.controller';

const router = Router();

router.post('/export', ReportsController.exportReport);

export const reportsRoutes = router;
