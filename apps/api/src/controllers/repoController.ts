import { Request, Response, NextFunction } from 'express';
import { GitHubService } from '@/services/githubService';
import { GraphService } from '@/services/graphService';
import { ApiResponse } from '@gitflow/shared';

export class RepoController {
  private graphService = new GraphService();

  // Helper to extract access token from headers
  private getAccessToken(req: Request): string {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }
    return authHeader.split(' ')[1];
  }

  // ─── Branches ──────────────────────────────────────────────────────────────

  async getBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const { owner, repo } = req.params;
      const token = this.getAccessToken(req);
      const gitHubService = new GitHubService(token);

      const branches = await gitHubService.getRepoBranches(owner as string, repo as string);

      const response: ApiResponse<any> = {
        success: true,
        data: branches,
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  // ─── Graph ─────────────────────────────────────────────────────────────────

  async getGraph(req: Request, res: Response, next: NextFunction) {
    try {
      const { owner, repo } = req.params;
      const token = this.getAccessToken(req);
      const gitHubService = new GitHubService(token);

      const branches = await gitHubService.getRepoBranches(owner as string, repo as string);
      const graph = await this.graphService.generateGraph(branches);

      const response: ApiResponse<any> = {
        success: true,
        data: graph,
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async deleteBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { owner, repo, branchName } = req.params;
      const token = this.getAccessToken(req);
      const gitHubService = new GitHubService(token);

      await gitHubService.deleteBranch(owner as string, repo as string, branchName as string);

      const response: ApiResponse<any> = {
        success: true,
        data: { message: `Branch ${branchName} deleted successfully` },
      };
      res.json(response);
    } catch (err: any) {
      next(err);
    }
  }
}
