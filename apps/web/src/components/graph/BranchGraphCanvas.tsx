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
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertCircle, Loader2, GitBranch, GitCommit, Layers, MoreHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import { BranchNode } from './BranchNode';
import { CommitNode } from './CommitNode';
import { useBranchGraph } from '@/hooks/useBranchGraph';
import { useMerge } from '@/hooks/useMerge';
import { deleteBranch } from '@/lib/apiClient';
import { useGraphStore } from '@/store/graphStore';
import { useSocket } from '@/hooks/useSocket';
import type { Branch } from '@gitflow/shared';
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
  const initialNodes = useMemo<Node[]>(() =>
    graph.nodes.map((n) => {
      if (n.type === 'branch') {
        const branch = branches.find((b) => b.id === n.branchId);
        return {
          id: n.id,
          type: 'branch',
          data: {
            ...branch,
            onDelete: handleDeleteBranch,
          },
          position: { x: n.x, y: n.y },
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
          position: { x: n.x, y: n.y },
          draggable: true,
        };
      }
    }),
    [branches, graph.nodes, handleDeleteBranch]
  );

  // Convert domain edges → React Flow edges
  const initialEdges = useMemo<Edge[]>(() =>
    graph.edges.map((e) => ({
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
    })),
    [graph.edges]
  );

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
    (_: React.MouseEvent, node: Node) => {
      updateNodePosition(node.id, node.position.x, node.position.y);

      // Find the node that was marked as target during drag
      const targetNode = nodes.find((n) => (n.data as any).isTarget);

      if (targetNode) {
        const sourceName = (node.data as any).name;
        const targetName = (targetNode.data as any).name;

        if (window.confirm(`Do you want to merge "${sourceName}" into "${targetName}"?`)) {
          triggerMerge(node.id, targetNode.id);
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
    [nodes, setNodes, updateNodePosition, triggerMerge]
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
      <div className="absolute top-4 left-4 z-10 flex gap-1 rounded-xl bg-white/80 p-1 shadow-lg backdrop-blur-md dark:bg-gray-900/80">
        <button
          onClick={() => setView('branch')}
          className={clsx(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all',
            view === 'branch' 
              ? 'bg-gray-900 text-white shadow-md dark:bg-white dark:text-gray-900' 
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white'
          )}
        >
          <GitBranch className="h-3.5 w-3.5" />
          Branch View
        </button>
        <button
          onClick={() => setView('commit')}
          className={clsx(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all',
            view === 'commit' 
              ? 'bg-gray-900 text-white shadow-md dark:bg-white dark:text-gray-900' 
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white'
          )}
        >
          <GitCommit className="h-3.5 w-3.5" />
          Commit View
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
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        connectionLineStyle={{ stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5 3' }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls showInteractive={false} />
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
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-white/80 px-3 py-1.5 text-xs text-gray-400 shadow backdrop-blur-sm">
        {view === 'branch' 
          ? 'Drag a branch handle to another branch to merge'
          : 'Visualize the full granular commit history'}
      </div>
    </div>
  );
}
