import { Router } from 'express';
import { AiAdvisoryController } from './ai.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/sessions', AiAdvisoryController.getSessions);
router.get('/sessions/:id/messages', AiAdvisoryController.getMessages);
router.post('/ask', AiAdvisoryController.ask);
router.delete('/sessions/:id', AiAdvisoryController.deleteSession);

export const aiRoutes = router;
export default router;