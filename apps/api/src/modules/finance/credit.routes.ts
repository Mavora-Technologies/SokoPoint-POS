import { Router } from 'express';
import { getCreditAccounts, createCreditAccount } from '../../controllers/credit.controller';

const router = Router();

router.get('/', getCreditAccounts);
router.post('/', createCreditAccount);

export default router;