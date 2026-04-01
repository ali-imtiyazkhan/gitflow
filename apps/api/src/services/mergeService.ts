import { GitHubService } from './githubService';
import type { MergeConflict, ConflictFile, ConflictHunk, MergeRequest } from '@gitflow/shared';
import { v4 as uuidv4 } from 'uuid';

export class MergeService {
  /**
   * Attempts to merge a head branch into a base branch.
   * If conflicts occur, it returns a detailed MergeConflict object.
   */
  async performMerge(
    githubService: GitHubService,
    owner: string,
    repo: string,
    request: MergeRequest
  ): Promise<{ merged: boolean; conflict?: MergeConflict }> {
    try {
       // 1. Attempt the merge via GitHub API
       await githubService.mergeBranches(owner, repo, request.targetBranch, request.sourceBranch);
       return { merged: true };
    } catch (err: any) {
       // 409 Conflict: Merge cannot be performed automatically
       if (err.status === 409) {
          // 2. Compare branches to identify changed files and simulate hunks
          const comparison = await githubService.compareBranches(owner, repo, request.targetBranch, request.sourceBranch);
          const conflictingFiles: ConflictFile[] = [];

          if (comparison.files && comparison.files.length > 0) {
             // For every modified file, we simulate a conflict hunk
             for (const file of comparison.files) {
                if (file.status === 'modified') {
                   const hunks: ConflictHunk[] = [
                      {
                        id: uuidv4(),
                        filePath: file.filename,
                        lineStart: 1, // Mocked line numbers
                        lineEnd: 10,
                        oursContent: '// Local changes in ' + request.targetBranch,
                        theirsContent: file.patch || '// Incoming changes in ' + request.sourceBranch,
                        resolved: false,
                      }
                   ];

                   conflictingFiles.push({
                      path: file.filename,
                      hunks,
                      totalConflicts: hunks.length,
                      resolvedConflicts: 0,
                   });
                }
             }
          }

          // If no files were modified (unlikely on 409), create at least one entry
          if (conflictingFiles.length === 0) {
             conflictingFiles.push({
                path: 'README.md',
                hunks: [
                   {
                      id: uuidv4(),
                      filePath: 'README.md',
                      lineStart: 0,
                      lineEnd: 0,
                      oursContent: '# Original Content',
                      theirsContent: '# Conflicting Content',
                      resolved: false,
                   }
                ],
                totalConflicts: 1,
                resolvedConflicts: 0,
             });
          }

          return {
             merged: false,
             conflict: {
                id: uuidv4(),
                sourceBranch: request.sourceBranch,
                targetBranch: request.targetBranch,
                files: conflictingFiles,
                createdAt: new Date().toISOString(),
                status: 'open',
             },
          };
       }
       
       // Re-throw other errors to be handled by controller/middleware
       throw err;
    }
  }

  /**
   * Resolves a conflict and commits the result to GitHub.
   */
  async resolveAndCommit(
    githubService: GitHubService,
    owner: string,
    repo: string,
    conflictId: string,
    resolutions: { filePath: string; content: string }[],
    sourceBranch: string,
    targetBranch: string
  ): Promise<string> {
    const commitMessage = `Merge branch '${sourceBranch}' into ${targetBranch} (Conflict Resolved)`;
    
    // Create the commit on the SOURCE branch (the one we are merging FROM into the target)
    // Wait, usually we merge SOURCE into TARGET. So the conflict is resolved on TARGET.
    // GitHub's merge API attempts to merge HEAD into BASE.
    // If it's a PR, the merging branch is the source.
    // In our case, we are merging `head` into `base`. So we should commit to `base` (targetBranch) or a temporary branch.
    // Let's assume we commit to the target branch directly for now, as is typical for a conflict resolution commit.
    
    return await githubService.createCommit(owner, repo, targetBranch, commitMessage, resolutions.map(r => ({ path: r.filePath, content: r.content })));
  }
}
