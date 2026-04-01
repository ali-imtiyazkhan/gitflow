import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useGraphStore } from '@/store/graphStore';
import { fetchBranches, fetchBranchGraph, setAuthToken } from '@/lib/apiClient';

export function useBranchGraph(owner: string, repo: string, view: 'branch' | 'commit' = 'branch') {
  const { data: session } = useSession();
  const { setBranches, setGraph, setLoading, setError, branches, graph, isLoading, error } =
    useGraphStore();

  const refresh = useCallback(async () => {
    if (!session?.accessToken) return;

    setAuthToken(session.accessToken);
    setLoading(true);
    setError(null);

    try {
      const [fetchedBranches, fetchedGraph] = await Promise.all([
        fetchBranches(owner, repo),
        fetchBranchGraph(owner, repo, view),
      ]);
      setBranches(fetchedBranches);
      setGraph(fetchedGraph);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [owner, repo, session?.accessToken, view, setBranches, setGraph, setLoading, setError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { branches, graph, isLoading, error, refresh };
}
