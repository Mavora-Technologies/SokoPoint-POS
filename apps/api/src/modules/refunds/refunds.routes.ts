import { Router } from 'express';
import { processRefund } from './refunds.controller';

const router = Router();

// POST /api/refunds
router.post('/', processRefund);

export default router;