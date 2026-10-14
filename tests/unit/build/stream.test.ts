import { describe, expect, it } from "vitest";
import { backoff, parseEvent } from "@/features/build/useJobStream";

describe("event stream helpers (reconnect resumes)", () => {
  it("parses a valid named event and drops junk", () => {
    expect(parseEvent("done", "7", JSON.stringify({ document_id: "d", graph_hash: "h" }))?.id).toBe(
      7,
    );
    expect(parseEvent("done", "x", "{}")).toBeNull();
    expect(parseEvent("stage", "1", "{not json")).toBeNull();
    expect(
      parseEvent("stage", "1", JSON.stringify({ stage: "nope", status: "started" })),
    ).toBeNull();
  });
  it("backs off from 0.5 s to 8 s with ±10% jitter", () => {
    expect(backoff(0, () => 0.5)).toBe(500);
    expect(backoff(10, () => 0.5)).toBe(8000);
    expect(backoff(0, () => 0)).toBe(450);
  });
});
