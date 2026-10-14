/**
 * Zod mirror of `inkthread.graph/1` (backend spec 01). Every server payload is parsed here at the
 * boundary; the rest of the app only ever sees these inferred types.
 */
import { z } from "zod";

export const NODE_KINDS = [
  "document",
  "section",
  "paragraph",
  "list_item",
  "table",
  "note",
  "definition",
  "term",
  "external",
] as const;
export const EDGE_TYPES = [
  "contains",
  "continues",
  "cites_note",
  "defines",
  "uses_term",
  "refers_to",
  "cites_external",
  "governs",
  "qualifies",
  "overrides",
  "illustrates",
] as const;
export const FAMILIES = ["structure", "notes", "terms", "references", "logic"] as const;
export const ROLES = [
  "obligation",
  "permission",
  "prohibition",
  "condition",
  "exception",
  "definition",
  "computation",
  "method",
  "procedure",
  "temporal",
  "quantitative",
  "scope",
  "convention",
  "example",
  "external_pointer",
  "administrative",
  "summary",
  "claim",
] as const;
export const TIERS = ["A", "B", "C", "D"] as const;

export const NodeKind = z.enum(NODE_KINDS);
export const EdgeType = z.enum(EDGE_TYPES);
export const Family = z.enum(FAMILIES);
export const Role = z.enum(ROLES);
export const Tier = z.enum(TIERS);
export const Basis = z.enum(["explicit", "semantic"]);
export const Actor = z.enum(["inkgrid", "rule", "agent", "verifier"]);

export type NodeKind = z.infer<typeof NodeKind>;
export type EdgeType = z.infer<typeof EdgeType>;
export type Family = z.infer<typeof Family>;
export type Role = z.infer<typeof Role>;
export type Tier = z.infer<typeof Tier>;
export type Basis = z.infer<typeof Basis>;

export const FAMILY_OF: Record<EdgeType, Family> = {
  contains: "structure",
  continues: "structure",
  cites_note: "notes",
  defines: "terms",
  uses_term: "terms",
  refers_to: "references",
  cites_external: "references",
  governs: "logic",
  qualifies: "logic",
  overrides: "logic",
  illustrates: "logic",
};

const Bbox = z.tuple([z.number(), z.number(), z.number(), z.number()]);
export const Span = z.object({ start: z.number().int(), end: z.number().int(), quote: z.string() });
export type Span = z.infer<typeof Span>;
export const Region = z.object({ page: z.number().int().min(1), bbox: Bbox });
export type Region = z.infer<typeof Region>;

export const Maker = z.object({
  actor: Actor,
  id: z.string(),
  model: z.string().nullable().optional(),
  request_key: z.string().nullable().optional(),
});
export type Maker = z.infer<typeof Maker>;

export const Reason = z.object({
  code: z.string(),
  severity: z.enum(["info", "advice", "flag", "doubt", "critical"]),
  detail: z.string().nullable().optional(),
});
export const Confidence = z.object({
  tier: Tier,
  score: z.number(),
  reasons: z.array(Reason).default([]),
});
export type Confidence = z.infer<typeof Confidence>;

export const Verdict = z.object({
  verdict: z.enum(["supported", "unsupported", "abstain"]),
  model: z.string(),
  request_key: z.string(),
});
export const Flag = z.object({ code: z.string(), detail: z.string().nullable().optional() });
export type Flag = z.infer<typeof Flag>;

export const RoleAssignment = z.object({
  role: Role,
  evidence: Span.nullable().optional(),
  made_by: Maker,
  basis: Basis,
  confidence: Confidence,
  verdict: Verdict.nullable().optional(),
});
export type RoleAssignment = z.infer<typeof RoleAssignment>;

export const CellInfo = z.object({
  row: z.number().int(),
  col: z.number().int(),
  row_span: z.number().int(),
  col_span: z.number().int(),
  text: z.string(),
  is_header: z.boolean(),
  header_path: z.array(z.string()).default([]),
  row_labels: z.array(z.string()).default([]),
  markers: z.array(z.string()).default([]),
  carried: z.boolean().default(false),
  page: z.number().int(),
  bbox: Bbox.nullable().optional(),
});
export type CellInfo = z.infer<typeof CellInfo>;

