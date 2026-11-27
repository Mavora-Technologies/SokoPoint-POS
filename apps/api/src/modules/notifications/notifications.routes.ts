import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', NotificationsController.getAlerts);
router.post('/acknowledge', NotificationsController.acknowledgeAlerts);

export const notificationsRoutes = router;
export default router;