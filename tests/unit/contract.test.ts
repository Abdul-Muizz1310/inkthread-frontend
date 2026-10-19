import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DeltaEvent, PageGeometry, ReadingOut, StageEvent } from "@/lib/contract/api";
import { Graph } from "@/lib/contract/graph";

const load = (p: string) => JSON.parse(readFileSync(`tests/fixtures/samples/uspto/${p}`, "utf8"));

describe("contract (T-FE-1)", () => {
  it("parses a graph the real pipeline produced", () => {
    const g = Graph.parse(load("graph.json"));
    expect(g.nodes.length).toBeGreaterThan(10);
    expect(g.nodes[0]?.kind).toBe("document");
  });
  it("rejects an unknown edge type", () => {
    const raw = load("graph.json");
    raw.edges[0].type = "related";
    expect(Graph.safeParse(raw).success).toBe(false);
  });
  it("parses the real event log and page geometry", () => {
    for (const ev of load("events.json") as { event: string; data: unknown }[]) {
      if (ev.event === "stage") StageEvent.parse(ev.data);
      if (ev.event === "delta") DeltaEvent.parse(ev.data);
    }
    expect(PageGeometry.parse(load("pages/1.json")).length).toBeGreaterThan(10);
  });
});

describe("reading contract (T-FE-20)", () => {
  it("parses the sample's reading", () => {
    const r = ReadingOut.parse(load("reading.json"));
    expect(r.schema).toBe("inkthread.reading/1");
    expect(r.tables.length).toBeGreaterThan(0);
    expect(r.verification.disagreements).toBe(r.verification.defects.length);
  });
  it("rejects another schema and a table without rows", () => {
    const other = { ...load("reading.json"), schema: "inkthread.reading/2" };
    expect(ReadingOut.safeParse(other).success).toBe(false);
    const raw = load("reading.json");
    delete raw.tables[0].rows;
    expect(ReadingOut.safeParse(raw).success).toBe(false);
  });
});
