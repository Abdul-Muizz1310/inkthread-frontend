"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { pageImageUrl, useGeometry } from "@/features/data/hooks";
import { edgeColor } from "@/features/graph/palette";
import type { GraphIndex } from "@/lib/graph/index";
import { toPixels } from "./scale";

type Props = {
  docId: string;
  index: GraphIndex;
  selected: string | null;
  page: number;
  onPage: (p: number) => void;
};

type Box = {
  key: string;
  bbox: [number, number, number, number];
  color: string;
  kind: "self" | "neighbour" | "evidence";
};

export function PageView({ docId, index, selected, page, onPage }: Props) {
  const pages = index.graph.document.pages;
  const size = pages.find((p) => p.number === page) ?? pages[0];
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const geometry = useGeometry(docId, page, selected !== null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Follow the selection to its page.
  useEffect(() => {
    const first = selected ? index.node(selected)?.regions[0] : undefined;
    if (first && first.page !== page) onPage(first.page);
  }, [selected, index, onPage, page]);

  const boxes = useMemo<Box[]>(() => {
    if (!selected) return [];
    const node = index.node(selected);
    if (!node) return [];
    const out: Box[] = [];
    for (const r of node.regions)
      if (r.page === page)
        out.push({ key: `self${r.bbox.join()}`, bbox: r.bbox, color: "#e879f9", kind: "self" });
    for (const e of [...index.out(selected), ...index.in(selected)]) {
      if (e.type === "contains") continue;
      const other = index.node(e.source === selected ? e.target : e.source);
      for (const r of other?.regions ?? [])
        if (r.page === page)
          out.push({
            key: `n${e.id}${r.bbox.join()}`,
            bbox: r.bbox,
            color: edgeColor(e.type),
            kind: "neighbour",
          });
    }
    // Evidence words: the selected node's words inside any of its own evidence spans.
    const spans = [
      ...index
        .out(selected)
        .filter((e) => e.evidence && e.evidence_on === "source")
        .map((e) => ({ s: e.evidence, c: edgeColor(e.type) })),
      ...index
        .in(selected)
        .filter((e) => e.evidence && e.evidence_on === "target")
        .map((e) => ({ s: e.evidence, c: edgeColor(e.type) })),
    ];
    for (const w of geometry.data ?? []) {
      if (w.node !== selected || w.start === null || w.end === null) continue;
      const ws = w.start;
      const we = w.end;
      const hit = spans.find(({ s }) => s && ws < s.end && we > s.start);
      if (hit) out.push({ key: `w${ws}`, bbox: w.bbox, color: hit.c, kind: "evidence" });
    }
    return out;
  }, [selected, index, page, geometry.data]);

  // Bring the selected part's region into view inside the page pane.
  useEffect(() => {
    const el = wrap.current;
    const self = boxes.find((b) => b.kind === "self");
    if (!el || !self || !size || width === 0) return;
    const top = (self.bbox[1] * width) / size.width;
    el.scrollTo({ top: Math.max(0, top - 48), behavior: "smooth" });
  }, [boxes, size, width]);

  if (!size) return null;
  const height = (width * size.height) / size.width;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 font-mono text-[11px] text-fg-muted">
        <button
          type="button"
          aria-label="previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span data-testid="page-number">
          page {page} / {pages.length}
        </span>
        <button
          type="button"
          aria-label="next page"
          disabled={page >= pages.length}
          onClick={() => onPage(page + 1)}
          className="disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div ref={wrap} className="relative min-h-0 flex-1 overflow-auto bg-[#1b1b22] p-0">
        {width > 0 && (
          <div className="relative" style={{ width, height }}>
            {/* biome-ignore lint/performance/noImgElement: page images come from the API at fixed size */}
            <img
              src={pageImageUrl(docId, page)}
              alt={`page ${page} of the document`}
              width={width}
              height={height}
              className="block select-none"
              draggable={false}
            />
            <svg
              className="pointer-events-none absolute inset-0"
              width={width}
              height={height}
              aria-hidden="true"
            >
              {boxes.map((b) => {
                const p = toPixels(b.bbox, size, width);
                return (
                  <rect
                    key={b.key}
                    x={p.left - 2}
                    y={p.top - 2}
                    width={p.width + 4}
                    height={p.height + 4}
                    rx={3}
                    fill={b.color}
                    fillOpacity={b.kind === "evidence" ? 0.32 : b.kind === "self" ? 0.1 : 0.06}
                    stroke={b.color}
                    strokeOpacity={b.kind === "evidence" ? 0 : 0.9}
                    strokeWidth={b.kind === "self" ? 2 : 1}
                    strokeDasharray={b.kind === "neighbour" ? "4 3" : undefined}
                    data-kind={b.kind}
                  />
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
