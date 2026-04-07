import { GitHubService } from './githubService';
import type { MergeConflict, ConflictFile, ConflictHunk, MergeRequest } from '@gitflow/shared';
import { v4 as uuidv4 } from 'uuid';

export class MergeService {
  /**
   * Attempts to merge a head branch into a base branch.
   * If conflicts occur, it returns a detailed MergeConflict object
   * with real file content fetched from both branches.
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
          // 2. Compare branches to identify changed files
          const comparison = await githubService.compareBranches(owner, repo, request.targetBranch, request.sourceBranch);
          const conflictingFiles: ConflictFile[] = [];

          if (comparison.files && comparison.files.length > 0) {
             // Fetch real file content from both branches for each modified file
             const filePromises = comparison.files
               .filter(file => file.status === 'modified')
               .map(async (file) => {
                 let oursContent: string;
                 let theirsContent: string;

                 try {
                   oursContent = await githubService.getFileContent(owner, repo, file.filename, request.targetBranch);
                 } catch {
                   oursContent = `// Unable to fetch content from ${request.targetBranch}`;
                 }

                 try {
                   theirsContent = await githubService.getFileContent(owner, repo, file.filename, request.sourceBranch);
                 } catch {
                   theirsContent = `// Unable to fetch content from ${request.sourceBranch}`;
                 }

                 const hunks: ConflictHunk[] = [
                   {
                     id: uuidv4(),
                     filePath: file.filename,
                     lineStart: 1,
                     lineEnd: Math.max(
                       oursContent.split('\n').length,
                       theirsContent.split('\n').length
                     ),
                     oursContent,
                     theirsContent,
                     resolved: false,
                   }
                 ];

                 return {
                   path: file.filename,
                   hunks,
                   totalConflicts: hunks.length,
                   resolvedConflicts: 0,
                 } as ConflictFile;
               });

             const results = await Promise.allSettled(filePromises);
             for (const result of results) {
               if (result.status === 'fulfilled') {
                 conflictingFiles.push(result.value);
               }
             }
          }

          // If no files were gathered, provide a fallback entry
          if (conflictingFiles.length === 0) {
             conflictingFiles.push({
                path: 'unknown',
                hunks: [
                   {
                      id: uuidv4(),
                      filePath: 'unknown',
                      lineStart: 0,
                      lineEnd: 0,
                      oursContent: '// Could not determine conflicting content',
                      theirsContent: '// Could not determine conflicting content',
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
    
    return await githubService.createCommit(
      owner,
      repo,
      targetBranch,
      commitMessage,
      resolutions.map(r => ({ path: r.filePath, content: r.content }))
    );
  }
}
