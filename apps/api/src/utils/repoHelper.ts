import { BranchStatus } from '@gitflow/shared';

export class RepoHelper {

  static getBranchStatus(ahead: number, behind: number): BranchStatus {
    if (ahead > 0 && behind > 0) return 'diverged';
    if (ahead > 0) return 'ahead';
    if (behind > 0) return 'behind';
    return 'clean';
  }

  static isValidBranchName(name: string): boolean {
    const branchNameRegex = /^(?!\/|.*?\/\/|.*?\.\.|.*?\.\/|.*?@\{|.*?[\\^ \x00-\x20\x7f~:?*\[])[^\x00-\x20\x7f~:?*\[]+(?<!\.lock|[/.])$/;
    return branchNameRegex.test(name);
  }

  static isPermanentBranch(name: string): boolean {
    return ['main', 'master', 'develop'].includes(name);
  }
}
