import { Router } from 'express';
import { getBranches, createBranch } from '../../controllers/branch.controller';

export const branchRoutes = Router();

branchRoutes.get('/', getBranches);
branchRoutes.post('/', createBranch);