import { Router } from 'express';
import { RepoController } from '@/controllers/repoController';

const router = Router();
const repoController = new RepoController();

router.get('/:owner/:repo/branches', (req, res, next) => repoController.getBranches(req, res, next));
router.get('/:owner/:repo/graph', (req, res, next) => repoController.getGraph(req, res, next));
router.delete('/:owner/:repo/branches/:branchName', (req, res, next) => repoController.deleteBranch(req, res, next));

export default router;
