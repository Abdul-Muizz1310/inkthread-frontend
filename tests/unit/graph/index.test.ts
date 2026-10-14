import { describe, expect, it } from "vitest";
import { applyFilters, defaultFilters } from "@/lib/graph/filters";
import { buildIndex } from "@/lib/graph/index";
import { shortestPath } from "@/lib/graph/path";
import { sample } from "./fixture";

describe("graph index (T-FE-2)", () => {
  const idx = buildIndex(sample());
  it("finds neighbours by direction and type", () => {
    expect(idx.out("p1").map((e) => e.target)).toEqual(["t"]);
    expect(
      idx
        .in("p1")
        .map((e) => e.source)
        .sort(),
    ).toEqual(["p3", "s1"]);
    expect(idx.neighbours("p1", { types: ["uses_term"] })).toEqual(["t"]);
    expect(idx.children("s1").map((x) => x.id)).toEqual(["p1", "p2"]);
    expect(idx.ancestors("p3").map((x) => x.id)).toEqual(["s2", "d"]);
  });
  it("finds the shortest typed path in either direction", () => {
    const path = shortestPath(idx, "t", "s2");
    expect(path?.map((s) => s.edge.type)).toEqual(["uses_term", "qualifies", "contains"]);
    expect(path?.[0]?.from).toBe("t");
    expect(path?.at(-1)?.to).toBe("s2");
  });
  it("returns null for a disconnected pair", () => {
    expect(shortestPath(idx, "x", "p1")).toBeNull();
    expect(shortestPath(idx, "p1", "p1")).toEqual([]);
  });
});

describe("filters (T-FE-3)", () => {
  const g = sample();
  it("hiding a family hides its edges, never the selected node", () => {
    const f = {
      ...defaultFilters(),
      families: new Set(["structure", "references", "logic"] as const),
    };
    const out = applyFilters(g, f, "t");
    expect(out.edges.some((e) => e.type === "uses_term")).toBe(false);
    expect(out.nodes.some((x) => x.id === "t")).toBe(true);
  });
  it("tier and basis filters combine with AND", () => {
    const f = {
      ...defaultFilters(),
      tiers: new Set(["A", "B"] as const),
      basis: new Set(["explicit"] as const),
    };
    const out = applyFilters(g, f, null);
    expect(out.edges.some((e) => e.type === "qualifies")).toBe(false);
    expect(out.nodes.some((x) => x.id === "p3")).toBe(false);
  });
});
