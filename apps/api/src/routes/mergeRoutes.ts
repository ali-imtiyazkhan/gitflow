import { Router } from 'express';
import { MergeController } from '@/controllers/mergeController';

const router = Router();
const mergeController = new MergeController();

// ─── Merge ──────────────────────────────────────────────────────────────────

router.post('/:owner/:repo/merge', (req, res, next) => mergeController.startMerge(req, res, next));

// ─── Conflicts ──────────────────────────────────────────────────────────────

router.get('/:owner/:repo/conflicts/:id', (req, res, next) => mergeController.getConflict(req, res, next));
router.post('/:owner/:repo/conflicts/resolve', (req, res, next) => mergeController.resolveConflict(req, res, next));

export default router;
