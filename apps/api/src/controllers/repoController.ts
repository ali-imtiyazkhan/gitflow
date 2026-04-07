import { Request, Response, NextFunction } from 'express';
import { GitHubService } from '@/services/githubService';
import { GraphService } from '@/services/graphService';
import { AIService } from '@/services/aiService';
import { ApiResponse, Branch, BranchGraph, StaleBranchReport } from '@gitflow/shared';

export class RepoController {
  private graphService = new GraphService();
  private aiService = new AIService();

  // Helper to get GitHubService from auth middleware
  private getGitHubService(req: Request): GitHubService {
    const token = (req as any).accessToken;
    return new GitHubService(token);
  }

  // ─── Branches ──────────────────────────────────────────────────────────────

  async getBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const { owner, repo } = req.params;
      const gitHubService = this.getGitHubService(req);

      const branches = await gitHubService.getRepoBranches(owner as string, repo as string);

      const response: ApiResponse<Branch[]> = {
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
      const { view = 'branch' } = req.query;
      const gitHubService = this.getGitHubService(req);

      const branches = await gitHubService.getRepoBranches(owner as string, repo as string);
      
      const graph = view === 'commit' 
        ? await this.graphService.generateCommitGraph(branches)
        : await this.graphService.generateGraph(branches);

      const response: ApiResponse<BranchGraph> = {
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
      const gitHubService = this.getGitHubService(req);

      await gitHubService.deleteBranch(owner as string, repo as string, branchName as string);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: `Branch ${branchName} deleted successfully` },
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async getBranchHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const { owner, repo } = req.params;
      const gitHubService = this.getGitHubService(req);

      const branches = await gitHubService.getRepoBranches(owner as string, repo as string);
      const report = await this.aiService.analyzeBranchHealth(branches);

      const response: ApiResponse<StaleBranchReport[]> = {
        success: true,
        data: report,
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
}
