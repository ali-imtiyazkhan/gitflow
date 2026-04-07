import { Octokit } from 'octokit';
import type { Branch, CIStatus, Commit, GitHubRepo, GitHubUser, CIState } from '@gitflow/shared';
import { inferBranchType } from '@gitflow/shared';
import { apiCache } from '@/lib/cache';

export function createOctokit(token: string) {
  return new Octokit({ auth: token });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Concurrency limiter — runs promises in batches to avoid GitHub rate throttling */
async function batchAll<T>(tasks: (() => Promise<T>)[], concurrency = 5): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
  }
  return results;
}

/** Retry wrapper with exponential backoff for GitHub 403/429 rate-limit errors */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 1000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const isRateLimited = status === 403 || status === 429;
      const isLastAttempt = attempt === retries;

      if (!isRateLimited || isLastAttempt) throw err;

      // Respect GitHub Retry-After header if present
      const retryAfter = err?.response?.headers?.['retry-after'];
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : baseDelayMs * Math.pow(2, attempt);

      console.warn(`[GitHubService] Rate limited (${status}). Retrying in ${delayMs}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  // TypeScript: unreachable but satisfies the return type
  throw new Error('withRetry: exhausted retries');
}

export class GitHubService {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  /**
   * Exposes the Octokit instance for advanced Git Data API usage.
   * Prefer using dedicated methods when available.
   */
  getOctokit(): Octokit {
    return this.octokit;
  }

  // ─── Repositories ──────────────────────────────────────────────────────────

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const { data } = await withRetry(() =>
      this.octokit.rest.repos.get({ owner, repo })
    );
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
    const { data } = await withRetry(() =>
      this.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
      })
    );
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
    const { data: branches } = await withRetry(() =>
      this.octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      })
    );

    // Use batched concurrency to avoid hammering GitHub API
    const branchTasks = branches.map((b) => async () => {
      const { data: detail } = await withRetry(() =>
        this.octokit.rest.repos.getBranch({ owner, repo, branch: b.name })
      );

      // Fetch latest commit details
      const { data: latestCommitDetail } = await withRetry(() =>
        this.octokit.rest.git.getCommit({
          owner,
          repo,
          commit_sha: detail.commit.sha,
        })
      );

      // Fetch cached CI status for head
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
      const { data: commitHistory } = await withRetry(() =>
        this.octokit.rest.repos.listCommits({
          owner,
          repo,
          sha: b.name,
          per_page: 20,
        })
      );

      const history: Commit[] = commitHistory.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author?.name || 'unknown',
        authorAvatar: (c as any).author?.avatar_url,
        timestamp: c.commit.author?.date || new Date().toISOString(),
        parents: c.parents.map((p) => p.sha),
        ciStatus: 'none' as CIState, // Default for history to save API calls
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
    });

    return batchAll(branchTasks, 5);
  }

  /**
   * Fetches the combined CI/CD status for a given ref (branch or commit).
   * Results are cached with a 60-second TTL to reduce API calls.
   */
  async getCombinedStatus(owner: string, repo: string, ref: string): Promise<CIState> {
    const cacheKey = `ci:${owner}/${repo}:${ref}`;
    const cached = apiCache.get<CIState>(cacheKey);
    if (cached !== undefined) return cached;

    try {
      // 1. Try Combined Status API
      const { data } = await withRetry(() =>
        this.octokit.rest.repos.getCombinedStatusForRef({ owner, repo, ref })
      );

      if (data.state === 'success') { apiCache.set(cacheKey, 'success'); return 'success'; }
      if (data.state === 'failure' || data.state === 'error') { apiCache.set(cacheKey, 'failure'); return 'failure'; }
      if (data.state === 'pending') { apiCache.set(cacheKey, 'pending', 15_000); return 'pending'; } // short TTL for pending

      // 2. Try Check Runs API
      const { data: checks } = await withRetry(() =>
        this.octokit.rest.checks.listForRef({ owner, repo, ref })
      );

      if (checks.total_count > 0) {
        const anyFailed = checks.check_runs.some(
          (run) =>
            run.status === 'completed' &&
            (run.conclusion === 'failure' || run.conclusion === 'timed_out' || run.conclusion === 'cancelled')
        );
        const allCompleted = checks.check_runs.every((run) => run.status === 'completed');

        let result: CIState;
        if (anyFailed) result = 'failure';
        else if (allCompleted) result = 'success';
        else result = 'pending';

        apiCache.set(cacheKey, result, result === 'pending' ? 15_000 : 60_000);
        return result;
      }

      apiCache.set(cacheKey, 'none');
      return 'none';
    } catch (error) {
      console.error(`Failed to fetch status for ${ref}:`, error);
      return 'unknown';
    }
  }

  async getCheckRuns(
    owner: string,
    repo: string,
    ref: string
  ): Promise<Array<{ name: string; status: string; conclusion: string | null; url: string }>> {
    try {
      const { data } = await withRetry(() =>
        this.octokit.rest.checks.listForRef({ owner, repo, ref, per_page: 10 })
      );
      return data.check_runs.map(r => ({
        name: r.name,
        status: r.status,
        conclusion: r.conclusion ?? null,
        url: r.html_url ?? '',
      }));
    } catch {
      return [];
    }
  }

  async deleteBranch(owner: string, repo: string, branchName: string) {
    return await withRetry(() =>
      this.octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
      })
    );
  }

  // ─── Commits & Diff ──────────────────────────────────────────────────────────

  async compareBranches(owner: string, repo: string, base: string, head: string) {
    const { data } = await withRetry(() =>
      this.octokit.rest.repos.compareCommits({ owner, repo, base, head })
    );
    return data;
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    const { data } = await withRetry(() =>
      this.octokit.rest.repos.getContent({ owner, repo, path, ref })
    );

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
    const { data: refData } = await withRetry(() =>
      this.octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` })
    );
    const latestCommitSha = refData.object.sha;

    // 2. Get the tree SHA of that commit
    const { data: commitData } = await withRetry(() =>
      this.octokit.rest.git.getCommit({ owner, repo, commit_sha: latestCommitSha })
    );
    const baseTreeSha = commitData.tree.sha;

    // 3. Create a new tree with the file modifications
    const tree = files.map((f) => ({
      path: f.path,
      mode: '100644' as const, // standard file
      type: 'blob' as const,
      content: f.content,
    }));

    const { data: newTreeData } = await withRetry(() =>
      this.octokit.rest.git.createTree({ owner, repo, base_tree: baseTreeSha, tree })
    );

    // 4. Create the commit
    const { data: newCommitData } = await withRetry(() =>
      this.octokit.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: newTreeData.sha,
        parents: [latestCommitSha],
      })
    );

    // 5. Update the reference
    await withRetry(() =>
      this.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommitData.sha,
        force: false,
      })
    );

    return newCommitData.sha;
  }
}
