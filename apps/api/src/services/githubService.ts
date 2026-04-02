import { Octokit } from 'octokit';
import type { Branch, CIStatus, Commit, GitHubRepo, GitHubUser } from '@gitflow/shared';
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

  // Branches

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
        const { data: latestCommitDetail } = await this.octokit.rest.git.getCommit({
          owner,
          repo,
          commit_sha: detail.commit.sha,
        });

        // Fetch status for head
        const ciStatus = await this.getCombinedStatus(owner, repo, detail.commit.sha);

        const commit: Commit = {
          sha: detail.commit.sha,
          message: detail.commit.commit.message,
          author: detail.commit.commit.author?.name || 'unknown',
          authorAvatar: (detail.commit as any).author?.avatar_url,
          timestamp: detail.commit.commit.author?.date || new Date().toISOString(),
          parents: latestCommitDetail.parents.map((p) => p.sha),
          additions: 0,
          deletions: 0,
          ciStatus,
        };

        // Fetch recent history
        const { data: commitHistory } = await this.octokit.rest.repos.listCommits({
          owner,
          repo,
          sha: b.name,
          per_page: 20,
        });

        const history: Commit[] = commitHistory.map((c) => ({
          sha: c.sha,
          message: c.commit.message,
          author: c.commit.author?.name || 'unknown',
          authorAvatar: (c as any).author?.avatar_url,
          timestamp: c.commit.author?.date || new Date().toISOString(),
          parents: c.parents.map((p) => p.sha),
          ciStatus: 'none', // Default to none for history to save API calls
          additions: 0,
          deletions: 0,
        }));

        return {
          id: b.name,
          name: b.name,
          type: inferBranchType(b.name),
          status: 'clean' as const,
          sha: b.commit.sha,
          aheadBy: 0,
          behindBy: 0,
          lastCommitAt: commit.timestamp,
          author: commit.author,
          authorAvatar: commit.authorAvatar,
          commits: history,
          isProtected: detail.protected,
          isDraft: false,
          ciStatus,
        };
      })
    );

    return branchDetails;
  }

  /**
   * Fetches the combined CI/CD status for a given ref (branch or commit).
   */
  async getCombinedStatus(owner: string, repo: string, ref: string): Promise<CIStatus> {
    try {
      // 1. Try Combined Status API (older style, used by many CI providers)
      const { data } = await this.octokit.rest.repos.getCombinedStatusForRef({
        owner,
        repo,
        ref,
      });

      if (data.state === 'success') return 'success';
      if (data.state === 'failure' || data.state === 'error') return 'failure';
      if (data.state === 'pending') return 'pending';

      // 2. Try Check Runs API (modern style, used by GitHub Actions)
      const { data: checks } = await this.octokit.rest.checks.listForRef({
        owner,
        repo,
        ref,
      });

      if (checks.total_count > 0) {
        const anyFailed = checks.check_runs.some(
          (run) =>
            run.status === 'completed' &&
            (run.conclusion === 'failure' || run.conclusion === 'timed_out')
        );
        const allCompleted = checks.check_runs.every((run) => run.status === 'completed');

        if (anyFailed) return 'failure';
        if (allCompleted) return 'success';
        return 'pending';
      }

      return 'none';
    } catch (error) {
      console.error(`Failed to fetch status for ${ref}:`, error);
      return 'none';
    }
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

  // ─── Git Data API ─────────────────────────────────────────────────────────

  /**
   * Creates a multi-file commit on a target branch.
   */
  async createCommit(
    owner: string,
    repo: string,
    branch: string,
    message: string,
    files: { path: string; content: string }[]
  ): Promise<string> {
    // 1. Get the latest commit SHA of the branch
    const { data: refData } = await this.octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const latestCommitSha = refData.object.sha;

    // 2. Get the tree SHA of those commits
    const { data: commitData } = await this.octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha,
    });
    const baseTreeSha = commitData.tree.sha;

    // 3. Create a new tree with the file modifications
    const tree = files.map((f) => ({
      path: f.path,
      mode: '100644' as const, // standard file
      type: 'blob' as const,
      content: f.content,
    }));

    const { data: newTreeData } = await this.octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree,
    });

    // 4. Create the commit
    const { data: newCommitData } = await this.octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: newTreeData.sha,
      parents: [latestCommitSha],
    });

    // 5. Update the reference
    await this.octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommitData.sha,
      force: false,
    });

    return newCommitData.sha;
  }
}
