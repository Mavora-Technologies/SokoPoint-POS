import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/business', SettingsController.getBusinessProfile);
router.put('/business', SettingsController.updateBusinessProfile);

export default router;
export const settingsRoutes = router;