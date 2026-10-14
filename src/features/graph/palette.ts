/**
 * The graph's colours: one per edge family (validated with the dataviz validator, dark surface, all
 * pairs; shape and line style carry the secondary encoding). Values mirror the CSS tokens in
 * globals.css so canvas/WebGL code (which cannot read CSS variables cheaply per frame) agrees with
 * the legend.
 */
import type { EdgeType, Family, NodeKind, Tier } from "@/lib/contract/graph";
import { FAMILY_OF } from "@/lib/contract/graph";

export const FAMILY_COLOR: Record<Family, string> = {
  structure: "#898781",
  notes: "#c98500",
  terms: "#008300",
  references: "#3987e5",
  logic: "#d55181",
};

export const FAMILY_LABEL: Record<Family, string> = {
  structure: "structure",
  notes: "notes",
  terms: "terms",
  references: "references",
  logic: "logic",
};

export const NODE_COLOR: Record<NodeKind, string> = {
  document: "#f0efec",
  section: "#d9d7cf",
  paragraph: "#898781",
  list_item: "#9d9b94",
  table: "#b5b3ab",
  note: FAMILY_COLOR.notes,
  definition: FAMILY_COLOR.terms,
  term: "#1fa61f",
  external: FAMILY_COLOR.references,
};

export const TIER_COLOR: Record<Tier, string> = {
  A: "#0ca30c",
  B: "#fab219",
  C: "#ec835a",
  D: "#d03b3b",
};

export const SELECTED = "#ffffff";
export const ACCENT = "#e879f9";

export function edgeColor(type: EdgeType): string {
  return FAMILY_COLOR[FAMILY_OF[type]];
}

export const KIND_LABEL: Record<NodeKind, string> = {
  document: "document",
  section: "section",
  paragraph: "paragraph",
  list_item: "list item",
  table: "table",
  note: "note",
  definition: "definition",
  term: "term",
  external: "outside source",
};

/** Node size by kind, grown gently by degree. */
export function nodeSize(kind: NodeKind, degree: number): number {
  const base: Record<NodeKind, number> = {
    document: 9,
    section: 5,
    paragraph: 2.2,
    list_item: 2,
    table: 3.6,
    note: 2.6,
    definition: 3,
    term: 3.2,
    external: 3.2,
  };
  return base[kind] * (1 + Math.min(1.6, Math.log10(1 + degree) * 0.8));
}
