/**
 * The deterministic "document map": the contains-tree laid out as a tidy tree (reading order left
 * to right, depth top to bottom), outside citations in a column on the left and defined terms in a
 * column on the right. The same graph always draws the same picture.
 */
import { hierarchy, tree } from "d3-hierarchy";
import type { Graph, GraphNode } from "@/lib/contract/graph";

export type Point = { x: number; y: number };
const DX = 46;
const DY = 120;
const SIDE_GAP = 220;
const ROW = 34;

type TreeDatum = { node: GraphNode; children: TreeDatum[] };

export function layout2d(graph: Graph): Map<string, Point> {
  const pos = new Map<string, Point>();
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const kids = new Map<string, GraphNode[]>();
  for (const e of graph.edges) {
    if (e.type !== "contains") continue;
    const child = byId.get(e.target);
    if (!child) continue;
    const list = kids.get(e.source) ?? [];
    list.push(child);
    kids.set(e.source, list);
  }
  const doc = graph.nodes.find((n) => n.kind === "document");
  if (!doc) return pos;
  const build = (n: GraphNode): TreeDatum => ({
    node: n,
    children: (kids.get(n.id) ?? []).sort((a, b) => a.order - b.order).map(build),
  });
  const root = hierarchy(build(doc), (d) => d.children);
  tree<TreeDatum>().nodeSize([DX, DY])(root);
  let minX = 0;
  let maxX = 0;
  for (const d of root.descendants()) {
    const x = d.x ?? 0;
    pos.set(d.data.node.id, { x, y: d.y ?? 0 });
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }
  const column = (kind: GraphNode["kind"], x: number) => {
    const items = graph.nodes.filter((n) => n.kind === kind).sort((a, b) => a.order - b.order);
    items.forEach((n, i) => {
      pos.set(n.id, { x, y: i * ROW });
    });
  };
  column("term", maxX + SIDE_GAP);
  column("external", minX - SIDE_GAP);
  return pos;
}
