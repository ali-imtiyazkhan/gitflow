import { useCallback } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { startMerge, fetchConflict, fetchAISuggestion, resolveConflict, fetchGlobalAnalysis, fetchAICommitMessage, fetchMergeSummary } from '@/lib/apiClient';
import type { ConflictHunk, ResolveConflictRequest } from '@gitflow/shared';

export function useMerge(owner: string, repo: string) {
  const { inititateMerge, setActiveConflict, setLoading, setError } = useGraphStore();

  const triggerMerge = useCallback(
    async (sourceId: string, targetId: string) => {
      setLoading(true);
      setError(null);
      inititateMerge(sourceId, targetId);

      try {
        const res = await startMerge(owner, repo, {
          sourceBranch: sourceId, // Assuming ID is the name for now, or fetch by ID
          targetBranch: targetId,
          strategy: 'merge',
        });

        if (res.conflictId) {
          const conflict = await fetchConflict(owner, repo, res.conflictId);
          setActiveConflict(conflict);
        } else if (res.merged) {
          // Success handled via store state or re-fetch in useBranchGraph
          console.info('Merge successful');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Merge failed');
      } finally {
        setLoading(false);
      }
    },
    [owner, repo, inititateMerge, setActiveConflict, setLoading, setError]
  );

  const getAISuggestion = useCallback(
    async (hunk: ConflictHunk) => {
      setLoading(true);
      setError(null);
      try {
        return await fetchAISuggestion(owner, repo, hunk);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AI Suggestion failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [owner, repo, setLoading, setError]
  );

  const resolveConflictAction = useCallback(
    async (request: ResolveConflictRequest) => {
      setLoading(true);
      setError(null);
      try {
        await resolveConflict(owner, repo, request);
        // Refresh graph or handle success
        setActiveConflict(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Resolution failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [owner, repo, setActiveConflict, setLoading, setError]
  );

  const analyzeMerge = useCallback(
    async (hunks: ConflictHunk[]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchGlobalAnalysis(owner, repo, hunks);
        return res; // AIAnalysis object
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Global analysis failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [owner, repo, setLoading, setError]
  );

  const getAICommitMessage = useCallback(
    async (hunks: ConflictHunk[]) => {
      setLoading(true);
      setError(null);
      try {
        return await fetchAICommitMessage(owner, repo, hunks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AI commit message failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [owner, repo, setLoading, setError]
  );

  const getMergeSummary = useCallback(
    async (base: string, head: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchMergeSummary(owner, repo, base, head);
        return res; // No longer just a string
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Merge summary failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [owner, repo, setLoading, setError]
  );

  return { triggerMerge, getAISuggestion, resolveConflictAction, analyzeMerge, getAICommitMessage, getMergeSummary };
}
