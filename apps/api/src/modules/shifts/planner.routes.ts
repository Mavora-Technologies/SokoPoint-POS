import { Router } from 'express';
import { PlannerController } from './planner.controller';
import { requireAuth, requireRole } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', PlannerController.getSchedule);
router.post('/', requireRole('BUSINESS_OWNER', 'BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ADMIN'), PlannerController.createShift);

export const plannerRoutes = router;
export default router;