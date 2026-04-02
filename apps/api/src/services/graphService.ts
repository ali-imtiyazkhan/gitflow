import type { Branch, BranchGraph, GraphNode, GraphEdge, Commit } from '@gitflow/shared';
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
        type: 'branch',
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
                fromId: branch.id,
                toId: targetId,
                type: 'merge-into',
             });
         }
      } 
      // Hotfixes connect to main
      else if (branch.type === 'hotfix') {
         if (branch.id !== mainBranch.id) {
             edges.push({
                id: `edge-${branch.id}-${mainBranch.id}`,
                fromId: branch.id,
                toId: mainBranch.id,
                type: 'merge-into',
             });
         }
      }
      // Develop connects to main
      else if (branch.type === 'develop' && mainBranch) {
         edges.push({
            id: `edge-${branch.id}-${mainBranch.id}`,
            fromId: branch.id,
            toId: mainBranch.id,
            type: 'merge-into',
         });
      }
    });

    return { nodes, edges };
  }

  /**
   * Generates a detailed commit tree graph.
   */
  async generateCommitGraph(branches: Branch[]): Promise<BranchGraph> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const commitMap = new Map<string, Commit>();
    const branchHeadMap = new Map<string, string>(); // SHA -> Branch Name

    // 1. Flatten all unique commits and identify branch heads
    branches.forEach(branch => {
      branchHeadMap.set(branch.sha, branch.name);
      branch.commits.forEach(commit => {
        if (!commitMap.has(commit.sha)) {
          commitMap.set(commit.sha, commit);
        }
      });
    });

    const allCommits = Array.from(commitMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 2. Identify lanes (one lane per branch)
    const sortedBranches = Array.from(branches).sort(
      (a, b) => new Date(b.lastCommitAt).getTime() - new Date(a.lastCommitAt).getTime()
    );
    const branchLanes = new Map<string, number>();
    sortedBranches.forEach((b, i) => branchLanes.set(b.name, i * 150));

    // 3. Create nodes for all commits and head-labels for branches
    allCommits.forEach((commit, i) => {
      // Find which branch this commit "belongs" to (first branch that has it in its history)
      const primaryBranch = branches.find(b => b.commits.some(c => c.sha === commit.sha))?.name || 'unknown';
      const laneX = branchLanes.get(primaryBranch) || 0;
      const nodeY = i * 100 + GRAPH_DEFAULTS.CANVAS_PADDING;

      nodes.push({
        id: commit.sha,
        type: 'commit',
        commitSha: commit.sha,
        x: laneX,
        y: nodeY,
        width: 40,
        height: 40,
        data: {
          message: commit.message,
          author: commit.author,
          timestamp: commit.timestamp,
          branchName: primaryBranch,
          ciStatus: commit.ciStatus || 'none',
        },
      });

      // If this commit is a branch HEAD, add an edge to the branch label/node if needed
      // Or just create a special "Branch Label" node nearby
      if (branchHeadMap.has(commit.sha)) {
        const branchName = branchHeadMap.get(commit.sha)!;
        const branchId = `branch-label-${branchName}`;
        nodes.push({
          id: branchId,
          type: 'branch',
          branchId: branchName,
          x: laneX + 60,
          y: nodeY,
          width: 140,
          height: 40,
          data: { name: branchName },
        });
        edges.push({
          id: `head-${branchName}`,
          fromId: branchId,
          toId: commit.sha,
          type: 'branch-head',
        });
      }

      // 4. Create edges to parents
      commit.parents.forEach((parentSha: string) => {
        if (commitMap.has(parentSha)) {
          edges.push({
            id: `edge-${commit.sha}-${parentSha}`,
            fromId: commit.sha,
            toId: parentSha,
            type: 'commit-parent',
          });
        }
      });
    });

    return { nodes, edges };
  }
}
