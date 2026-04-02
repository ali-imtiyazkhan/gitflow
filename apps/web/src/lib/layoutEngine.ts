import type { Node, Edge } from '@xyflow/react';

/**
 * Runtime import of dagre to avoid SSR issues
 */
async function getDagre() {
  const dagre = await import('dagre');
  return dagre.default || dagre;
}

export interface LayoutOptions {
  direction?: 'LR' | 'TB' | 'RL' | 'BT';
  nodeSep?: number;
  rankSep?: number;
  nodeWidth?: number;
  nodeHeight?: number;
}

/**
 * Applies a Dagre topological layout to the nodes and edges.
 */
export async function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  opts: LayoutOptions = {}
): Promise<Node[]> {
  const dagre = await getDagre();
  const {
    direction = 'LR',
    nodeSep = 80,
    rankSep = 160,
    nodeWidth = 200,
    nodeHeight = 72,
  } = opts;

  const g = new (dagre as any).graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: nodeSep, ranksep: rankSep });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach(n => g.setNode(n.id, { width: nodeWidth, height: nodeHeight }));
  edges.forEach(e => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map(n => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos.x - nodeWidth / 2,
        y: pos.y - nodeHeight / 2,
      },
    };
  });
}
