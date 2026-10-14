import { describe, expect, it } from "vitest";
import { layout2d } from "@/features/graph/layout2d";
import { graphOf, n, sample } from "./fixture";

describe("2D layout (T-FE-7)", () => {
  it("places every node, deterministically", () => {
    const g = sample();
    const a = layout2d(g);
    const b = layout2d(g);
    expect(a.size).toBe(g.nodes.length);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });
  it("keeps reading order left to right under a section, terms right of all parts", () => {
    const pos = layout2d(sample());
    expect((pos.get("p1")?.x ?? 0) < (pos.get("p2")?.x ?? 0)).toBe(true);
    const maxPart = Math.max(...["p1", "p2", "p3"].map((id) => pos.get(id)?.x ?? 0));
    expect((pos.get("t")?.x ?? 0) > maxPart).toBe(true);
  });
  it("renders a document-only graph (empty graph renders)", () => {
    expect(layout2d(graphOf([n("d", "document", 0, null)], [])).get("d")).toEqual({ x: 0, y: 0 });
  });
});
