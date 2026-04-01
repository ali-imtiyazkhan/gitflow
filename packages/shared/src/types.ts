// ─── Branch Types ───────────────────────────────────────────────────────────

export type BranchType = 'main' | 'develop' | 'feature' | 'hotfix' | 'release' | 'chore';

export type BranchStatus =
  | 'clean'
  | 'ahead'
  | 'behind'
  | 'diverged'
  | 'conflict'
  | 'merged'
  | 'stale';

export interface Branch {
  id: string;
  name: string;
  type: BranchType;
  status: BranchStatus;
  sha: string;
  aheadBy: number;
  behindBy: number;
  lastCommitAt: string;
  author: string;
  authorAvatar?: string;
  commits: Commit[];
  isProtected: boolean;
  isDraft: boolean;
  /** UI canvas position */
  position?: { x: number; y: number };
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  authorAvatar?: string;
  timestamp: string;
  parents: string[];
  additions: number;
  deletions: number;
}

// ─── Conflict Types ──────────────────────────────────────────────────────────

export type ConflictResolutionStrategy = 'ours' | 'theirs' | 'both' | 'manual';

export interface ConflictHunk {
  id: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  oursContent: string;
  theirsContent: string;
  resolved: boolean;
  resolution?: ConflictResolutionStrategy;
  resolvedContent?: string;
}

export interface ConflictFile {
  path: string;
  hunks: ConflictHunk[];
  totalConflicts: number;
  resolvedConflicts: number;
}

export interface MergeConflict {
  id: string;
  sourceBranch: string;
  targetBranch: string;
  files: ConflictFile[];
  createdAt: string;
  status: 'open' | 'resolved' | 'aborted';
}

// ─── Graph Types (Canvas) ────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  type: 'branch' | 'commit';
  branchId?: string;
  commitSha?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data?: any;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
  type: 'branch-head' | 'commit-parent' | 'merge-into' | 'rebase-onto';
}

export interface BranchGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── GitHub Integration Types ────────────────────────────────────────────────

export interface GitHubRepo {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  url: string;
  description?: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  sourceBranch: string;
  targetBranch: string;
  author: string;
  reviewers: string[];
  isDraft: boolean;
  mergeable: boolean | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}

// API Response Types 

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  page?: number;
  perPage?: number;
  total?: number;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

// ─── WebSocket Event Types ────────────────────────────────────────────────────

export type WSEventType =
  | 'branch:created'
  | 'branch:deleted'
  | 'branch:updated'
  | 'merge:started'
  | 'merge:completed'
  | 'merge:conflict'
  | 'conflict:resolved'
  | 'graph:updated';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: string;
  repoId: string;
}

// ─── Action Types (for merge operations) ─────────────────────────────────────

export interface MergeRequest {
  sourceBranch: string;
  targetBranch: string;
  strategy: 'merge' | 'squash' | 'rebase';
  message?: string;
  deleteAfterMerge?: boolean;
}

export interface ResolveConflictRequest {
  conflictId: string;
  files: Array<{
    filePath: string;
    content: string;
  }>;
}
