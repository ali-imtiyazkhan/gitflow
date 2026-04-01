import axios from 'axios';
import type { Branch, MergeRequest, ResolveConflictRequest, ApiResponse, MergeConflict, BranchGraph } from '@gitflow/shared';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach GitHub token from session on every request
export function setAuthToken(token: string) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// â”€â”€â”€ Branches â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchBranches(owner: string, repo: string): Promise<Branch[]> {
  const res = await apiClient.get<ApiResponse<Branch[]>>(
    `/api/v1/repos/${owner}/${repo}/branches`
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Failed to fetch branches');
  return res.data.data;
}

export async function fetchBranchGraph(owner: string, repo: string): Promise<BranchGraph> {
  const res = await apiClient.get<ApiResponse<BranchGraph>>(
    `/api/v1/repos/${owner}/${repo}/graph`
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Failed to fetch graph');
  return res.data.data;
}

// â”€â”€â”€ Merge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Conflicts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

export default apiClient;
