"use client";

import { Box, Download, Network, RotateCcw, Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { exportUrl } from "@/features/data/hooks";
import type { VizLink, VizNode } from "@/features/graph/Graph3D";
import { GraphView } from "@/features/graph/GraphView";
import { edgeColor, NODE_COLOR } from "@/features/graph/palette";
import { prefersReducedMotion, useWorkspace } from "@/features/graph/store";
import { Inspector, TierBadge } from "@/features/inspector/Inspector";
import { Outline } from "@/features/outline/Outline";
import { PageView } from "@/features/page/PageView";
import type { Graph } from "@/lib/contract/graph";
import { applyFilters } from "@/lib/graph/filters";
import { buildIndex } from "@/lib/graph/index";
import { shortestPath } from "@/lib/graph/path";
import { cn } from "@/lib/utils";
import { Legend } from "./Legend";

type Props = { docId: string; graph: Graph; onReplay?: () => void };

function SearchBox({
  graph,
  onPick,
  placeholder,
}: {
  graph: Graph;
  onPick: (id: string) => void;
  placeholder: string;
}) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return graph.nodes
      .filter((n) => n.label.toLowerCase().includes(s) || n.text.toLowerCase().includes(s))
      .slice(0, 8);
  }, [q, graph]);
  return (
    <div className="relative">
      <label className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-1 focus-within:border-accent-thread/60">
        <Search className="h-3.5 w-3.5 text-fg-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full bg-transparent font-mono text-[11px] text-foreground outline-none placeholder:text-fg-faint"
        />
      </label>
      {hits.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full rounded-md border border-border-bright bg-surface p-1 shadow-lg">
          {hits.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(n.id);
                  setQ("");
                }}
                className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left font-mono text-[11px] hover:bg-surface-hover"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: NODE_COLOR[n.kind] }}
                />
                <span className="truncate">{n.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Workspace({ docId, graph, onReplay }: Props) {
  const index = useMemo(() => buildIndex(graph), [graph]);
  const {
    selected,
    view,
    filters,
    page,
    pathFrom,
    pathTo,
    select,
    hover,
    setView,
    setFilters,
    setPage,
    setPath,
  } = useWorkspace();
  const [picking, setPicking] = useState(false);
  const reduced = prefersReducedMotion();

  const filtered = useMemo(
    () => applyFilters(graph, filters, selected),
    [graph, filters, selected],
  );
  const nodes = useMemo<VizNode[]>(
    () =>
      filtered.nodes.map((n) => ({
        id: n.id,
        kind: n.kind,
        label: n.label,
        degree: index.degree(n.id),
      })),
    [filtered, index],
  );
  const links = useMemo<VizLink[]>(
    () =>
      filtered.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        basis: e.basis,
      })),
    [filtered],
  );
  const path = useMemo(
    () => (pathFrom && pathTo ? shortestPath(index, pathFrom, pathTo) : null),
    [index, pathFrom, pathTo],
  );
  const highlight = useMemo(() => {
    if (path) return new Set(path.flatMap((s) => [s.from, s.to]));
    if (!selected) return null;
    return new Set([selected, ...index.neighbours(selected)]);
  }, [selected, index, path]);

  const onSelect = useCallback(
    (id: string | null) => {
      if (picking && id && selected) {
        setPath(selected, id);
        setPicking(false);
        return;
      }
      setPath(null, null);
      select(id);
    },
    [picking, selected, select, setPath],
  );
  const tierA = graph.stats.tiers.A ?? 0;
  const total = Object.values(graph.stats.tiers).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="flex h-[calc(100vh-3.5rem-2rem)] flex-col" data-testid="workspace">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
        <h1
          className="min-w-0 truncate font-mono text-sm font-semibold text-foreground"
          title={graph.document.title ?? undefined}
        >
          {graph.document.title?.replaceAll("\n", " ") || graph.document.file_name || "document"}
        </h1>
        <span className="font-mono text-[11px] text-fg-faint">
          {graph.document.page_count}p · {graph.nodes.length} nodes · {graph.edges.length} threads ·
          tier A {Math.round((100 * tierA) / total)}%
        </span>
        <div className="ml-auto flex items-center gap-2">
          <fieldset className="flex rounded-md border border-border p-0.5 font-mono text-[11px]">
            <legend className="sr-only">view</legend>
            {(["3d", "2d"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-0.5",
                  view === v ? "bg-accent-thread-soft text-accent-thread" : "text-fg-muted",
                )}
              >
                {v === "3d" ? <Box className="h-3 w-3" /> : <Network className="h-3 w-3" />} {v}
              </button>
            ))}
          </fieldset>
          {onReplay && (
            <button
              type="button"
              onClick={onReplay}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5 font-mono text-[11px] text-fg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" /> replay build
            </button>
          )}
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md border border-border px-2 py-0.5 font-mono text-[11px] text-fg-muted hover:text-foreground">
              <Download className="h-3 w-3" /> export
            </summary>
            <ul
              className="absolute right-0 z-30 mt-1 w-40 rounded-md border border-border-bright bg-surface p-1 font-mono text-[11px] shadow-lg"
              data-testid="exports"
            >
              {(["json", "jsonld", "graphml", "cypher"] as const).map((f) => (
                <li key={f}>
                  <a
                    href={exportUrl(docId, f)}
                    className="block rounded px-2 py-1 hover:bg-surface-hover"
                    download
                  >
                    {f === "json"
                      ? "inkthread json"
                      : f === "jsonld"
                        ? "JSON-LD"
                        : f === "graphml"
                          ? "GraphML"
                          : "Cypher (Neo4j)"}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
      <PanelGroup direction="horizontal" className="min-h-0 flex-1">
        <Panel
          defaultSize={19}
          minSize={14}
          className="flex flex-col gap-3 overflow-y-auto border-r border-border p-3"
        >
          <SearchBox
            graph={graph}
            onPick={(id) => onSelect(id)}
            placeholder="search parts and text"
          />
          <Legend graph={graph} filters={filters} onChange={setFilters} />
          <div className="border-t border-border pt-2">
            <h4 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-faint">
              outline
            </h4>
            <Outline index={index} selected={selected} onSelect={(id) => onSelect(id)} />
          </div>
        </Panel>
        <PanelResizeHandle className="w-1 bg-border/40 transition-colors hover:bg-accent-thread/40" />
        <Panel defaultSize={50} minSize={30} className="relative">
          <GraphView
            view={view}
            graph={graph}
            nodes={nodes}
            links={links}
            selected={selected}
            highlight={highlight}
            onSelect={onSelect}
            onHover={hover}
            reducedMotion={reduced}
          />
          {picking && (
            <div className="absolute inset-x-0 top-3 mx-auto w-80 rounded-md border border-accent-thread/50 bg-surface/95 p-2 shadow-lg">
              <div className="mb-1 flex items-center font-mono text-[11px] text-accent-thread">
                pick a second node, or search
                <button
                  type="button"
                  aria-label="cancel"
                  onClick={() => setPicking(false)}
                  className="ml-auto text-fg-faint"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <SearchBox graph={graph} onPick={(id) => onSelect(id)} placeholder="path to…" />
            </div>
          )}
          {path && (
            <div
              className="absolute inset-x-3 bottom-3 max-h-56 overflow-auto rounded-md border border-border-bright bg-surface/95 p-3 shadow-lg"
              data-testid="path"
            >
              <div className="mb-1 flex items-center font-mono text-[10px] uppercase tracking-[0.15em] text-fg-faint">
                why are these related · {path.length} threads
                <button
                  type="button"
                  aria-label="close path"
                  onClick={() => setPath(null, null)}
                  className="ml-auto"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <ol className="space-y-1">
                {path.map((s) => (
                  <li key={s.edge.id} className="font-mono text-[11px]">
                    <span className="text-foreground">{index.node(s.from)?.label}</span>{" "}
                    <span style={{ color: edgeColor(s.edge.type) }}>
                      {s.forward ? "─" : "←"}
                      {s.edge.type.replace("_", " ")}
                      {s.forward ? "→" : "─"}
                    </span>{" "}
                    <span className="text-foreground">{index.node(s.to)?.label}</span>{" "}
                    <TierBadge tier={s.edge.confidence.tier} />
                    {s.edge.evidence && (
                      <div className="verbatim ml-3 text-[0.8rem] text-fg-muted">
                        “{s.edge.evidence.quote}”
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {path === null && pathFrom && pathTo && (
            <div className="absolute inset-x-3 bottom-3 rounded-md border border-border bg-surface/95 p-2 font-mono text-[11px] text-fg-muted">
              no thread connects these two parts
            </div>
          )}
        </Panel>
        <PanelResizeHandle className="w-1 bg-border/40 transition-colors hover:bg-accent-thread/40" />
        <Panel
          defaultSize={31}
          minSize={22}
          className="flex min-h-0 flex-col border-l border-border"
        >
          <PanelGroup direction="vertical">
            <Panel defaultSize={50} minSize={20}>
              <PageView
                docId={docId}
                index={index}
                selected={selected}
                page={page}
                onPage={setPage}
              />
            </Panel>
            <PanelResizeHandle className="h-1 bg-border/40 hover:bg-accent-thread/40" />
            <Panel defaultSize={50} minSize={20} className="overflow-y-auto p-3">
              {selected ? (
                <Inspector
                  docId={docId}
                  index={index}
                  nodeId={selected}
                  onSelect={(id) => onSelect(id)}
                  onPathTo={() => setPicking(true)}
                />
              ) : (
                <div className="space-y-2 font-mono text-[11px] text-fg-muted">
                  <p>{/* select a part in the graph, the outline or the search. */}</p>
                  <p>{/* its text is shown as printed, with every thread's evidence marked. */}</p>
                </div>
              )}
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
