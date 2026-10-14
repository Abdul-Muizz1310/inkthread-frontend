/** The shortest typed path between two nodes, edges walked in either direction (BFS). */
import type { GraphEdge } from "@/lib/contract/graph";
import type { GraphIndex } from "./index";

export type PathStep = { from: string; to: string; edge: GraphEdge; forward: boolean };

export function shortestPath(idx: GraphIndex, from: string, to: string): PathStep[] | null {
  if (from === to) return [];
  const prev = new Map<string, PathStep>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    const steps: PathStep[] = [
      ...idx.out(cur).map((edge) => ({ from: cur, to: edge.target, edge, forward: true })),
      ...idx.in(cur).map((edge) => ({ from: cur, to: edge.source, edge, forward: false })),
    ];
    for (const step of steps) {
      if (seen.has(step.to)) continue;
      seen.add(step.to);
      prev.set(step.to, step);
      if (step.to === to) {
        const path: PathStep[] = [];
        let at = to;
        while (at !== from) {
          const s = prev.get(at) as PathStep;
          path.unshift(s);
          at = s.from;
        }
        return path;
      }
      queue.push(step.to);
    }
  }
  return null;
}
