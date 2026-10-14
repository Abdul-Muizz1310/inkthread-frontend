"use client";

/**
 * The precise view: the deterministic document map (layout2d) drawn on canvas. Positions are
 * fixed, so the same graph always draws the same picture. Glyph shapes mirror the 3D meshes.
 */
import { useEffect, useMemo, useRef } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import type { Graph, NodeKind } from "@/lib/contract/graph";
import { layout2d } from "./layout2d";
import { edgeColor, NODE_COLOR, nodeSize, SELECTED } from "./palette";
import type { VizLink, VizNode } from "./Graph3D";

type Props = {
  graph: Graph;
  nodes: VizNode[];
  links: VizLink[];
  selected: string | null;
  highlight: ReadonlySet<string> | null;
  onSelect?: (id: string | null) => void;
  onHover?: (id: string | null) => void;
  width?: number;
  height?: number;
};

type N = VizNode & { x?: number; y?: number; fx?: number; fy?: number };

function glyph(ctx: CanvasRenderingContext2D, kind: NodeKind, x: number, y: number, r: number) {
  ctx.beginPath();
  switch (kind) {
    case "section":
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      break;
    case "table":
    case "definition":
      ctx.rect(x - r, y - r, 2 * r, 2 * r);
      break;
    case "note":
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.lineTo(x - r, y + r);
      ctx.closePath();
      break;
    case "term":
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        ctx[i ? "lineTo" : "moveTo"](x + r * Math.cos(a), y + r * Math.sin(a));
      }
      ctx.closePath();
      break;
    case "external":
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.moveTo(x + r * 0.45, y);
      ctx.arc(x, y, r * 0.45, 0, Math.PI * 2, true);
      break;
    default:
      ctx.arc(x, y, r, 0, Math.PI * 2);
  }
}

export default function Graph2D({ graph, nodes, links, selected, highlight, onSelect, onHover, width, height }: Props) {
  const ref = useRef<ForceGraphMethods<N, VizLink> | undefined>(undefined);
  const positions = useMemo(() => layout2d(graph), [graph]);
  const data = useMemo(
    () => ({
      nodes: nodes.map((n) => {
        const p = positions.get(n.id) ?? { x: 0, y: 0 };
        return { ...n, x: p.x, y: p.y, fx: p.x, fy: p.y };
      }),
      links: links.map((l) => ({ ...l })),
    }),
    [nodes, links, positions],
  );

  useEffect(() => {
    const t = setTimeout(() => ref.current?.zoomToFit(400, 40), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const p = positions.get(selected);
    if (p) {
      ref.current?.centerAt(p.x, p.y, 600);
      ref.current?.zoom(2.2, 600);
    }
  }, [selected, positions]);

  const dimmed = (id: string) => highlight !== null && !highlight.has(id);

  return (
    <div data-testid="graph-2d" className="h-full w-full">
      <ForceGraph2D<N, VizLink>
        ref={ref}
        width={width}
        height={height}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        nodeId="id"
        cooldownTicks={0}
        enableNodeDrag={false}
        nodeLabel={(n) => `${n.kind}: ${n.label}`}
        linkColor={(l) => {
          const s = typeof l.source === "object" ? (l.source as N).id : String(l.source);
          const t = typeof l.target === "object" ? (l.target as N).id : String(l.target);
          return dimmed(s) || dimmed(t) ? "rgba(80,80,90,0.12)" : edgeColor(l.type);
        }}
        linkWidth={(l) => (l.type === "contains" ? 0.4 : 1.1)}
        linkLineDash={(l) => (l.basis === "semantic" ? [3, 2] : null)}
        linkCurvature={(l) => (l.type === "contains" ? 0 : 0.25)}
        linkDirectionalArrowLength={(l) => (l.type === "contains" ? 0 : 3)}
        linkDirectionalArrowRelPos={0.92}
        nodeCanvasObject={(n, ctx, scale) => {
          const r = nodeSize(n.kind, n.degree) * 1.4;
          const dim = dimmed(n.id);
          ctx.globalAlpha = dim ? 0.15 : 1;
          ctx.fillStyle = n.id === selected ? SELECTED : NODE_COLOR[n.kind];
          glyph(ctx, n.kind, n.x ?? 0, n.y ?? 0, r);
          ctx.fill("evenodd");
          if (n.id === selected) {
            ctx.strokeStyle = "#e879f9";
            ctx.lineWidth = 2 / scale;
            ctx.stroke();
          }
          const label = n.kind === "section" || n.kind === "document" || n.id === selected || scale > 2.2;
          if (label && !dim) {
            const size = Math.max(10 / scale, 2.5);
            ctx.font = `${size}px Geist Mono, ui-monospace, monospace`;
            ctx.fillStyle = "#d9d7cf";
            ctx.textAlign = "center";
            const text = n.label.length > 48 ? `${n.label.slice(0, 46)}…` : n.label;
            ctx.fillText(text, n.x ?? 0, (n.y ?? 0) + r + size + 1);
          }
          ctx.globalAlpha = 1;
        }}
        nodePointerAreaPaint={(n, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(n.x ?? 0, n.y ?? 0, nodeSize(n.kind, n.degree) * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }}
        onNodeClick={(n) => onSelect?.(n.id)}
        onNodeHover={(n) => onHover?.(n ? n.id : null)}
        onBackgroundClick={() => onSelect?.(null)}
      />
    </div>
  );
}
