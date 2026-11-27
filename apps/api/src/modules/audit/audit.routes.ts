import { Router } from 'express';
import { AuditController } from './audit.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/logs', AuditController.getLogs);
router.get('/export', AuditController.exportLogs);

export const auditRoutes = router;
export default router;