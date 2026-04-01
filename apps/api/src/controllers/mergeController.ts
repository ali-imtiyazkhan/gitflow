import { Request, Response, NextFunction } from 'express';
import { GitHubService } from '@/services/githubService';
import { MergeService } from '@/services/mergeService';
import { ApiResponse, MergeRequest, ResolveConflictRequest } from '@gitflow/shared';
import { BadRequestError, NotFoundError, UnauthorizedError } from '@/utils/apiError';
import { prisma } from '@/lib/prisma';
import { Server } from 'socket.io';

export class MergeController {
  private mergeService = new MergeService();

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

  // ─── Merge ──────────────────────────────────────────────────────────────────

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

       // Update status in database
       await prisma.conflict.update({
          where: { id: resolveRequest.conflictId },
          data: { status: 'resolved' }
       });

       // Notify clients about resolution
       io.to(repoId).emit('conflict:resolved', {
          id: resolveRequest.conflictId,
          repoId,
       });

       const response: ApiResponse<any> = {
          success: true,
          data: {
             resolved: true,
             message: 'Conflict resolved and broadcasted to clients',
          },
       };
       res.json(response);
    } catch (err) {
       next(err);
    }
  }
}