export const TableInfo = z.object({
  n_rows: z.number().int(),
  n_cols: z.number().int(),
  header_rows: z.number().int(),
  banner_rows: z.array(z.number().int()).default([]),
  source: z.enum(["lattice", "corridor"]),
  cells: z.array(CellInfo),
});
export type TableInfo = z.infer<typeof TableInfo>;

export const Unresolved = z.object({
  kind: z.enum(["note", "reference"]),
  text: z.string(),
  span: Span.nullable().optional(),
  candidates: z.array(z.string()).default([]),
  reason: z.string(),
});
export type Unresolved = z.infer<typeof Unresolved>;

export const GraphNode = z.object({
  id: z.string(),
  kind: NodeKind,
  label: z.string(),
  label_truncated: z.boolean(),
  text: z.string(),
  order: z.number().int(),
  section: z.string().nullable(),
  depth: z.number().int(),
  regions: z.array(Region).default([]),
  roles: z.array(RoleAssignment).default([]),
  table: TableInfo.nullable().optional(),
  marker: z.string().nullable().optional(),
  flags: z.array(Flag).default([]),
  hidden_spans: z.array(Span).default([]),
  unresolved: z.array(Unresolved).default([]),
  confidence: Confidence,
  source: z.object({ blocks: z.array(z.string()), keys: z.array(z.string()) }),
  made_by: Maker,
});
export type GraphNode = z.infer<typeof GraphNode>;

export const GraphEdge = z.object({
  id: z.string(),
  type: EdgeType,
  family: Family,
  source: z.string(),
  target: z.string(),
  basis: Basis,
  evidence: Span.nullable().optional(),
  evidence_on: z.enum(["source", "target"]).default("source"),
  anchor: z.object({ row: z.number().int(), col: z.number().int() }).nullable().optional(),
  label: z.string().nullable().optional(),
  method: z.string(),
  made_by: Maker,
  confidence: Confidence,
  flags: z.array(Flag).default([]),
  verdict: Verdict.nullable().optional(),
});
export type GraphEdge = z.infer<typeof GraphEdge>;

export const Graph = z.object({
  schema: z.literal("inkthread.graph/1"),
  document: z.object({
    sha256: z.string(),
    file_name: z.string().nullable(),
    title: z.string().nullable(),
    title_node: z.string().nullable(),
    page_count: z.number().int(),
    pages: z.array(z.object({ number: z.number().int(), width: z.number(), height: z.number() })),
  }),
  nodes: z.array(GraphNode),
  edges: z.array(GraphEdge),
  set_aside: z
    .array(
      z.object({
        block: z.string(),
        kind: z.enum(["furniture", "toc"]),
        text: z.string(),
        page: z.number().int(),
        bbox: Bbox,
        reason: z.string(),
      }),
    )
    .default([]),
  findings: z
    .array(
      z.object({
        code: z.string(),
        severity: z.string(),
        page: z.number().int().nullable().optional(),
        detail: z.string().nullable().optional(),
      }),
    )
    .default([]),
  stats: z.object({
    nodes_by_kind: z.record(z.string(), z.number()),
    edges_by_type: z.record(z.string(), z.number()),
    roles: z.record(z.string(), z.number()),
    tiers: z.record(z.string(), z.number()),
  }),
  provenance: z.object({
    pipeline_version: z.string(),
    inkgrid_version: z.string(),
    prompts_hash: z.string(),
    models: z.record(z.string(), z.string()),
    ops_head: z.string(),
    ops_count: z.number().int(),
    graph_hash: z.string(),
    rejected: z
      .array(
        z.object({
          task: z.string(),
          request_key: z.string(),
          item: z.string(),
          reason: z.string(),
        }),
      )
      .default([]),
  }),
});
export type Graph = z.infer<typeof Graph>;
