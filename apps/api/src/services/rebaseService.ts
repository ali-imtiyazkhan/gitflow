import { GitHubService } from './githubService';
import { RebaseRequest } from '@gitflow/shared';

export class RebaseService {
  /**
   * Replays a set of commits onto a target branch.
   * This is a simplified "visual rebase" implementation.
   */
  async performRebase(
    githubService: GitHubService,
    owner: string,
    repo: string,
    request: RebaseRequest
  ): Promise<string> {
    const { sourceBranch, targetBranch, commits: commitShas } = request;

    // 1. Get the current head of the target branch
    const targetRepo = await githubService.getRepo(owner, repo);
    const { data: targetRef } = await (githubService as any).octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${targetBranch}`,
    });
    
    let currentParentSha = targetRef.object.sha;

    // 2. Replay each commit
    // Note: This implementation assumes the commits are already in the desired order in the request.
    for (const sha of commitShas) {
      // Get the original commit details
      const { data: originalCommit } = await (githubService as any).octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: sha,
      });

      // Create a new commit with the same tree but the new parent
      const { data: newCommit } = await (githubService as any).octokit.rest.git.createCommit({
        owner,
        repo,
        message: originalCommit.message,
        tree: originalCommit.tree.sha,
        parents: [currentParentSha],
        author: originalCommit.author,
        committer: originalCommit.committer,
      });

      currentParentSha = newCommit.sha;
    }

    // 3. Update the target branch to point to the last replayed commit
    // WARNING: This is a force update if we are moving the target branch head significantly.
    // In a real rebase, we often update the *source* branch to the new head.
    // But for this "Visual Rebase" tool, we might be rebasing a feature branch onto develop.
    await (githubService as any).octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${targetBranch}`,
      sha: currentParentSha,
      force: true, // Force update since we are rewriting history
    });

    return currentParentSha;
  }

  /**
   * Squashes multiple commits into a single commit on the target branch.
   */
  async performSquash(
    githubService: GitHubService,
    owner: string,
    repo: string,
    targetBranch: string,
    commitShas: string[],
    newMessage: string
  ): Promise<string> {
    // 1. Get the latest commit of the target branch
    const { data: targetRef } = await (githubService as any).octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${targetBranch}`,
    });
    
    const parentSha = targetRef.object.sha;

    // 2. Use the tree of the LAST commit in the squash list (the state we want to achieve)
    const lastSha = commitShas[commitShas.length - 1];
    const { data: lastCommit } = await (githubService as any).octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: lastSha,
    });

    // 3. Create the squashed commit
    const { data: squashedCommit } = await (githubService as any).octokit.rest.git.createCommit({
      owner,
      repo,
      message: newMessage,
      tree: lastCommit.tree.sha,
      parents: [parentSha],
    });

    // 4. Update the reference
    await (githubService as any).octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${targetBranch}`,
      sha: squashedCommit.sha,
      force: true,
    });

    return squashedCommit.sha;
  }
}
