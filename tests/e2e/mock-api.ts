import { readFileSync } from "node:fs";
import type { Page, Route } from "@playwright/test";

export const API = "http://api.test";
const DIR = "tests/fixtures/samples/uspto";
export const graph = JSON.parse(readFileSync(`${DIR}/graph.json`, "utf8"));
export const reading = JSON.parse(readFileSync(`${DIR}/reading.json`, "utf8"));
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
  /** The upload's page images are gone: page routes answer 410 upload_not_kept. */
  pagesGone?: boolean;
  /** The document has no reading yet: `/reading` answers 409 graph_not_ready. */
  noReading?: boolean;
};

/** The proxy's prefix: every browser read goes through the same-origin signing proxy (spec 02). */
export const PROXY = "/api/backend";
export const UPLOAD_TOKEN = "e2e-upload-token";

/**
 * Stands in for the backend behind the proxy. Reads arrive at `/api/backend/...` on the site's own
 * origin; the upload asks `/api/upload-token`, then posts straight to the backend with the token.
 * Any other request to the backend's origin means a read bypassed the proxy, and fails loudly.
 * Returns the log of calls in order.
 */
export async function mockApi(page: Page, opts: MockOptions = {}) {
  let built = !opts.building;
  const calls: string[] = [];
  await page.route("**/api/upload-token", async (route) => {
    calls.push(`${route.request().method()} /api/upload-token`);
    return json(route, { token: UPLOAD_TOKEN, url: `${API}/documents`, expires_at: 0 });
  });
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    calls.push(`${req.method()} ${API}${p}`);
    if (p !== "/documents" || req.method() !== "POST")
      return json(route, { error: "bypassed_proxy", message: `${p} skipped the proxy` }, 599);
    if (req.headers()["x-platform-token"] !== UPLOAD_TOKEN)
      return json(route, { error: "missing_platform_token", message: "no token" }, 401);
    const u = opts.upload ?? {
      status: 202,
      body: { document: doc("processing"), job: job("running"), deduplicated: false },
    };
    if (u.status === 202) built = false;
    return json(route, u.body, u.status, u.headers);
  });
  await page.route(`**${PROXY}/**`, async (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname.slice(PROXY.length);
    calls.push(`${req.method()} ${PROXY}${p}`);
    if (req.method() !== "GET") return json(route, { error: "method", message: "reads only" }, 405);
    if (p === "/samples") return json(route, { items: [doc("ready")] });
    if (p === `/documents/${DOC_ID}`) return json(route, doc(built ? "ready" : "processing"));
    if (p === `/documents/${DOC_ID}/graph`) return json(route, graph);
    if (p === `/documents/${DOC_ID}/reading`)
      return opts.noReading
        ? json(route, { error: "graph_not_ready", message: "not yet" }, 409)
        : json(route, reading);
    if (p === `/jobs/${JOB_ID}/events`) {
      built = true;
      return route.fulfill({
        status: 200,
        headers: { ...cors, "content-type": "text/event-stream" },
        body: sseBody(),
      });
    }
    const pageImg = p.match(new RegExp(`^/documents/${DOC_ID}/pages/(\\d+)\\.png$`));
    if (opts.pagesGone && p.startsWith(`/documents/${DOC_ID}/pages/`))
      return json(route, { error: "upload_not_kept", message: "files are gone" }, 410);
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
  return calls;
}
