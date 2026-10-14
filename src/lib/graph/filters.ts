/** Which nodes and edges a view shows. Filters combine with AND; the selection is never hidden. */
import {
  type Basis,
  FAMILIES,
  type Family,
  type Graph,
  type GraphEdge,
  type GraphNode,
  NODE_KINDS,
  type NodeKind,
  type Role,
  TIERS,
  type Tier,
} from "@/lib/contract/graph";

export type Filters = {
  families: ReadonlySet<Family>;
  kinds: ReadonlySet<NodeKind>;
  tiers: ReadonlySet<Tier>;
  basis: ReadonlySet<Basis>;
  roles: ReadonlySet<Role> | null; // null = any role (or none)
};

export function defaultFilters(): Filters {
  return {
    families: new Set(FAMILIES),
    kinds: new Set(NODE_KINDS),
    tiers: new Set(TIERS),
    basis: new Set(["explicit", "semantic"] as const),
    roles: null,
  };
}

export type Filtered = { nodes: GraphNode[]; edges: GraphEdge[] };

export function applyFilters(graph: Graph, f: Filters, selected: string | null): Filtered {
  const keepNode = (n: GraphNode) =>
    n.id === selected ||
    n.kind === "document" ||
    (f.kinds.has(n.kind) &&
      f.tiers.has(n.confidence.tier) &&
      (f.roles === null || n.roles.some((r) => f.roles?.has(r.role))));
  const nodes = graph.nodes.filter(keepNode);
  const ids = new Set(nodes.map((n) => n.id));
  const edges = graph.edges.filter(
    (e) =>
      ids.has(e.source) &&
      ids.has(e.target) &&
      f.families.has(e.family) &&
      f.basis.has(e.basis) &&
      f.tiers.has(e.confidence.tier),
  );
  return { nodes, edges };
}
