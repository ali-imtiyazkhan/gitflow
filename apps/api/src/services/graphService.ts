import type { Branch, BranchGraph, GraphNode, GraphEdge } from '@gitflow/shared';
import { GRAPH_DEFAULTS } from '@gitflow/shared';

export class GraphService {
  /**
   * Generates a visual topology for the given branches.
   * Currently implements a logical layout based on branch type and time.
   */
  async generateGraph(branches: Branch[]): Promise<BranchGraph> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Sort branches by last modification date
    const sortedBranches = [...branches].sort(
      (a, b) => new Date(a.lastCommitAt).getTime() - new Date(b.lastCommitAt).getTime()
    );

    // Identify primary branches
    const mainBranch = sortedBranches.find((b) => b.type === 'main') || sortedBranches[0];
    const developBranch = sortedBranches.find((b) => b.type === 'develop');

    // Layout configuration (Swimlanes)
    const lanes = {
       feature: 200,
       main: 400,
       develop: 550,
       hotfix: 750,
    };

    // Track horizontal position per lane to avoid overlaps
    const laneX = {
       feature: GRAPH_DEFAULTS.CANVAS_PADDING,
       main: GRAPH_DEFAULTS.CANVAS_PADDING,
       develop: GRAPH_DEFAULTS.CANVAS_PADDING,
       hotfix: GRAPH_DEFAULTS.CANVAS_PADDING,
    };

    sortedBranches.forEach((branch) => {
      const type = branch.type as keyof typeof lanes;
      const nodeY = lanes[type] || lanes.feature;
      const nodeX = laneX[type] || laneX.feature;

      nodes.push({
        id: branch.id,
        branchId: branch.id,
        x: nodeX,
        y: nodeY,
        width: GRAPH_DEFAULTS.NODE_WIDTH,
        height: GRAPH_DEFAULTS.NODE_HEIGHT,
      });

      // Advance X for this lane
      if (type in laneX) {
         laneX[type] += GRAPH_DEFAULTS.NODE_WIDTH + GRAPH_DEFAULTS.H_GAP;
      }

      // ─── Edge Creation ──────────────────────────────────────────────────────
      
      // Feature branches connect to develop (or main if develop missing)
      if (branch.type === 'feature') {
         const targetId = developBranch?.id || mainBranch.id;
         if (branch.id !== targetId) {
            edges.push({
               id: `edge-${branch.id}-${targetId}`,
               fromBranchId: branch.id,
               toBranchId: targetId,
               type: 'merge-into',
            });
         }
      } 
      // Hotfixes connect to main
      else if (branch.type === 'hotfix') {
         if (branch.id !== mainBranch.id) {
            edges.push({
               id: `edge-${branch.id}-${mainBranch.id}`,
               fromBranchId: branch.id,
               toBranchId: mainBranch.id,
               type: 'merge-into',
            });
         }
      }
      // Develop connects to main
      else if (branch.type === 'develop' && mainBranch) {
         edges.push({
            id: `edge-${branch.id}-${mainBranch.id}`,
            fromBranchId: branch.id,
            toBranchId: mainBranch.id,
            type: 'merge-into',
         });
      }
    });

    return { nodes, edges };
  }
}
