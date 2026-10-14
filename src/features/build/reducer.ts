/** Folds the job's event stream into the live build view's state. Pure. */
import type { EdgeSketch, JobEvent, NodeSketch, StageName } from "@/lib/contract/api";
import { STAGES } from "@/lib/contract/api";

export type StageState = "pending" | "running" | "done" | "skipped" | "failed";
export type LogLine = {
  id: number;
  kind: JobEvent["type"];
  text: string;
  tone: "ok" | "run" | "skip" | "bad";
};

export type BuildState = {
  status: "building" | "done" | "failed";
  stages: Record<StageName, StageState>;
  reasons: Partial<Record<StageName, string>>;
  nodes: Map<string, NodeSketch>;
  edges: Map<string, EdgeSketch>;
  log: LogLine[];
  lastId: number;
  error: { code: string; message: string } | null;
  llm: { calls: number; cached: number };
};

export function initialBuild(): BuildState {
  return {
    status: "building",
    stages: Object.fromEntries(STAGES.map((s) => [s, "pending"])) as Record<StageName, StageState>,
    reasons: {},
    nodes: new Map(),
    edges: new Map(),
    log: [],
    lastId: 0,
    error: null,
    llm: { calls: 0, cached: 0 },
  };
}

const STAGE_STATE = {
  started: "running",
  completed: "done",
  skipped: "skipped",
  failed: "failed",
} as const;

export function reduceBuild(state: BuildState, ev: JobEvent): BuildState {
  if (ev.id <= state.lastId || state.status !== "building") return state;
  const next: BuildState = { ...state, lastId: ev.id, log: state.log };
  const line = (text: string, tone: LogLine["tone"]) => {
    next.log = [...state.log, { id: ev.id, kind: ev.type, text, tone }];
  };
  switch (ev.type) {
    case "stage": {
      const s = ev.data;
      next.stages = { ...state.stages, [s.stage]: STAGE_STATE[s.status] };
      if (s.reason) next.reasons = { ...state.reasons, [s.stage]: s.reason };
      const ms = s.ms ? ` · ${(s.ms / 1000).toFixed(1)}s` : "";
      const counts = s.counts
        ? ` · ${Object.entries(s.counts)
            .map(([k, v]) => `${v} ${k}`)
            .join(", ")}`
        : "";
      const tone =
        s.status === "failed"
          ? "bad"
          : s.status === "skipped"
            ? "skip"
            : s.status === "started"
              ? "run"
              : "ok";
      line(`${s.stage} ${s.status}${s.reason ? ` (${s.reason})` : ""}${ms}${counts}`, tone);
      break;
    }
    case "delta": {
      const nodes = new Map(state.nodes);
      for (const n of ev.data.nodes) nodes.set(n.id, n);
      const edges = new Map(state.edges);
      for (const e of ev.data.edges) edges.set(e.id, e);
      next.nodes = nodes;
      next.edges = edges;
      line(
        `+${ev.data.nodes.length} nodes +${ev.data.edges.length} edges +${ev.data.roles.length} roles`,
        "ok",
      );
      break;
    }
    case "llm": {
      const l = ev.data;
      next.llm = {
        calls: state.llm.calls + (l.cached ? 0 : 1),
        cached: state.llm.cached + (l.cached ? 1 : 0),
      };
      line(
        `${l.task} → ${l.model ?? "?"} ${l.cached ? "cached" : l.status}${l.ms ? ` ${l.ms}ms` : ""}`,
        l.ok ? "ok" : "bad",
      );
      break;
    }
    case "done":
      next.status = "done";
      line("graph ready", "ok");
      break;
    case "failed":
      next.status = "failed";
      next.error = ev.data;
      line(`failed: ${ev.data.code}`, "bad");
      break;
  }
  return next;
}
