"use client";

import Link from "next/link";
import { useMemo } from "react";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { useGraph, useSamples } from "@/features/data/hooks";
import { GraphView } from "@/features/graph/GraphView";
import { prefersReducedMotion } from "@/features/graph/store";
import { buildIndex } from "@/lib/graph/index";
import { docName } from "@/lib/utils";

export function HeroGraph() {
  const samples = useSamples();
  const first = samples.data?.items.find((s) => s.status === "ready");
  const graph = useGraph(first?.id ?? "", Boolean(first));
  const viz = useMemo(() => {
    if (!graph.data) return null;
    const idx = buildIndex(graph.data);
    return {
      nodes: graph.data.nodes.map((n) => ({
        id: n.id,
        kind: n.kind,
        label: n.label,
        degree: idx.degree(n.id),
      })),
      links: graph.data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        basis: e.basis,
      })),
    };
  }, [graph.data]);
  return (
    <TerminalWindow
      title={
        first ? `${(first.file_name ?? "sample").replace(/\.pdf$/, "")}.graph` : "sample.graph"
      }
      statusDot="thread"
      statusLabel="live"
      bodyClassName="p-0 md:p-0"
      strong
    >
      <div className="relative h-[440px]" data-testid="hero-graph">
        {viz ? (
          <GraphView
            view="3d"
            nodes={viz.nodes}
            links={viz.links}
            selected={null}
            highlight={null}
            autoRotate
            reducedMotion={prefersReducedMotion()}
            showLabels={false}
          />
        ) : (
          <div className="grid h-full place-items-center font-mono text-xs text-fg-faint">
            {samples.isError
              ? "$ the backend is asleep — samples load when it wakes"
              : "$ weaving the sample…"}
          </div>
        )}
        {first && (
          <Link
            href={`/d/${first.id}`}
            className="absolute bottom-3 right-3 rounded-md border border-border-bright bg-background/80 px-3 py-1.5 font-mono text-xs text-accent-thread backdrop-blur hover:border-accent-thread"
          >
            $ open {docName(first.title, first.file_name).slice(0, 34)} →
          </Link>
        )}
      </div>
    </TerminalWindow>
  );
}
