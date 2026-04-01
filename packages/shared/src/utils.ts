import type { Branch, BranchType } from './types';
import { BRANCH_TYPE_PREFIXES, STALE_BRANCH_DAYS } from './constants';

/**
 * Infer branch type from branch name using common naming conventions.
 */
export function inferBranchType(name: string): BranchType {
  if (name === 'main' || name === 'master') return 'main';
  if (name === 'develop') return 'develop';
  if (name.startsWith('feature/')) return 'feature';
  if (name.startsWith('hotfix/')) return 'hotfix';
  if (name.startsWith('release/')) return 'release';
  if (name.startsWith('chore/')) return 'chore';
  return 'feature';
}

/**
 * Returns true if a branch name is considered a base/trunk branch.
 */
export function isBaseBranch(name: string): boolean {
  return ['main', 'master', 'develop', 'trunk'].includes(name);
}

/**
 * Returns true if the branch has been inactive for STALE_BRANCH_DAYS or more.
 */
export function isStaleBranch(branch: Branch): boolean {
  const lastCommit = new Date(branch.lastCommitAt);
  const now = new Date();
  const diffDays = (now.getTime() - lastCommit.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= STALE_BRANCH_DAYS;
}

/**
 * Formats a branch name with the correct prefix for its type.
 */
export function formatBranchName(name: string, type: BranchType): string {
  const prefix = BRANCH_TYPE_PREFIXES[type];
  if (!prefix) return name;
  if (name.startsWith(prefix)) return name;
  return `${prefix}${name}`;
}

/**
 * Short-formats a commit SHA (first 7 chars).
 */
export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

/**
 * Returns a human-readable relative time string.
 */
export function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Creates a standard API error object.
 */
export function createApiError(code: string, message: string, details?: Record<string, unknown>) {
  return { code, message, details };
}
