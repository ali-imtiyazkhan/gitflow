import { GitHubService } from './githubService';
import { RebaseRequest } from '@gitflow/shared';

export class RebaseService {
  /**
   * Replays a set of commits onto a target branch.
   * After replaying, the SOURCE branch is updated to point to the new head
   * (standard rebase behavior: the feature branch moves on top of target).
   */
  async performRebase(
    githubService: GitHubService,
    owner: string,
    repo: string,
    request: RebaseRequest
  ): Promise<string> {
    const { sourceBranch, targetBranch, commits: commitShas } = request;
    const octokit = githubService.getOctokit();

    // 1. Get the current head of the target branch (the new base)
    const { data: targetRef } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${targetBranch}`,
    });
    
    let currentParentSha = targetRef.object.sha;

    // 2. Replay each commit onto the target
    for (const sha of commitShas) {
      // Get the original commit details
      const { data: originalCommit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: sha,
      });

      // Create a new commit with the same tree but the new parent
      const { data: newCommit } = await octokit.rest.git.createCommit({
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

    // 3. Update the SOURCE branch to point to the last replayed commit.
    //    This is the correct rebase behavior: the feature branch is moved
    //    on top of the target branch. We never modify the target.
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${sourceBranch}`,
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
    const octokit = githubService.getOctokit();

    // 1. Get the latest commit of the target branch
    const { data: targetRef } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${targetBranch}`,
    });
    
    const parentSha = targetRef.object.sha;

    // 2. Use the tree of the LAST commit in the squash list (the state we want to achieve)
    const lastSha = commitShas[commitShas.length - 1];
    const { data: lastCommit } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: lastSha,
    });

    // 3. Create the squashed commit
    const { data: squashedCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: newMessage,
      tree: lastCommit.tree.sha,
      parents: [parentSha],
    });

    // 4. Update the reference
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${targetBranch}`,
      sha: squashedCommit.sha,
      force: true,
    });

    return squashedCommit.sha;
  }
}
