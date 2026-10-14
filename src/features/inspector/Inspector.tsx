"use client";

import { ArrowLeft, ArrowRight, ChevronDown, Copy, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { useWhy } from "@/features/data/hooks";
import {
  edgeColor,
  FAMILY_COLOR,
  KIND_LABEL,
  NODE_COLOR,
  TIER_COLOR,
} from "@/features/graph/palette";
import type { GraphEdge, GraphNode, TableInfo } from "@/lib/contract/graph";
import type { GraphIndex } from "@/lib/graph/index";
import { segment, type TaggedSpan } from "@/lib/text/segments";
import { cn } from "@/lib/utils";

const CLAMP = 1400;

type Props = {
  docId: string;
  index: GraphIndex;
  nodeId: string;
  onSelect: (id: string) => void;
  onPathTo?: () => void;
};

export function TierBadge({ tier, title }: { tier: "A" | "B" | "C" | "D"; title?: string }) {
  return (
    <span
      title={title ?? `confidence tier ${tier}`}
      className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1 font-mono text-[10px] font-bold text-black"
      style={{ background: TIER_COLOR[tier] }}
    >
      {tier}
    </span>
  );
}

function maker(e: { made_by: { actor: string; id: string; model?: string | null } }) {
  return e.made_by.model ? `${e.made_by.id} · ${e.made_by.model}` : e.made_by.id;
}

function Verbatim({
  node,
  index,
  onSelect,
}: {
  node: GraphNode;
  index: GraphIndex;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const spans = useMemo(() => {
    const out: TaggedSpan[] = [];
    for (const e of index.out(node.id))
      if (e.evidence && e.evidence_on === "source")
        out.push({ start: e.evidence.start, end: e.evidence.end, tag: `edge:${e.id}` });
    for (const e of index.in(node.id))
      if (e.evidence && e.evidence_on === "target")
        out.push({ start: e.evidence.start, end: e.evidence.end, tag: `edge:${e.id}` });
    for (const r of node.roles)
      if (r.evidence)
        out.push({ start: r.evidence.start, end: r.evidence.end, tag: `role:${r.role}` });
    for (const h of node.hidden_spans) out.push({ start: h.start, end: h.end, tag: "hidden" });
    return out;
  }, [node, index]);
  const edges = useMemo(
    () => new Map([...index.out(node.id), ...index.in(node.id)].map((e) => [e.id, e])),
    [node, index],
  );
  const text = open || node.text.length <= CLAMP ? node.text : node.text.slice(0, CLAMP);
  const segs = segment(text, spans);
  return (
    <div>
      <p className="verbatim whitespace-pre-wrap" data-testid="verbatim">
        {segs.map((s) => {
          const edgeTag = s.tags.find((t) => t.startsWith("edge:"));
          const edge = edgeTag ? edges.get(edgeTag.slice(5)) : undefined;
          const role = s.tags.find((t) => t.startsWith("role:"));
          const hidden = s.tags.includes("hidden");
          if (!edge && !role && !hidden) return <span key={s.start}>{s.text}</span>;
          const other = edge ? (edge.source === node.id ? edge.target : edge.source) : null;
          return (
            <mark
              key={s.start}
              title={
                edge
                  ? `${edge.type} → ${index.node(other ?? "")?.label ?? ""} (${edge.method})`
                  : role
                    ? role.slice(5)
                    : "hidden text"
              }
              className={cn(edge && "cursor-pointer", hidden && "line-through decoration-error")}
              style={{
                color: edge ? edgeColor(edge.type) : undefined,
                borderBottomStyle: role && !edge ? "dotted" : undefined,
              }}
              onClick={() => other && onSelect(other)}
              onKeyDown={(k) => k.key === "Enter" && other && onSelect(other)}
              tabIndex={edge ? 0 : undefined}
            >
              {s.text}
            </mark>
          );
        })}
        {text.length < node.text.length && "…"}
      </p>
      {node.text.length > CLAMP && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-1 font-mono text-[11px] text-accent-thread"
        >
          {open ? "show less" : `show all ${node.text.length.toLocaleString()} characters`}
        </button>
      )}
    </div>
  );
}

function Table({ table }: { table: TableInfo }) {
  const [hover, setHover] = useState<number | null>(null);
  const rows = Array.from({ length: table.n_rows }, (_, r) => ({
    row: r,
    cells: table.cells.filter((c) => c.row === r),
  }));
  const active = hover === null ? null : table.cells[hover];
  return (
    <div className="space-y-2">
      <div className="max-h-72 overflow-auto rounded-md border border-border">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {rows.map(({ row: r, cells }) => (
              <tr key={`r${r}`} className={r < table.header_rows ? "bg-surface-hover" : undefined}>
                {cells.map((c) => {
                  const i = table.cells.indexOf(c);
                  return (
                    <td
                      key={`${c.row}-${c.col}`}
                      rowSpan={c.row_span}
                      colSpan={c.col_span}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      className={cn(
                        "verbatim border border-border px-2 py-1 align-top text-[0.8rem] leading-snug",
                        c.is_header && "font-semibold",
                        hover === i && "bg-accent-thread-soft",
                      )}
                    >
                      {c.text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="min-h-9 font-mono text-[11px] text-fg-muted" aria-live="polite">
        {active && !active.is_header ? (
          <>
            <span className="text-fg-faint">header</span> {active.header_path.join(" › ") || "—"} ·{" "}
            <span className="text-fg-faint">row</span> {active.row_labels.join(" › ") || "—"}
          </>
        ) : (
          <span className="text-fg-faint">hover a cell to see its header path and row labels</span>
        )}
      </div>
    </div>
  );
}

function Relation({
  edge,
  here,
  index,
  onSelect,
}: {
  edge: GraphEdge;
  here: string;
  index: GraphIndex;
  onSelect: (id: string) => void;
}) {
  const out = edge.source === here;
  const other = index.node(out ? edge.target : edge.source);
  if (!other) return null;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(other.id)}
        className="group w-full rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border-bright hover:bg-surface-hover"
      >
        <div className="flex items-center gap-2 font-mono text-[11px]">
          {out ? (
            <ArrowRight className="h-3 w-3 text-fg-faint" />
          ) : (
            <ArrowLeft className="h-3 w-3 text-fg-faint" />
          )}
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: NODE_COLOR[other.kind] }}
          />
          <span className="truncate text-foreground group-hover:text-accent-thread">
            {other.label}
          </span>
          <span
            className={cn("ml-auto shrink-0 text-fg-faint", edge.basis === "semantic" && "italic")}
          >
            {maker(edge)}
          </span>
          <TierBadge tier={edge.confidence.tier} />
        </div>
        {edge.evidence && (
          <div
            className="verbatim mt-1 line-clamp-2 border-l-2 pl-2 text-[0.85rem] text-fg-muted"
            style={{ borderColor: edgeColor(edge.type) }}
          >
            “{edge.evidence.quote}”
          </div>
        )}
      </button>
    </li>
  );
}

export function Inspector({ docId, index, nodeId, onSelect, onPathTo }: Props) {
  const node = index.node(nodeId);
  const [why, setWhy] = useState(false);
  const whyQuery = useWhy(docId, why ? nodeId : null);
  const groups = useMemo(() => {
    const all = [...index.out(nodeId), ...index.in(nodeId)].filter(
      (e) => !(e.type === "contains" && e.target === nodeId),
    );
    const by = new Map<string, GraphEdge[]>();
    for (const e of all) by.set(e.type, [...(by.get(e.type) ?? []), e]);
    return [...by.entries()];
  }, [index, nodeId]);
  if (!node) return <p className="font-mono text-xs text-fg-faint">no such node</p>;
  const path = index
    .ancestors(nodeId)
    .reverse()
    .filter((a) => a.kind === "section");
  return (
    <div className="space-y-4" data-testid="inspector">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-fg-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: NODE_COLOR[node.kind] }} />
            {KIND_LABEL[node.kind]}
          </span>
          <TierBadge tier={node.confidence.tier} />
          {node.regions[0] && (
            <span className="inline-flex items-center gap-1 text-fg-faint">
              <FileText className="h-3 w-3" /> p.{node.regions[0].page}
            </span>
          )}
          <button
            type="button"
            aria-label="copy node id"
            onClick={() => navigator.clipboard?.writeText(node.id)}
            className="ml-auto inline-flex items-center gap-1 text-fg-faint hover:text-foreground"
          >
            <Copy className="h-3 w-3" /> {node.id.slice(0, 14)}
          </button>
        </div>
        {path.length > 0 && (
          <nav
            className="flex flex-wrap gap-1 font-mono text-[10px] text-fg-faint"
            aria-label="section path"
          >
            {path.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                className="hover:text-accent-thread"
              >
                {s.label} ›
              </button>
            ))}
          </nav>
        )}
        {node.roles.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="roles">
            {node.roles.map((r) => (
              <li
                key={r.role}
                title={r.evidence ? `“${r.evidence.quote}” — ${r.made_by.id}` : r.made_by.id}
                className={cn(
                  "rounded-full border px-2 py-0.5 font-mono text-[10px]",
                  r.basis === "semantic"
                    ? "border-dashed border-accent-thread/60 text-accent-thread"
                    : "border-border-bright text-foreground",
                )}
              >
                {r.role.replace("_", " ")}
              </li>
            ))}
          </ul>
        )}
      </header>

      {node.table ? (
        <Table table={node.table} />
      ) : node.text ? (
        <Verbatim node={node} index={index} onSelect={onSelect} />
      ) : null}

      {(node.flags.length > 0 || node.unresolved.length > 0) && (
        <section className="space-y-1 rounded-md border border-warning/30 bg-warning/5 p-2 font-mono text-[11px]">
          {node.flags.map((f) => (
            <div key={`${f.code}${f.detail ?? ""}`} className="text-warning">
              ⚑ {f.code.replaceAll("_", " ")}
              {f.detail ? ` · ${f.detail}` : ""}
            </div>
          ))}
          {node.unresolved.map((u) => (
            <div key={`${u.kind}${u.text}${u.span?.start ?? ""}`} className="text-fg-muted">
              unresolved {u.kind}: <span className="verbatim text-[0.85rem]">“{u.text}”</span> (
              {u.reason.replaceAll("_", " ")})
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        {groups.length === 0 && (
          <p className="font-mono text-[11px] text-fg-faint">no relationships beyond its section</p>
        )}
        {groups.map(([type, edges]) => (
          <div key={type}>
            <h4 className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-faint">
              <span
                className="h-[2px] w-4"
                style={{ background: edgeColor(edges[0]?.type ?? "contains") }}
              />
              {type.replace("_", " ")} · {edges.length}
            </h4>
            <ul className="space-y-0.5">
              {edges.slice(0, 40).map((e) => (
                <Relation key={e.id} edge={e} here={nodeId} index={index} onSelect={onSelect} />
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div className="flex gap-2 font-mono text-[11px]">
        {onPathTo && (
          <button
            type="button"
            onClick={onPathTo}
            className="rounded-md border border-border px-2 py-1 hover:border-accent-thread hover:text-accent-thread"
          >
            path to…
          </button>
        )}
        <button
          type="button"
          onClick={() => setWhy(!why)}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:border-border-bright"
        >
          why? <ChevronDown className={cn("h-3 w-3 transition-transform", why && "rotate-180")} />
        </button>
      </div>
      {why && (
        <div
          className="rounded-md border border-border bg-background/60 p-2 font-mono text-[11px] text-fg-muted"
          data-testid="why"
        >
          {whyQuery.isLoading && "reading the op log…"}
          {whyQuery.data && (
            <>
              <div className="text-foreground">{whyQuery.data.statement}</div>
              <ol className="mt-1 space-y-0.5">
                {whyQuery.data.ops.map((o) => (
                  <li key={o.seq}>
                    <span className="text-fg-faint">#{o.seq}</span> {o.stage} · {o.kind} ·{" "}
                    <span style={{ color: FAMILY_COLOR.logic }}>{o.method}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          {whyQuery.isError && "the op log is unavailable"}
        </div>
      )}
    </div>
  );
}
