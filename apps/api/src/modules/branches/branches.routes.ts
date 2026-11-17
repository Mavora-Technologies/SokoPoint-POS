import { Router } from 'express';
import { BranchesController } from './branches.controller';

const router = Router();

// Routes are protected by your frontend JWT interceptor & tenant headers
router.get('/', BranchesController.getBranches);
router.post('/', BranchesController.createBranch);
router.put('/:id', BranchesController.updateBranch);

export default router;