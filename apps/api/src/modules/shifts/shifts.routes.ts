import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { ShiftsController } from './shifts.controller';
import { StaffWorkforceController } from './staff-workforce.controller';
import { PerformanceController } from './performance.controller';
import attendanceRoutes from './attendance.routes';
import plannerRoutes from './planner.routes';
import handoversRoutes from './handovers.routes';
import cashDrawersRoutes from './cash-drawers.routes';

const router = Router();
router.use(requireAuth);

router.get('/overview', ShiftsController.getOverview);
router.get('/employees', StaffWorkforceController.getEmployees);
router.post(
  '/employees',
  requireRole('BUSINESS_OWNER', 'BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ADMIN'),
  StaffWorkforceController.createEmployee
);
router.get('/roles', StaffWorkforceController.getRoles);
router.get('/performance', PerformanceController.getPerformance);

router.use('/attendance', attendanceRoutes);
router.use('/planner', plannerRoutes);
router.use('/handovers', handoversRoutes);
router.use('/cash-drawers', cashDrawersRoutes);

export const shiftsRoutes = router;
export default router;