import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { approvalService } from '../services/approvalService';
import { createOctokit } from '../services/githubService';
import { ApiError } from '../utils/apiError';
import { emitRepoEvent } from '../services/socketHandlers';
import type { Server } from 'socket.io';

export const approvalRouter = Router();

const createSchema = z.object({
  sourceBranch: z.string().min(1),
  targetBranch: z.string().min(1),
  requiredApprovals: z.number().int().min(1).max(10).default(1),
});

// POST /api/v1/repos/:owner/:repo/approvals
approvalRouter.post('/:owner/:repo/approvals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const githubToken = String(req.headers['authorization'] || '').split(' ')[1];
    if (!githubToken) throw new ApiError(401, 'UNAUTHORIZED', 'No GitHub token provided');

    const io = req.app.get('io') as Server | undefined;
    const body = createSchema.parse(req.body);
    const octokit = createOctokit(githubToken);
    const user = String(req.headers['x-github-user'] || 'unknown');

    const approval = approvalService.create({
      repoId: `${owner}/${repo}`,
      sourceBranch: body.sourceBranch,
      targetBranch: body.targetBranch,
      requestedBy: user,
      requiredApprovals: body.requiredApprovals,
    });

    if (io) {
      emitRepoEvent(io, `${owner}/${repo}`, {
        type: 'approval:requested',
        payload: { approvalId: approval.id, sourceBranch: body.sourceBranch, requestedBy: user },
        repoId: `${owner}/${repo}`,
      });
    }

    res.status(201).json({ success: true, data: approval });
  } catch (err) { next(err); }
});


approvalRouter.get('/:owner/:repo/approvals', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const list = approvalService.forRepo(`${owner}/${repo}`);
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});


approvalRouter.post('/:owner/:repo/approvals/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, owner, repo } = req.params;
    const io = req.app.get('io') as Server | undefined;
    const userId = String(req.headers['x-github-user'] || 'unknown');

    const githubToken = String(req.headers['authorization'] || '').split(' ')[1];
    if (!githubToken) throw new ApiError(401, 'UNAUTHORIZED', 'No GitHub token provided');

    const octokit = createOctokit(githubToken);

    const updated = approvalService.approve(id as string, userId);
    if (!updated) throw new ApiError(404, 'NOT_FOUND', 'Approval request not found');

    if (io) {
      emitRepoEvent(io, `${owner}/${repo}`, {
        type: 'approval:status_changed',
        payload: { approvalId: id, status: updated.status, approvedBy: updated.approvedBy },
        repoId: `${owner}/${repo}`,
      });
      
      if (updated.status === 'approved') {
        emitRepoEvent(io, `${owner}/${repo}`, {
          type: 'merge:completed',
          payload: { approvalId: id, approvedBy: updated.approvedBy },
          repoId: `${owner}/${repo}`,
        });
      }
    }

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// POST /api/v1/repos/:owner/:repo/approvals/:id/reject
approvalRouter.post('/:owner/:repo/approvals/:id/reject', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, owner, repo } = req.params;
    const io = req.app.get('io') as Server | undefined;
    const userId = String(req.headers['x-github-user'] || 'unknown');
    
    const updated = approvalService.reject(id as string, userId);
    if (!updated) throw new ApiError(404, 'NOT_FOUND', 'Approval request not found');
    
    if (io) {
      emitRepoEvent(io, `${owner}/${repo}`, {
        type: 'approval:status_changed',
        payload: { approvalId: id, status: 'rejected', rejectedBy: userId },
        repoId: `${owner}/${repo}`,
      });
    }
    
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default approvalRouter;
