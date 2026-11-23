import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', AttendanceController.getAttendance);
router.post('/clock-in', AttendanceController.clockIn);
router.post('/clock-out', AttendanceController.clockOut);

export const attendanceRoutes = router;
export default router;