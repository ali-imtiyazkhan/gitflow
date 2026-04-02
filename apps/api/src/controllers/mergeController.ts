import { Request, Response, NextFunction } from 'express';
import { GitHubService } from '@/services/githubService';
import { MergeService } from '@/services/mergeService';
import { AIService } from '@/services/aiService';
import { RebaseService } from '@/services/rebaseService';
import { ApiResponse, MergeRequest, ResolveConflictRequest, ConflictHunk, RebaseRequest } from '@gitflow/shared';
import { BadRequestError, NotFoundError, UnauthorizedError } from '@/utils/apiError';
import { prisma } from '@/lib/prisma';
import { Server } from 'socket.io';

export class MergeController {
  private mergeService = new MergeService();
  private aiService = new AIService();
  private rebaseService = new RebaseService();

  // Helper to get socket.io instance
  private getIO(req: Request): Server {
    return req.app.get('io');
  }

  // Helper to extract access token from headers
  private getAccessToken(req: Request): string {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }
    return authHeader.split(' ')[1];
  }

  // Merge 

  async startMerge(req: Request, res: Response, next: NextFunction) {
    try {
      const { owner, repo } = req.params;
      const repoId = `${owner}/${repo}`;
      const mergeRequest = req.body as MergeRequest;

      if (!mergeRequest.sourceBranch || !mergeRequest.targetBranch) {
        throw new BadRequestError('Source and target branches are required');
      }

      const token = this.getAccessToken(req);
      const gitHubService = new GitHubService(token);
      const io = this.getIO(req);

      // Notify clients that merge has started
      io.to(repoId).emit('merge:started', { 
        source: mergeRequest.sourceBranch, 
        target: mergeRequest.targetBranch 
      });

      const result = await this.mergeService.performMerge(gitHubService, owner as string, repo as string, mergeRequest);

      if (result.conflict) {
        // Persist conflict to database
        const savedConflict = await prisma.conflict.create({
          data: {
            id: result.conflict.id,
            owner: owner as string,
            repo: repo as string,
            sourceBranch: result.conflict.sourceBranch,
            targetBranch: result.conflict.targetBranch,
            hunks: result.conflict.files as any,
            status: 'open',
          }
        });

        // Notify clients about conflict
        io.to(repoId).emit('merge:conflict', {
          id: savedConflict.id,
          source: savedConflict.sourceBranch,
          target: savedConflict.targetBranch,
        });

        const response: ApiResponse<any> = {
          success: true,
          data: {
            merged: false,
            conflictId: savedConflict.id,
          }
        };
        return res.json(response);
      }

      // Notify clients about successful merge
      io.to(repoId).emit('merge:completed', {
        source: mergeRequest.sourceBranch,
        target: mergeRequest.targetBranch,
      });

      const response: ApiResponse<any> = {
        success: true,
        data: {
          merged: true,
        }
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  // Conflicts 
  async getConflict(req: Request, res: Response, next: NextFunction) {
    try {
       const { id } = req.params;
       const conflict = await prisma.conflict.findUnique({
          where: { id: id as string }
       });

       if (!conflict) {
          throw new NotFoundError(`Conflict with ID ${id} not found`);
       }

       const response: ApiResponse<any> = {
          success: true,
          data: {
             ...conflict,
             files: conflict.hunks,
          },
       };
       res.json(response);
    } catch (err) {
       next(err);
    }
  }

  async getAllConflicts(req: Request, res: Response, next: NextFunction) {
    try {
      const conflicts = await prisma.conflict.findMany({
        where: { status: 'open' },
        orderBy: { createdAt: 'desc' },
      });

      const response: ApiResponse<any[]> = {
        success: true,
        data: conflicts.map((c: any) => ({
          ...c,
          files: c.hunks,
        })),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async resolveConflict(req: Request, res: Response, next: NextFunction) {
    try {
       const { owner, repo } = req.params;
       const repoId = `${owner}/${repo}`;
       const resolveRequest = req.body as ResolveConflictRequest;
       const io = this.getIO(req);
       
       if (!resolveRequest.conflictId) {
          throw new BadRequestError('Conflict ID is required');
       }

       const conflict = await prisma.conflict.findUnique({
          where: { id: resolveRequest.conflictId }
       });

       if (!conflict) {
          throw new NotFoundError(`Conflict with ID ${resolveRequest.conflictId} not found`);
       }

       // 1. Actually perform the commit to GitHub
       const token = this.getAccessToken(req);
       const githubService = new GitHubService(token);
       
       const commitSha = await this.mergeService.resolveAndCommit(
          githubService,
          owner as string,
          repo as string,
          resolveRequest.conflictId,
          resolveRequest.files,
          conflict.sourceBranch,
          conflict.targetBranch
       );

       // 2. Update status in database
       await prisma.conflict.update({
          where: { id: resolveRequest.conflictId },
          data: { status: 'resolved' }
       });

       // 3. Notify clients about resolution
       io.to(repoId).emit('conflict:resolved', {
          id: resolveRequest.conflictId,
          repoId,
          commitSha,
       });

       const response: ApiResponse<any> = {
          success: true,
          data: {
             resolved: true,
             commitSha,
             message: 'Conflict resolved and committed to GitHub',
          },
       };
       res.json(response);
    } catch (err) {
       next(err);
    }
  }

  async getAISuggestion(req: Request, res: Response, next: NextFunction) {
    try {
      const hunk = req.body as ConflictHunk;
      
      if (!hunk.oursContent || !hunk.theirsContent) {
        throw new BadRequestError('Hunk content is required for AI suggestion');
      }

      const suggestion = await this.aiService.suggestResolution(hunk);
      const explanation = await this.aiService.explainConflict(hunk);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          ...suggestion,
          explanation
        }
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async getCommitMessage(req: Request, res: Response, next: NextFunction) {
     try {
        const { hunks } = req.body as { hunks: ConflictHunk[] };
        if (!hunks) throw new BadRequestError('Hunks are required');
        
        const message = await this.aiService.generateCommitMessage(hunks);
        res.json({ success: true, data: { message } });
     } catch (err) {
        next(err);
     }
  }

  async getMergeSummary(req: Request, res: Response, next: NextFunction) {
     try {
        const { owner, repo } = req.params;
        const { base, head } = req.body as { base: string; head: string };
        
        if (!base || !head) throw new BadRequestError('Base and Head branches are required');

        const token = this.getAccessToken(req);
        const githubService = new GitHubService(token);

        // 1. Get comparison diff from GitHub
        const comparison = await githubService.compareBranches(owner as string, repo as string, base, head);
        
        // 2. Extract diff text (GitHub API comparison includes files with patches)
        const diffText = (comparison.files || []).map(f => `File: ${f.filename}\n${f.patch || ''}`).join('\n\n');

        // 3. Generate AI summary
        const summary = await this.aiService.generateDiffSummary(diffText);
        
        res.json({ success: true, data: { summary } });
     } catch (err) {
        next(err);
     }
  }

  async analyzeMerge(req: Request, res: Response, next: NextFunction) {
    try {
      const { hunks } = req.body as { hunks: ConflictHunk[] };
      
      if (!hunks || hunks.length === 0) {
        throw new BadRequestError('At least one conflict hunk is required for analysis');
      }

      const analysis = await this.aiService.analyzeAllConflicts(hunks);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          analysis
        }
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async rebase(req: Request, res: Response, next: NextFunction) {
    try {
      const owner = req.params.owner as string;
      const repo = req.params.repo as string;
      const rebaseRequest = req.body as RebaseRequest;
      const token = this.getAccessToken(req);
      const githubService = new GitHubService(token);
      const io = this.getIO(req);

      const newHeadSha = await this.rebaseService.performRebase(githubService, owner, repo, rebaseRequest);

      // Notify clients
      io.to(`${owner}/${repo}`).emit('graph:updated', { type: 'rebase', newHeadSha });

      const response: ApiResponse<any> = {
        success: true,
        data: {
          newHeadSha
        }
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async getCommitStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const owner = req.params.owner as string;
      const repo = req.params.repo as string;
      const ref = req.params.ref as string;
      const token = this.getAccessToken(req);
      const githubService = new GitHubService(token);

      const status = await githubService.getCombinedStatus(owner, repo, ref);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          status
        }
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
}