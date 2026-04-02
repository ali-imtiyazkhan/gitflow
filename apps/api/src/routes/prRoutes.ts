import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { createOctokit } from '../services/githubService';
import { AIService } from '../services/aiService';
import { ApiError } from '../utils/apiError';
import { emitRepoEvent } from '../services/socketHandlers';
import type { Server } from 'socket.io';

export const prRouter = Router();
const aiService = new AIService();

const createPRSchema = z.object({
  title: z.string().min(1),
  sourceBranch: z.string().min(1),
  targetBranch: z.string().min(1),
  body: z.string().default(''),
  draft: z.boolean().default(false),
  aiDescription: z.boolean().default(false),
});

// get all the pull requests
prRouter.post('/:owner/:repo/pull-requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const githubToken = (req.headers['authorization'] as string)?.split(' ')[1];
    if (!githubToken) throw new ApiError(401, 'UNAUTHORIZED', 'No GitHub token provided');

    const io = req.app.get('io') as Server | undefined;
    const body = createPRSchema.parse(req.body);
    const octokit = createOctokit(githubToken);

    let description = body.body;
    if (body.aiDescription && !description) {
      description = await aiService.generateCommitMessage([]); 
    }

    const { data: pr } = await octokit.rest.pulls.create({
      owner: owner as string,
      repo: repo as string,
      title: body.title,
      head: body.sourceBranch,
      base: body.targetBranch,
      body: description,
      draft: body.draft,
    });

    if (io) {
      emitRepoEvent(io, `${owner}/${repo}`, {
        type: 'merge:started',
        payload: { prNumber: pr.number, prUrl: pr.html_url, sourceBranch: body.sourceBranch },
        repoId: `${owner}/${repo}`,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        state: pr.state,
        draft: pr.draft,
        sourceBranch: body.sourceBranch,
        targetBranch: body.targetBranch,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/v1/repos/:owner/:repo/pull-requests
prRouter.get('/:owner/:repo/pull-requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const githubToken = (req.headers['authorization'] as string)?.split(' ')[1];
    if (!githubToken) throw new ApiError(401, 'UNAUTHORIZED', 'No GitHub token provided');

    const octokit = createOctokit(githubToken);
    const { data: prs } = await octokit.rest.pulls.list({ 
      owner: owner as string, 
      repo: repo as string, 
      state: 'open', 
      per_page: 30 
    });
    
    res.json({
      success: true,
      data: prs.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        state: pr.state,
        draft: pr.draft,
        sourceBranch: pr.head.ref,
        targetBranch: pr.base.ref,
        mergeable: (pr as any).mergeable,
      })),
    });
  } catch (err) { next(err); }
});

export default prRouter;
