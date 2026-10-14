/** An adjacency index over a graph: built once, read by every view. */
import type { EdgeType, Graph, GraphEdge, GraphNode } from "@/lib/contract/graph";

export type GraphIndex = {
  graph: Graph;
  node: (id: string) => GraphNode | undefined;
  out: (id: string) => GraphEdge[];
  in: (id: string) => GraphEdge[];
  neighbours: (id: string, opts?: { types?: readonly EdgeType[] }) => string[];
  children: (id: string) => GraphNode[];
  ancestors: (id: string) => GraphNode[];
  degree: (id: string) => number;
};

export function buildIndex(graph: Graph): GraphIndex {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const outs = new Map<string, GraphEdge[]>();
  const ins = new Map<string, GraphEdge[]>();
  for (const e of graph.edges) {
    (outs.get(e.source) ?? outs.set(e.source, []).get(e.source))?.push(e);
    (ins.get(e.target) ?? ins.set(e.target, []).get(e.target))?.push(e);
  }
  const out = (id: string) => outs.get(id) ?? [];
  const inn = (id: string) => ins.get(id) ?? [];
  return {
    graph,
    node: (id) => nodes.get(id),
    out,
    in: inn,
    neighbours(id, opts) {
      const ok = (e: GraphEdge) => !opts?.types || opts.types.includes(e.type);
      const set = new Set<string>();
      for (const e of out(id)) if (ok(e)) set.add(e.target);
      for (const e of inn(id)) if (ok(e)) set.add(e.source);
      return [...set];
    },
    children(id) {
      return out(id)
        .filter((e) => e.type === "contains")
        .map((e) => nodes.get(e.target))
        .filter((n): n is GraphNode => n !== undefined)
        .sort((a, b) => a.order - b.order);
    },
    ancestors(id) {
      const chain: GraphNode[] = [];
      let cursor = nodes.get(id)?.section ?? null;
      while (cursor) {
        const n = nodes.get(cursor);
        if (!n) break;
        chain.push(n);
        cursor = n.section;
      }
      return chain;
    },
    degree: (id) => out(id).length + inn(id).length,
  };
}
