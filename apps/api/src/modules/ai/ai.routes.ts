import { Router } from 'express';
import { AiAdvisoryController } from './ai.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

// Copilot Advisory Sessions & Live Telemetry
router.get('/sessions', AiAdvisoryController.getSessions);
router.get('/sessions/:id/messages', AiAdvisoryController.getMessages);
router.post('/ask', AiAdvisoryController.ask);
router.delete('/sessions/:id', AiAdvisoryController.deleteSession);

// Predictive Demand & Workforce Capacity Planning
router.get('/forecasting', AiAdvisoryController.getForecasting);
router.put('/forecasting/settings', AiAdvisoryController.saveForecastSettings);

// SKU Portfolio Matrix & Margin Anomalies
router.get('/anomalies', AiAdvisoryController.getAnomaliesMatrix);
router.patch('/anomalies/:productId/reprice', AiAdvisoryController.repriceSku);

export const aiRoutes = router;
export default router;