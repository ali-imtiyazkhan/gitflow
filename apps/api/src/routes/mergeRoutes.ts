import { Router } from 'express';
import { MergeController } from '@/controllers/mergeController';

const router = Router();
const mergeController = new MergeController();

// Merge 

router.post('/:owner/:repo/merge', (req, res, next) => mergeController.startMerge(req, res, next));

// Conflicts 

router.get('/conflicts/all', (req, res, next) => mergeController.getAllConflicts(req, res, next));
router.post('/:owner/:repo/conflicts/ai-suggestion', (req, res, next) => mergeController.getAISuggestion(req, res, next));
router.post('/:owner/:repo/conflicts/analyze', (req, res, next) => mergeController.analyzeMerge(req, res, next));

export default router;
