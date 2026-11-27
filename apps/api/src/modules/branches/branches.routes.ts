import { Router } from 'express';
import { BranchesController } from './branches.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', BranchesController.getBranches);
router.post('/', BranchesController.createBranch);
router.put('/:id', BranchesController.updateBranch);

export default router;
export const branchRoutes = router;