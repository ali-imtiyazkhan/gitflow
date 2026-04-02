import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type ReactFlowInstance,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertCircle, Loader2, GitBranch, GitCommit, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { BranchNode } from './BranchNode';
import { CommitNode } from './CommitNode';
import { useBranchGraph } from '@/hooks/useBranchGraph';
import { useMerge } from '@/hooks/useMerge';
import { deleteBranch, performRebase } from '@/lib/apiClient';
import { useGraphStore } from '@/store/graphStore';
import { useSocket } from '@/hooks/useSocket';
import { TimeMachineSlider } from './TimeMachineSlider';
import { MergeSummaryModal } from './MergeSummaryModal';
import { GRAPH_DEFAULTS } from '@gitflow/shared';

const NODE_TYPES = {
  branch: BranchNode,
  commit: CommitNode
};

interface BranchGraphCanvasProps {
  owner: string;
  repo: string;
  accessToken: string;
}

export function BranchGraphCanvas({ owner, repo }: BranchGraphCanvasProps) {
  const [view, setView] = useState<'branch' | 'commit'>('branch');
  const { isLoading, error, branches, graph, refresh } = useBranchGraph(owner, repo, view);
  const { triggerMerge } = useMerge(owner, repo);
  const { selectBranch, updateNodePosition } = useGraphStore();
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // Time Machine State
  const [timeMachineValue, setTimeMachineValue] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Rebase Mode State
  const [isRebaseMode, setIsRebaseMode] = useState(false);

  // Merge Preview State
  const [pendingMerge, setPendingMerge] = useState<{ source: string, target: string } | null>(null);

  // Listen for real-time updates
  const socket = useSocket(`${owner}/${repo}`);

  useEffect(() => {
    if (!socket) return;

    socket.on('merge:completed', () => refresh());
    socket.on('conflict:resolved', () => refresh());
    socket.on('merge:conflict', () => refresh());

    return () => {
      socket.off('merge:completed');
      socket.off('conflict:resolved');
      socket.off('merge:conflict');
    };
  }, [socket, refresh]);

  // Time Machine Animation Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeMachineValue((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleDeleteBranch = useCallback(
    async (branchName: string) => {
      const confirmMessage = `Are you sure you want to permanently delete the branch "${branchName}"? This action cannot be undone on GitHub.`;

      if (window.confirm(confirmMessage)) {
        try {
          await deleteBranch(owner, repo, branchName);
          refresh(); // Refresh graph to remove the node
        } catch (err: any) {
          alert(`Failed to delete branch: ${err.message}`);
        }
      }
    },
    [owner, repo, refresh]
  );

  // Convert domain branches → React Flow nodes
  const initialNodes = useMemo<Node[]>(() => {
    // 1. Calculate time threshold if time machine is active
    const maxCommits = graph.nodes.filter(n => n.type === 'commit').length;
    const thresholdIndex = Math.floor((timeMachineValue / 100) * maxCommits);
    
    // Sort all commit nodes by timestamp (newest to oldest or vice versa)
    const commitNodes = [...graph.nodes]
      .filter(n => n.type === 'commit')
      .sort((a, b) => new Date(a.data?.timestamp).getTime() - new Date(b.data?.timestamp).getTime());

    const visibleCommitShas = new Set(commitNodes.slice(0, thresholdIndex).map(n => n.id));

    // 2. Map nodes
    return graph.nodes.map((n) => {
      const position = { x: n.x, y: n.y };

      // Filter out commits that haven't "happened" yet in the time machine
      if (n.type === 'commit' && !visibleCommitShas.has(n.id)) {
        return { 
          id: n.id, 
          type: 'commit', 
          position, 
          hidden: true,
          data: { ...n.data, commitSha: n.commitSha }
        };
      }

      if (n.type === 'branch') {
        const branch = branches.find((b) => b.id === n.branchId);
        // Hide branch labels if their head commit is hidden (only in commit view)
        if (view === 'commit' && branch && !visibleCommitShas.has(branch.sha)) {
          return { 
            id: n.id, 
            type: 'branch', 
            position, 
            hidden: true,
            data: { ...branch, onDelete: handleDeleteBranch }
          };
        }

        return {
          id: n.id,
          type: 'branch',
          data: {
            ...branch,
            onDelete: handleDeleteBranch,
          },
          position,
          draggable: true,
        };
      } else {
        return {
          id: n.id,
          type: 'commit',
          data: {
            ...n.data,
            commitSha: n.commitSha,
            isHead: branches.some(b => b.sha === n.commitSha),
          },
          position,
          draggable: true,
        };
      }
    });
  }, [branches, graph.nodes, handleDeleteBranch, timeMachineValue, view]);

  // Convert domain edges → React Flow edges
  const initialEdges = useMemo<Edge[]>(() => {
    const visibleNodeIds = new Set(initialNodes.filter(n => !(n as any).hidden).map(n => n.id));

    return graph.edges
      .filter(e => visibleNodeIds.has(e.fromId) && visibleNodeIds.has(e.toId))
      .map((e) => ({
        id: e.id,
        source: e.fromId,
        target: e.toId,
        animated: e.type === 'merge-into' || e.type === 'rebase-onto',
        style: {
          stroke: e.type === 'branch-head' ? '#3b82f6' : '#94a3b8',
          strokeWidth: e.type === 'branch-head' ? 2 : 1.5,
          strokeDasharray: e.type === 'branch-head' ? '5 5' : '0'
        },
        type: 'smoothstep',
      }));
  }, [graph.edges, initialNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes when initialNodes change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Sync edges when initialEdges change
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);
  
  // Re-fit view when nodes or view change to ensure no overlap with header
  useEffect(() => {
    if (rfInstance && nodes.length > 0) {
      rfInstance.fitView({ 
        padding: { top: 220, bottom: 80, left: 60, right: 60 },
        duration: 800,
        includeHiddenNodes: false 
      });
    }
  }, [rfInstance, nodes.length, view]);

  // When user draws a connection (drag from one node handle to another) → trigger merge
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        triggerMerge(connection.source, connection.target);
        setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#f59e0b' } }, eds));
      }
    },
    [triggerMerge, setEdges]
  );

  const onNodeDrag = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const draggedRect = {
        left: node.position.x,
        top: node.position.y,
        right: node.position.x + (node.measured?.width ?? GRAPH_DEFAULTS.NODE_WIDTH),
        bottom: node.position.y + (node.measured?.height ?? GRAPH_DEFAULTS.NODE_HEIGHT),
      };

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) return n;

          const targetRect = {
            left: n.position.x,
            top: n.position.y,
            right: n.position.x + (n.measured?.width ?? GRAPH_DEFAULTS.NODE_WIDTH),
            bottom: n.position.y + (n.measured?.height ?? GRAPH_DEFAULTS.NODE_HEIGHT),
          };

          const isOverlapping =
            draggedRect.left < targetRect.right &&
            draggedRect.right > targetRect.left &&
            draggedRect.top < targetRect.bottom &&
            draggedRect.bottom > targetRect.top;

          return {
            ...n,
            data: { ...n.data, isTarget: isOverlapping },
          };
        })
      );
    },
    [setNodes]
  );

  const onNodeDragStop = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      updateNodePosition(node.id, node.position.x, node.position.y);

      // Find the node that was marked as target during drag
      const targetNode = nodes.find((n) => (n.data as any).isTarget);

      if (targetNode) {
        const sourceId = node.id;
        const targetId = targetNode.id;
        const sourceType = node.type;
        const targetType = targetNode.type;

        // ─── Rebase / Squash Logic (Commit View) ──────────────────────────────
        if (isRebaseMode && sourceType === 'commit' && targetType === 'commit') {
          const sourceMsg = (node.data as any).message;
          const targetMsg = (targetNode.data as any).message;

          if (window.confirm(`Do you want to rebase commit "${sourceMsg}" onto "${targetMsg}"?`)) {
             try {
               await performRebase(owner, repo, {
                 sourceBranch: (node.data as any).branchName || 'unknown', // We might need to track which branch a commit belongs to
                 targetBranch: (targetNode.data as any).branchName || 'unknown',
                 commits: [node.id] // Just replaying one commit for now
               });
               refresh();
               alert('Rebase successful!');
             } catch (err: any) {
               alert(`Rebase failed: ${err.message}`);
             }
          }
        } 
        // ─── Standard Merge Logic (Branch View) ──────────────────────────────
        else if (!isRebaseMode && sourceType === 'branch' && targetType === 'branch') {
          setPendingMerge({ source: sourceId, target: targetId });
        }
      }

      // Clear all isTarget flags
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isTarget: false },
        }))
      );
    },
    [nodes, setNodes, updateNodePosition, triggerMerge, isRebaseMode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectBranch(node.id);
    },
    [selectBranch]
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading branches…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-500">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm font-medium">Failed to load branches</p>
        <p className="text-xs text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden h-full w-full relative">
      {/* View Switcher Controls */}
      <div className="absolute top-6 left-6 z-10 flex gap-1 rounded-2xl glass-surface p-1.5 shadow-2xl">
        <button
          onClick={() => setView('branch')}
          className={clsx(
            'flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all active:scale-95',
            view === 'branch'
              ? 'bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-950'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'
          )}
        >
          <GitBranch className="h-4 w-4" />
          Branch View
        </button>
        <button
          onClick={() => setView('commit')}
          className={clsx(
            'flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all active:scale-95',
            view === 'commit'
              ? 'bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-950'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'
          )}
        >
          <GitCommit className="h-4 w-4" />
          Commit View
        </button>

        <div className="mx-2 my-auto h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />
        
        <button
          onClick={() => setIsRebaseMode(!isRebaseMode)}
          disabled={view !== 'commit'}
          className={clsx(
            'flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all disabled:opacity-30 active:scale-95',
            isRebaseMode
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'
          )}
        >
          <RotateCcw className={clsx('h-4 w-4', isRebaseMode && 'animate-spin-slow')} />
          Rebase Mode
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onInit={setRfInstance}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: { top: 220, bottom: 80, left: 60, right: 60 }, includeHiddenNodes: false }}
        connectionLineStyle={{ stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5 3' }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(148, 163, 184, 0.15)" />
        <Controls 
          showInteractive={false} 
          className="!glass-surface !bg-transparent !border-0 !shadow-2xl !rounded-2xl !p-1"
        />
        <MiniMap
          nodeColor={(node) => {
            const b = node.data as any;
            if (node.type === 'commit') return b.isHead ? '#3b82f6' : '#cbd5e1';
            if (b?.type === 'main') return '#3b82f6';
            if (b?.status === 'conflict') return '#ef4444';
            if (b?.status === 'merged') return '#8b5cf6';
            return '#94a3b8';
          }}
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Hint overlay */}
      <div className="pointer-events-none absolute bottom-8 left-8 rounded-2xl glass-surface border-slate-100 dark:border-slate-800 px-4 py-2 text-[11px] font-bold text-slate-400 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex items-center gap-2">
           <div className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
           {isRebaseMode 
             ? 'Drag a commit onto another to reorder/squash' 
             : view === 'branch'
               ? 'Connect branch handles to trigger a smart merge'
               : 'Topological commit history is now active'}
        </div>
      </div>

      {/* Time Machine Slider */}
      <TimeMachineSlider
        min={0}
        max={100}
        value={timeMachineValue}
        onChange={setTimeMachineValue}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        isPlaying={isPlaying}
        label={view === 'commit' ? 'Analyzing granular history' : 'Branch Evolution'}
      />

      {/* Merge Summary Modal */}
      {pendingMerge && (
         <MergeSummaryModal
            owner={owner}
            repo={repo}
            source={pendingMerge.source}
            target={pendingMerge.target}
            onConfirm={() => {
               triggerMerge(pendingMerge.source, pendingMerge.target);
               setPendingMerge(null);
            }}
            onCancel={() => setPendingMerge(null)}
         />
      )}
    </div>
  );
}
