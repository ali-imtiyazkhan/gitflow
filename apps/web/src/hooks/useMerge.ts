import { useCallback } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { startMerge, fetchConflict } from '@/lib/apiClient';

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

  return { triggerMerge };
}
