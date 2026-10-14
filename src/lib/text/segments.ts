/** Splits a text into ordered, non-overlapping segments, each carrying the tags of every span over it. */
export type TaggedSpan = { start: number; end: number; tag: string };
export type Segment = { start: number; end: number; text: string; tags: string[] };

export function segment(text: string, spans: readonly TaggedSpan[]): Segment[] {
  const ok = spans
    .map((s) => ({ ...s, start: Math.max(0, s.start), end: Math.min(text.length, s.end) }))
    .filter((s) => s.end > s.start);
  const cuts = new Set([0, text.length]);
  for (const s of ok) {
    cuts.add(s.start);
    cuts.add(s.end);
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const start = points[i];
    const end = points[i + 1];
    const tags = ok.filter((s) => s.start <= start && s.end >= end).map((s) => s.tag);
    out.push({ start, end, text: text.slice(start, end), tags });
  }
  return out;
}
