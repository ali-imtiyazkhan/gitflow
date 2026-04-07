import { Request, Response, NextFunction } from 'express';
import { GitHubService } from '@/services/githubService';
import { MergeService } from '@/services/mergeService';
import { AIService } from '@/services/aiService';
import { RebaseService } from '@/services/rebaseService';
import { ApiResponse, MergeRequest, ResolveConflictRequest, ConflictHunk, RebaseRequest, MergeConflict, AISuggestion, AIAnalysis } from '@gitflow/shared';
import { BadRequestError, NotFoundError } from '@/utils/apiError';
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

  // Helper to get GitHubService from auth middleware
  private getGitHubService(req: Request): GitHubService {
    const token = (req as any).accessToken;
    return new GitHubService(token);
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

      const gitHubService = this.getGitHubService(req);
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

        const response: ApiResponse<{ merged: boolean; conflictId: string }> = {
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

      const response: ApiResponse<{ merged: boolean }> = {
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

       const response: ApiResponse<MergeConflict> = {
          success: true,
          data: {
             ...conflict,
             files: conflict.hunks as unknown as MergeConflict['files'],
             createdAt: conflict.createdAt.toISOString(),
             status: conflict.status as MergeConflict['status'],
          } as MergeConflict,
       };
       res.json(response);
    } catch (err) {
       next(err);
    }
  }

  async getAllConflicts(req: Request, res: Response, next: NextFunction) {
    try {
      const { owner, repo } = req.params;

      // Scope conflicts to the specific repository (skip if _all wildcard)
      const whereClause: Record<string, unknown> = { status: 'open' };
      if (owner && repo && owner !== '_all' && repo !== '_all') {
        whereClause.owner = owner as string;
        whereClause.repo = repo as string;
      }

      const conflicts = await prisma.conflict.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });

      const response: ApiResponse<(MergeConflict & { owner: string; repo: string })[]> = {
        success: true,
        data: conflicts.map((c) => ({
          id: c.id,
          owner: c.owner,
          repo: c.repo,
          sourceBranch: c.sourceBranch,
          targetBranch: c.targetBranch,
          files: c.hunks as unknown as MergeConflict['files'],
          createdAt: c.createdAt.toISOString(),
          status: c.status as MergeConflict['status'],
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
       const githubService = this.getGitHubService(req);
       
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

       const response: ApiResponse<{ resolved: boolean; commitSha: string; message: string }> = {
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

      const response: ApiResponse<AISuggestion & { explanation: string }> = {
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
        const response: ApiResponse<{ message: string }> = {
          success: true,
          data: { message },
        };
        res.json(response);
     } catch (err) {
        next(err);
     }
  }

  async getMergeSummary(req: Request, res: Response, next: NextFunction) {
     try {
        const { owner, repo } = req.params;
        const { base, head } = req.body as { base: string; head: string };
        
        if (!base || !head) throw new BadRequestError('Base and Head branches are required');

        const githubService = this.getGitHubService(req);

        // 1. Get comparison diff from GitHub
        const comparison = await githubService.compareBranches(owner as string, repo as string, base, head);
        
        // 2. Extract diff text (GitHub API comparison includes files with patches)
        const diffText = (comparison.files || []).map(f => `File: ${f.filename}\n${f.patch || ''}`).join('\n\n');

        // 3. Generate AI summary
        const summary = await this.aiService.generateDiffSummary(diffText);
        
        const response: ApiResponse<{ summary: AIAnalysis }> = {
          success: true,
          data: { summary },
        };
        res.json(response);
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

      const response: ApiResponse<{ analysis: AIAnalysis }> = {
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
      const githubService = this.getGitHubService(req);
      const io = this.getIO(req);

      const newHeadSha = await this.rebaseService.performRebase(githubService, owner, repo, rebaseRequest);

      // Notify clients
      io.to(`${owner}/${repo}`).emit('graph:updated', { type: 'rebase', newHeadSha });

      const response: ApiResponse<{ newHeadSha: string }> = {
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
      const githubService = this.getGitHubService(req);

      const status = await githubService.getCombinedStatus(owner, repo, ref);

      const response: ApiResponse<{ status: string }> = {
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