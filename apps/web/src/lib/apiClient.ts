import axios from 'axios';
import type { Branch, MergeRequest, ResolveConflictRequest, ApiResponse, MergeConflict, BranchGraph, ConflictHunk, RebaseRequest, CIStatus } from '@gitflow/shared';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach GitHub token from session on every request
export function setAuthToken(token: string) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export async function fetchBranches(owner: string, repo: string): Promise<Branch[]> {
  const res = await apiClient.get<ApiResponse<Branch[]>>(
    `/api/v1/repos/${owner}/${repo}/branches`
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Failed to fetch branches');
  return res.data.data;
}

export async function fetchBranchGraph(owner: string, repo: string, view: 'branch' | 'commit' = 'branch'): Promise<BranchGraph> {
  const res = await apiClient.get<ApiResponse<BranchGraph>>(
    `/api/v1/repos/${owner}/${repo}/graph`,
    { params: { view } }
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Failed to fetch graph');
  return res.data.data;
}

export async function deleteBranch(owner: string, repo: string, branchName: string): Promise<void> {
  const res = await apiClient.delete<ApiResponse<any>>(
    `/api/v1/repos/${owner}/${repo}/branches/${branchName}`
  );
  if (!res.data.success) throw new Error(res.data.error?.message ?? 'Failed to delete branch');
}

// ────────────────────────────────────────────────────────────────────────────

export async function startMerge(
  owner: string,
  repo: string,
  request: MergeRequest
): Promise<{ conflictId?: string; merged: boolean }> {
  const res = await apiClient.post<ApiResponse<{ conflictId?: string; merged: boolean }>>(
    `/api/v1/repos/${owner}/${repo}/merge`,
    request
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Merge failed');
  return res.data.data;
}


export async function fetchConflict(
  owner: string,
  repo: string,
  conflictId: string
): Promise<MergeConflict> {
  const res = await apiClient.get<ApiResponse<MergeConflict>>(
    `/api/v1/repos/${owner}/${repo}/conflicts/${conflictId}`
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Failed to fetch conflict');
  return res.data.data;
}

export async function fetchAllConflicts(): Promise<any[]> {
  const res = await apiClient.get<ApiResponse<any[]>>(
    '/api/v1/repos/conflicts/all'
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Failed to fetch all conflicts');
  return res.data.data;
}

export async function resolveConflict(
  owner: string,
  repo: string,
  request: ResolveConflictRequest
): Promise<void> {
  const res = await apiClient.post<ApiResponse<void>>(
    `/api/v1/repos/${owner}/${repo}/conflicts/resolve`,
    request
  );
  if (!res.data.success) throw new Error(res.data.error?.message ?? 'Failed to resolve conflict');
}

export async function fetchAISuggestion(
  owner: string,
  repo: string,
  hunk: ConflictHunk
): Promise<{ suggestion: string; explanation: string }> {
  const res = await apiClient.post<ApiResponse<{ suggestion: string; explanation: string }>>(
    `/api/v1/repos/${owner}/${repo}/conflicts/ai-suggestion`,
    hunk
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'AI failed');
  return res.data.data;
}

export async function fetchGlobalAnalysis(
  owner: string,
  repo: string,
  hunks: ConflictHunk[]
): Promise<string> {
  const res = await apiClient.post<ApiResponse<{ analysis: string }>>(
    `/api/v1/repos/${owner}/${repo}/conflicts/analyze`,
    { hunks }
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Analysis failed');
  return res.data.data.analysis;
}

export async function fetchCommitStatus(
  owner: string,
  repo: string,
  ref: string
): Promise<CIStatus> {
  const res = await apiClient.get<ApiResponse<{ status: CIStatus }>>(
    `/api/v1/repos/${owner}/${repo}/status/${ref}`
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Failed to fetch status');
  return res.data.data.status;
}

export async function performRebase(
  owner: string,
  repo: string,
  request: RebaseRequest
): Promise<string> {
  const res = await apiClient.post<ApiResponse<{ newHeadSha: string }>>(
    `/api/v1/repos/${owner}/${repo}/rebase`,
    request
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Rebase failed');
  return res.data.data.newHeadSha;
}

export default apiClient;
