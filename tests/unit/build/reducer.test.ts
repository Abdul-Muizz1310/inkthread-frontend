import { describe, expect, it } from "vitest";
import { initialBuild, reduceBuild } from "@/features/build/reducer";
import type { JobEvent } from "@/lib/contract/api";

const stage = (
  id: number,
  s: string,
  status: "started" | "completed" | "skipped" | "failed",
  reason?: string,
): JobEvent => ({
  id,
  type: "stage",
  data: { stage: s as never, status, ms: 5, reason: reason ?? null, counts: null },
});

describe("build reducer (T-FE-4)", () => {
  it("folds stages, deltas, llm, done", () => {
    let st = initialBuild();
    st = reduceBuild(st, stage(1, "read", "started"));
    expect(st.stages.read).toBe("running");
    st = reduceBuild(st, stage(2, "read", "completed"));
    st = reduceBuild(st, {
      id: 3,
      type: "delta",
      data: {
        stage: "structure",
        nodes: [
          { id: "d", kind: "document", label: "T", section: null, depth: 0, order: 0, page: 1 },
        ],
        edges: [],
        roles: [],
        flags: [],
      },
    });
    st = reduceBuild(st, {
      id: 4,
      type: "llm",
      data: { task: "A-classify", model: "m", cached: false, ok: true, status: "ok", ms: 900 },
    });
    st = reduceBuild(st, stage(5, "classify_agent", "skipped", "budget"));
    st = reduceBuild(st, { id: 6, type: "done", data: { document_id: "doc", graph_hash: "h" } });
    expect(st.stages.read).toBe("done");
    expect(st.stages.classify_agent).toBe("skipped");
    expect(st.nodes.size).toBe(1);
    expect(st.log.map((l) => l.kind)).toEqual(["stage", "stage", "delta", "llm", "stage", "done"]);
    expect(st.status).toBe("done");
    expect(st.lastId).toBe(6);
  });
  it("ignores duplicates and anything after a terminal event", () => {
    let st = initialBuild();
    st = reduceBuild(st, stage(1, "read", "started"));
    const same = reduceBuild(st, stage(1, "read", "started"));
    expect(same).toBe(st);
    st = reduceBuild(st, {
      id: 2,
      type: "failed",
      data: { code: "no_text_layer", message: "scanned" },
    });
    expect(st.status).toBe("failed");
    expect(st.error?.code).toBe("no_text_layer");
    expect(reduceBuild(st, stage(3, "structure", "started"))).toBe(st);
  });
});
