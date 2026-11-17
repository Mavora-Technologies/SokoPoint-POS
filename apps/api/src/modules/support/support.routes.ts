import { Router } from 'express';
import { SupportController } from './support.controller';

const router = Router();

// Protected by the global CORS and frontend interceptor (injecting x-tenant-id)
router.get('/tickets', SupportController.getTickets);
router.post('/tickets', SupportController.createTicket);

export default router;