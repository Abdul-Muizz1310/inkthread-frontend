import { describe, expect, it } from "vitest";
import { toPixels } from "@/features/page/scale";
import { segment } from "@/lib/text/segments";

describe("segments (T-FE-5)", () => {
  it("cuts overlapping spans into ordered, non-overlapping segments", () => {
    const text = "Members must pay the Filing Fee.";
    const segs = segment(text, [
      { start: 8, end: 12, tag: "cue:obligation" },
      { start: 21, end: 31, tag: "edge:e1" },
      { start: 28, end: 31, tag: "hidden" },
    ]);
    expect(segs.map((s) => s.text).join("")).toBe(text);
    expect(segs.find((s) => s.text === "must")?.tags).toEqual(["cue:obligation"]);
    expect(segs.find((s) => s.text === "Fee")?.tags).toEqual(["edge:e1", "hidden"]);
    for (let i = 1; i < segs.length; i++) expect(segs[i].start).toBe(segs[i - 1].end);
  });
  it("ignores spans outside the text", () => {
    expect(
      segment("abc", [{ start: 2, end: 9, tag: "x" }])
        .map((s) => s.text)
        .join(""),
    ).toBe("abc");
  });
});

describe("page scale (T-FE-6)", () => {
  it("maps PDF points to pixels at any zoom", () => {
    expect(toPixels([72, 72, 144, 108], { width: 612, height: 792 }, 1224)).toEqual({
      left: 144,
      top: 144,
      width: 144,
      height: 72,
    });
  });
});
