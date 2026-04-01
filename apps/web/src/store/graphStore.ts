import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { Branch, MergeConflict, BranchGraph, GraphEdge } from '@gitflow/shared';

interface GraphState {
  // Data
  branches: Branch[];
  graph: BranchGraph;
  conflicts: MergeConflict[];
  activeConflict: MergeConflict | null;

  // UI state
  selectedBranchId: string | null;
  isLoading: boolean;
  error: string | null;
  isMerging: boolean;

  // Actions
  setBranches: (branches: Branch[]) => void;
  setGraph: (graph: BranchGraph) => void;
  selectBranch: (id: string | null) => void;
  updateNodePosition: (branchId: string, x: number, y: number) => void;
  inititateMerge: (sourceBranchId: string, targetBranchId: string) => void;
  setActiveConflict: (conflict: MergeConflict | null) => void;
  resolveHunk: (conflictId: string, hunkId: string, strategy: 'ours' | 'theirs' | 'both' | 'manual', manualContent?: string) => void;
  completeMerge: (sourceBranchId: string) => void;
  abortMerge: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addEdge: (edge: GraphEdge) => void;
}

export const useGraphStore = create<GraphState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      branches: [],
      graph: { nodes: [], edges: [] },
      conflicts: [],
      activeConflict: null,
      selectedBranchId: null,
      isLoading: false,
      error: null,
      isMerging: false,

      setBranches: (branches) => set({ branches }),

      setGraph: (graph) => set({ graph }),

      selectBranch: (id) => set({ selectedBranchId: id }),

      updateNodePosition: (branchId, x, y) =>
        set((state) => ({
          graph: {
            ...state.graph,
            nodes: state.graph.nodes.map((n) =>
              n.branchId === branchId ? { ...n, x, y } : n
            ),
          },
        })),

      inititateMerge: (sourceBranchId, targetBranchId) => {
        set({ isMerging: true });
        // Conflict detection is handled by the API; this just marks UI as merging
        console.info(`[store] merge initiated: ${sourceBranchId} â†’ ${targetBranchId}`);
      },

      setActiveConflict: (conflict) => set({ activeConflict: conflict, isMerging: !!conflict }),

      resolveHunk: (conflictId, hunkId, strategy, manualContent) =>
        set((state) => {
          if (!state.activeConflict || state.activeConflict.id !== conflictId) return state;
          return {
            activeConflict: {
              ...state.activeConflict,
              files: state.activeConflict.files.map((f) => ({
                ...f,
                hunks: f.hunks.map((h) =>
                  h.id === hunkId
                    ? { ...h, resolved: true, resolution: strategy, resolvedContent: manualContent }
                    : h
                ),
                resolvedConflicts: f.hunks.filter(
                  (h) => h.id === hunkId || h.resolved
                ).length,
              })),
            },
          };
        }),

      completeMerge: (sourceBranchId) =>
        set((state) => ({
          branches: state.branches.filter((b) => b.id !== sourceBranchId),
          graph: {
            ...state.graph,
            nodes: state.graph.nodes.filter((n) => n.branchId !== sourceBranchId),
            edges: state.graph.edges.filter(
              (e) => e.fromBranchId !== sourceBranchId && e.toBranchId !== sourceBranchId
            ),
          },
          activeConflict: null,
          isMerging: false,
        })),

      abortMerge: () => set({ activeConflict: null, isMerging: false }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      addEdge: (edge) =>
        set((state) => ({
          graph: {
            ...state.graph,
            edges: [...state.graph.edges.filter((e) => e.id !== edge.id), edge],
          },
        })),
    })),
    { name: 'gitflow-graph' }
  )
);
