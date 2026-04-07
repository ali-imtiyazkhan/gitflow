import axios from 'axios';
import type { Branch, MergeRequest, ResolveConflictRequest, ApiResponse, MergeConflict, BranchGraph, ConflictHunk, RebaseRequest, CIStatus, AISuggestion, StaleBranchReport, AIAnalysis, ApprovalRequest } from '@gitflow/shared';

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


// start merge
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

export async function fetchAllConflicts(owner: string, repo: string): Promise<(MergeConflict & { owner: string; repo: string })[]> {
  const res = await apiClient.get<ApiResponse<(MergeConflict & { owner: string; repo: string })[]>>(
    `/api/v1/repos/${owner}/${repo}/conflicts`
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
): Promise<AISuggestion & { explanation: string }> {
  const res = await apiClient.post<ApiResponse<AISuggestion & { explanation: string }>>(
    `/api/v1/repos/${owner}/${repo}/conflicts/ai-suggestion`,
    hunk
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'AI failed');
  return res.data.data;
}

export async function fetchAICommitMessage(
  owner: string,
  repo: string,
  hunks: ConflictHunk[]
): Promise<string> {
  const res = await apiClient.post<ApiResponse<{ message: string }>>(
    `/api/v1/repos/${owner}/${repo}/conflicts/ai-commit-message`,
    { hunks }
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'AI failed to generate commit message');
  return res.data.data.message;
}

export async function fetchMergeSummary(
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<AIAnalysis> {
  const res = await apiClient.post<ApiResponse<{ summary: AIAnalysis }>>(
    `/api/v1/repos/${owner}/${repo}/merge-summary`,
    { base, head }
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'AI failed to generate merge summary');
  return res.data.data.summary;
}

export async function fetchBranchHealth(
  owner: string,
  repo: string
): Promise<StaleBranchReport[]> {
  const res = await apiClient.get<ApiResponse<StaleBranchReport[]>>(
    `/api/v1/repos/${owner}/${repo}/branch-health`
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Failed to fetch branch health');
  return res.data.data;
}

export async function fetchGlobalAnalysis(
  owner: string,
  repo: string,
  hunks: ConflictHunk[]
): Promise<AIAnalysis> {
  const res = await apiClient.post<ApiResponse<{ analysis: AIAnalysis }>>(
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

// Operational Extensions 

export async function fetchApprovals(owner: string, repo: string): Promise<ApprovalRequest[]> {
  const res = await apiClient.get<ApiResponse<ApprovalRequest[]>>(`/api/v1/repos/${owner}/${repo}/approvals`);
  return res.data.data || [];
}

export async function createApproval(owner: string, repo: string, data: any): Promise<ApprovalRequest> {
  const res = await apiClient.post<ApiResponse<ApprovalRequest>>(`/api/v1/repos/${owner}/${repo}/approvals`, data);
  if (!res.data.data) throw new Error('Failed to create approval');
  return res.data.data;
}

export async function approveRequest(owner: string, repo: string, id: string): Promise<ApprovalRequest> {
  const res = await apiClient.post<ApiResponse<ApprovalRequest>>(`/api/v1/repos/${owner}/${repo}/approvals/${id}/approve`);
  if (!res.data.data) throw new Error('Failed to approve');
  return res.data.data;
}

export async function fetchEvents(owner: string, repo: string, limit = 50): Promise<any[]> {
  const res = await apiClient.get<ApiResponse<any[]>>(`/api/v1/repos/${owner}/${repo}/events`, { params: { limit } });
  return res.data.data || [];
}

export async function replayEvent(owner: string, repo: string, eventId: string): Promise<void> {
  await apiClient.post(`/api/v1/repos/${owner}/${repo}/events/${eventId}/replay`);
}

export async function createPullRequest(owner: string, repo: string, data: any): Promise<any> {
  const res = await apiClient.post<ApiResponse<any>>(`/api/v1/repos/${owner}/${repo}/pull-requests`, data);
  if (!res.data.data) throw new Error('Failed to create PR');
  return res.data.data;
}

export default apiClient;
