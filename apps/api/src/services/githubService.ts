import { Octokit } from 'octokit';
import type { Branch, Commit, GitHubRepo, GitHubUser } from '@gitflow/shared';
import { inferBranchType } from '@gitflow/shared';

export class GitHubService {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  // ─── Repositories ──────────────────────────────────────────────────────────

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const { data } = await this.octokit.rest.repos.get({ owner, repo });
    return {
      id: data.id,
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
      url: data.html_url,
      description: data.description || undefined,
    };
  }

  async getUserRepos(): Promise<GitHubRepo[]> {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
    });
    return data.map((repo) => ({
      id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      url: repo.html_url,
      description: repo.description || undefined,
    }));
  }

  // ─── Branches ──────────────────────────────────────────────────────────────

  async getRepoBranches(owner: string, repo: string): Promise<Branch[]> {
    const { data: branches } = await this.octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    const branchDetails = await Promise.all(
      branches.map(async (b) => {
        const { data: detail } = await this.octokit.rest.repos.getBranch({
          owner,
          repo,
          branch: b.name,
        });

        // Fetch latest commit details
        const commit: Commit = {
          sha: detail.commit.sha,
          message: detail.commit.commit.message,
          author: detail.commit.commit.author?.name || 'unknown',
          authorAvatar: (detail.commit as any).author?.avatar_url,
          timestamp: detail.commit.commit.author?.date || new Date().toISOString(),
          additions: 0, // Requires separate call if needed
          deletions: 0,
        };

        return {
          id: b.name, // Using name as ID for simplicity in Git operations
          name: b.name,
          type: inferBranchType(b.name),
          status: 'clean' as const, // Default, updated by GraphService
          sha: b.commit.sha,
          aheadBy: 0, // Placeholder
          behindBy: 0, // Placeholder
          lastCommitAt: commit.timestamp,
          author: commit.author,
          authorAvatar: commit.authorAvatar,
          commits: [commit],
          isProtected: detail.protected,
          isDraft: false,
        };
      })
    );

    return branchDetails;
  }

  async deleteBranch(owner: string, repo: string, branchName: string) {
    return await this.octokit.rest.git.deleteRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
    });
  }

  // ─── Commits & Diff ──────────────────────────────────────────────────────────

  async compareBranches(owner: string, repo: string, base: string, head: string) {
    const { data } = await this.octokit.rest.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    });
    return data;
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    const { data } = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ('content' in data) {
       return Buffer.from(data.content, 'base64').toString('utf8');
    }
    throw new Error('Not a file');
  }

  // ─── Merge ──────────────────────────────────────────────────────────────────

  async mergeBranches(owner: string, repo: string, base: string, head: string, message?: string) {
    return await this.octokit.rest.repos.merge({
      owner,
      repo,
      base,
      head,
      commit_message: message,
    });
  }
}
