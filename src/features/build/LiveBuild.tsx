"use client";

import { Check, Circle, Loader2, Minus, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import type { VizLink, VizNode } from "@/features/graph/Graph3D";
import { GraphView } from "@/features/graph/GraphView";
import { prefersReducedMotion } from "@/features/graph/store";
import { STAGES, type StageName } from "@/lib/contract/api";
import { cn } from "@/lib/utils";
import type { BuildState, StageState } from "./reducer";

const LABEL: Record<StageName, string> = {
  read: "read",
  structure: "structure",
  classify_rules: "classify",
  classify_agent: "classify · agent",
  link_rules: "link",
  relate_agent: "relate · agent",
  verify_agent: "verify · agent",
  finalize: "finalize",
};

function Dot({ s }: { s: StageState }) {
  if (s === "done") return <Check className="h-3.5 w-3.5 text-success" />;
  if (s === "running") return <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-thread" />;
  if (s === "skipped") return <Minus className="h-3.5 w-3.5 text-fg-faint" />;
  if (s === "failed") return <X className="h-3.5 w-3.5 text-error" />;
  return <Circle className="h-3 w-3 text-fg-faint" />;
}

export function LiveBuild({ state, title }: { state: BuildState; title: string }) {
  const nodes = useMemo<VizNode[]>(() => {
    const degree = new Map<string, number>();
    for (const e of state.edges.values()) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }
    return [...state.nodes.values()].map((n) => ({
      id: n.id,
      kind: n.kind,
      label: n.label,
      degree: degree.get(n.id) ?? 0,
    }));
  }, [state.nodes, state.edges]);
  const links = useMemo<VizLink[]>(
    () =>
      [...state.edges.values()].filter(
        (e) => state.nodes.has(e.source) && state.nodes.has(e.target),
      ),
    [state.nodes, state.edges],
  );
  const log = useRef<HTMLDivElement>(null);
  const lines = state.log.length;
  useEffect(() => {
    if (lines > 0) log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [lines]);

  return (
    <div className="flex h-[calc(100vh-3.5rem-2rem)] flex-col" data-testid="live-build">
      <ol
        className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-2 font-mono text-[11px]"
        aria-label="pipeline stages"
      >
        {STAGES.map((s, i) => (
          <li
            key={s}
            className={cn(
              "flex items-center gap-1.5",
              state.stages[s] === "pending" ? "text-fg-faint" : "text-foreground",
            )}
            data-stage={s}
            data-state={state.stages[s]}
          >
            <Dot s={state.stages[s]} />
            {LABEL[s]}
            {state.reasons[s] && <span className="text-fg-faint">({state.reasons[s]})</span>}
            {i < STAGES.length - 1 && <span className="ml-2 text-fg-faint">→</span>}
          </li>
        ))}
      </ol>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_420px]">
        <div className="relative min-h-[320px]">
          <GraphView
            view="3d"
            nodes={nodes}
            links={links}
            selected={null}
            highlight={null}
            reducedMotion={prefersReducedMotion()}
          />
          <div className="pointer-events-none absolute left-4 top-4 font-mono text-xs text-fg-muted">
            <div className="text-foreground">{title}</div>
            <div>
              {state.nodes.size} nodes · {state.edges.size} threads
            </div>
          </div>
        </div>
        <div className="border-l border-border p-3">
          <TerminalWindow
            title="pipeline.log"
            statusDot={
              state.status === "building" ? "thread" : state.status === "done" ? "green" : "red"
            }
            statusLabel={state.status}
            bodyClassName="p-0"
          >
            <div
              ref={log}
              className="h-[60vh] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
              data-testid="pipeline-log"
              aria-live="polite"
            >
              {state.log.length === 0 && (
                <div className="text-fg-faint">$ waiting for the job to start…</div>
              )}
              {state.log.map((l) => (
                <div
                  key={l.id}
                  className={cn(
                    l.tone === "bad"
                      ? "text-error"
                      : l.tone === "skip"
                        ? "text-fg-faint"
                        : l.tone === "run"
                          ? "text-accent-thread"
                          : "text-fg-muted",
                  )}
                >
                  <span className="text-fg-faint">[{String(l.id).padStart(3, "0")}]</span> {l.text}
                </div>
              ))}
              {state.error && <div className="mt-2 text-error">{state.error.message}</div>}
            </div>
          </TerminalWindow>
        </div>
      </div>
    </div>
  );
}
