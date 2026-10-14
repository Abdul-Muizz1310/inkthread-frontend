import { readFileSync } from "node:fs";
import type { Page, Route } from "@playwright/test";

export const API = "http://api.test";
const DIR = "tests/fixtures/samples/uspto";
export const graph = JSON.parse(readFileSync(`${DIR}/graph.json`, "utf8"));
const events: { id: number; event: string; data: unknown }[] = JSON.parse(
  readFileSync(`${DIR}/events.json`, "utf8"),
);
export const DOC_ID = "11111111-1111-4111-8111-111111111111";
export const JOB_ID = "22222222-2222-4222-8222-222222222222";

const job = (status: "running" | "succeeded") => ({
  id: JOB_ID,
  document_id: DOC_ID,
  status,
  stage: null,
  created_at: "2026-10-14T00:00:00Z",
  started_at: "2026-10-14T00:00:01Z",
  finished_at: status === "succeeded" ? "2026-10-14T00:00:30Z" : null,
  error: null,
  llm: { requests: 0, cached: 0, failed: 0, rejected: 0 },
  stages: [],
});
export const doc = (status: "processing" | "ready") => ({
  id: DOC_ID,
  sha256: graph.document.sha256,
  file_name: "uspto-fee-schedule.pdf",
  title: "USPTO fee schedule",
  page_count: graph.document.page_count,
  kind: "sample",
  status,
  created_at: "2026-10-14T00:00:00Z",
  expires_at: null,
  stats: { nodes: graph.nodes.length, edges: graph.edges.length, tiers: graph.stats.tiers },
  latest_job: job(status === "ready" ? "succeeded" : "running"),
});

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "*",
};
const json = (route: Route, body: unknown, status = 200, headers: Record<string, string> = {}) =>
  route.fulfill({
    status,
    contentType: "application/json",
    headers: { ...cors, ...headers },
    body: JSON.stringify(body),
  });

export function sseBody(): string {
  return (
    events
      .map((e) => `id: ${e.id}\nevent: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`)
      .join("") +
    `id: ${events.length + 1}\nevent: done\ndata: ${JSON.stringify({ document_id: DOC_ID, graph_hash: graph.provenance.graph_hash, stats: {} })}\n\n`
  );
}

export type MockOptions = {
  building?: boolean;
  upload?: { status: number; body: unknown; headers?: Record<string, string> };
};

export async function mockApi(page: Page, opts: MockOptions = {}) {
  let built = !opts.building;
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (p === "/samples") return json(route, { items: [doc("ready")] });
    if (p === "/documents" && req.method() === "POST") {
      const u = opts.upload ?? {
        status: 202,
        body: { document: doc("processing"), job: job("running"), deduplicated: false },
      };
      if (u.status === 202) built = false;
      return json(route, u.body, u.status, u.headers);
    }
    if (p === `/documents/${DOC_ID}`) return json(route, doc(built ? "ready" : "processing"));
    if (p === `/documents/${DOC_ID}/graph`) return json(route, graph);
    if (p === `/jobs/${JOB_ID}/events`) {
      built = true;
      return route.fulfill({
        status: 200,
        headers: { ...cors, "content-type": "text/event-stream" },
        body: sseBody(),
      });
    }
    const pageImg = p.match(new RegExp(`^/documents/${DOC_ID}/pages/(\\d+)\\.png$`));
    if (pageImg)
      return route.fulfill({
        status: 200,
        headers: cors,
        contentType: "image/png",
        body: readFileSync(`${DIR}/pages/${pageImg[1]}.png`),
      });
    const geo = p.match(new RegExp(`^/documents/${DOC_ID}/pages/(\\d+)/geometry$`));
    if (geo) return json(route, JSON.parse(readFileSync(`${DIR}/pages/${geo[1]}.json`, "utf8")));
    if (p.startsWith(`/documents/${DOC_ID}/why/`))
      return json(route, {
        element: "x",
        kind: "node",
        maker: { actor: "inkgrid", id: "inkgrid" },
        statement: "read from the PDF's text layer by inkgrid",
        evidence: null,
        reasons: [],
        verdict: null,
        ops: [{ seq: 1, stage: "structure", kind: "add_node", method: "inkgrid" }],
      });
    return json(route, { error: "not_found", message: "no such thing" }, 404);
  });
}
