/** Zod mirrors of the backend's DTOs and event payloads (backend spec 07). */
import { z } from "zod";
import { Basis, EdgeType, NodeKind, Role } from "./graph";

export const ErrorEnvelope = z.object({
  error: z.string(),
  message: z.string(),
  detail: z.unknown().optional(),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export const StageName = z.enum([
  "read",
  "structure",
  "classify_rules",
  "classify_agent",
  "link_rules",
  "relate_agent",
  "verify_agent",
  "finalize",
]);
export type StageName = z.infer<typeof StageName>;
export const STAGES = StageName.options;

export const JobOut = z.object({
  id: z.string(),
  document_id: z.string(),
  status: z.enum(["queued", "running", "succeeded", "failed"]),
  stage: z.string().nullable(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
  llm: z.object({
    requests: z.number(),
    cached: z.number(),
    failed: z.number(),
    rejected: z.number(),
  }),
  stages: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      ms: z.number().nullable().optional(),
      reason: z.string().nullable().optional(),
    }),
  ),
});
export type JobOut = z.infer<typeof JobOut>;

export const DocumentOut = z.object({
  id: z.string(),
  sha256: z.string(),
  file_name: z.string().nullable(),
  title: z.string().nullable(),
  page_count: z.number().int(),
  kind: z.enum(["sample", "upload"]),
  status: z.enum(["queued", "processing", "ready", "failed"]),
  created_at: z.string(),
  expires_at: z.string().nullable(),
  stats: z
    .object({
      nodes: z.number(),
      edges: z.number(),
      tiers: z.record(z.string(), z.number()),
    })
    .nullable(),
  latest_job: JobOut.nullable(),
});
export type DocumentOut = z.infer<typeof DocumentOut>;

export const UploadOut = z.object({
  document: DocumentOut,
  job: JobOut.nullable(),
  deduplicated: z.boolean().default(false),
});
export type UploadOut = z.infer<typeof UploadOut>;

export const SamplesOut = z.object({ items: z.array(DocumentOut) });

export const NodeSketch = z.object({
  id: z.string(),
  kind: NodeKind,
  label: z.string(),
  section: z.string().nullable(),
  depth: z.number().int(),
  order: z.number().int(),
  page: z.number().int().nullable(),
});
export type NodeSketch = z.infer<typeof NodeSketch>;
export const EdgeSketch = z.object({
  id: z.string(),
  type: EdgeType,
  source: z.string(),
  target: z.string(),
  basis: Basis,
});
export type EdgeSketch = z.infer<typeof EdgeSketch>;

export const StageEvent = z.object({
  stage: StageName,
  status: z.enum(["started", "completed", "skipped", "failed"]),
  ms: z.number().nullable().optional(),
  reason: z.string().nullable().optional(),
  counts: z.record(z.string(), z.number()).nullable().optional(),
});
export const DeltaEvent = z.object({
  stage: z.string(),
  nodes: z.array(NodeSketch),
  edges: z.array(EdgeSketch),
  roles: z.array(z.object({ node: z.string(), role: Role, basis: Basis })),
  flags: z.array(z.object({ node: z.string(), code: z.string() })),
});
export const LlmEvent = z.object({
  task: z.string(),
  model: z.string().nullable(),
  cached: z.boolean(),
  ok: z.boolean(),
  status: z.string(),
  ms: z.number().nullable().optional(),
});
export const DoneEvent = z.object({
  document_id: z.string(),
  graph_hash: z.string(),
  stats: z.record(z.string(), z.unknown()).optional(),
});
export const FailedEvent = z.object({ code: z.string(), message: z.string() });

export type StageEvent = z.infer<typeof StageEvent>;
export type DeltaEvent = z.infer<typeof DeltaEvent>;
export type LlmEvent = z.infer<typeof LlmEvent>;
export type DoneEvent = z.infer<typeof DoneEvent>;
export type FailedEvent = z.infer<typeof FailedEvent>;

export type JobEvent =
  | { id: number; type: "stage"; data: StageEvent }
  | { id: number; type: "delta"; data: DeltaEvent }
  | { id: number; type: "llm"; data: LlmEvent }
  | { id: number; type: "done"; data: DoneEvent }
  | { id: number; type: "failed"; data: FailedEvent };

export const GeometryWord = z.object({
  node: z.string().nullable(),
  start: z.number().int().nullable(),
  end: z.number().int().nullable(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});
export const PageGeometry = z.array(GeometryWord);
export type GeometryWord = z.infer<typeof GeometryWord>;

export const WhyOut = z.object({
  element: z.string(),
  kind: z.enum(["node", "edge", "role"]),
  maker: z.object({
    actor: z.string(),
    id: z.string(),
    model: z.string().nullable().optional(),
    request_key: z.string().nullable().optional(),
  }),
  statement: z.string(),
  evidence: z.object({ start: z.number(), end: z.number(), quote: z.string() }).nullable(),
  reasons: z.array(z.object({ code: z.string(), severity: z.string() }).passthrough()),
  verdict: z.unknown().nullable().optional(),
  ops: z.array(
    z
      .object({ seq: z.number(), stage: z.string(), kind: z.string(), method: z.string() })
      .passthrough(),
  ),
});
export type WhyOut = z.infer<typeof WhyOut>;
