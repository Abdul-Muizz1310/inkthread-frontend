import type { EdgeType, Graph, GraphEdge, GraphNode, NodeKind } from "@/lib/contract/graph";
import { FAMILY_OF } from "@/lib/contract/graph";

const conf = { tier: "A" as const, score: 1, reasons: [] };
export function n(
  id: string,
  kind: NodeKind,
  order: number,
  section: string | null,
  extra: Partial<GraphNode> = {},
): GraphNode {
  return {
    id,
    kind,
    label: id,
    label_truncated: false,
    text: `text of ${id}`,
    order,
    section,
    depth: section ? 1 : 0,
    regions: [],
    roles: [],
    flags: [],
    hidden_spans: [],
    unresolved: [],
    confidence: conf,
    source: { blocks: [], keys: [] },
    made_by: { actor: "inkgrid", id: "inkgrid" },
    ...extra,
  };
}
export function e(
  type: EdgeType,
  source: string,
  target: string,
  extra: Partial<GraphEdge> = {},
): GraphEdge {
  return {
    id: `e:${type}:${source}:${target}`,
    type,
    family: FAMILY_OF[type],
    source,
    target,
    basis: "explicit",
    evidence_on: "source",
    method: "R",
    made_by: { actor: "rule", id: "R" },
    confidence: conf,
    flags: [],
    ...extra,
  };
}
export function graphOf(nodes: GraphNode[], edges: GraphEdge[]): Graph {
  return {
    schema: "inkthread.graph/1",
    document: {
      sha256: "a".repeat(64),
      file_name: "x.pdf",
      title: null,
      title_node: null,
      page_count: 1,
      pages: [{ number: 1, width: 612, height: 792 }],
    },
    nodes,
    edges,
    set_aside: [],
    findings: [],
    stats: { nodes_by_kind: {}, edges_by_type: {}, roles: {}, tiers: {} },
    provenance: {
      pipeline_version: "1",
      inkgrid_version: "0.1.0",
      prompts_hash: "",
      models: {},
      ops_head: "",
      ops_count: 0,
      graph_hash: "h",
      rejected: [],
    },
  };
}
// d ─contains→ s1 ─contains→ p1, p2 ; p1 ─uses_term→ t ; p2 ─refers_to→ s2 ─contains→ p3 ; p3 ─qualifies→ p1 ; x isolated term
export function sample(): Graph {
  return graphOf(
    [
      n("d", "document", 0, null),
      n("s1", "section", 1, "d"),
      n("p1", "paragraph", 2, "s1"),
      n("p2", "paragraph", 3, "s1"),
      n("s2", "section", 4, "d"),
      n("p3", "paragraph", 5, "s2", { confidence: { tier: "C", score: 0.5, reasons: [] } }),
      n("t", "term", 6, null),
      n("x", "term", 7, null),
    ],
    [
      e("contains", "d", "s1"),
      e("contains", "s1", "p1"),
      e("contains", "s1", "p2"),
      e("contains", "d", "s2"),
      e("contains", "s2", "p3"),
      e("uses_term", "p1", "t"),
      e("refers_to", "p2", "s2"),
      e("qualifies", "p3", "p1", {
        basis: "semantic",
        confidence: { tier: "B", score: 0.75, reasons: [] },
      }),
    ],
  );
}
