import "server-only";

/**
 * What the backend proxy forwards (spec 02 § 2): the path allowlist and the header allowlists in
 * both directions. Pure; the proxy itself is `backend-proxy.ts`.
 */

/** Request headers copied from the browser. Never cookies, never `authorization`. */
export const PROXY_REQUEST_HEADERS = [
  "accept",
  "last-event-id",
  "x-request-id",
  "if-none-match",
] as const;

/** Response headers copied from the backend. */
export const PROXY_RESPONSE_HEADERS = [
  "content-type",
  "cache-control",
  "etag",
  "content-disposition",
  "retry-after",
  "x-request-id",
  "last-event-id",
  "x-accel-buffering",
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_PNG = /^[0-9]{1,5}\.png$/;
const PAGE = /^[0-9]{1,5}$/;
// A node, edge or role id: a kind letter, 16 hex digits, an optional repeat count, an optional role.
const ELEMENT = /^[a-z]:[0-9a-f]{16}(?::[0-9]{1,4})?(?:#[a-z_]{1,40})?$/;
const DOCUMENT_LEAVES = new Set([
  "graph",
  "graph.jsonld",
  "graph.graphml",
  "graph.cypher",
  "reading",
]);
const AFTER = /^\?after=[0-9]{1,9}$/;

type Match = { readonly ok: boolean; readonly query: "none" | "after" };
const NO: Match = { ok: false, query: "none" };
const YES: Match = { ok: true, query: "none" };

/** Whether the decoded segments name a route the browser may read, and which query it may carry. */
function match(s: readonly string[]): Match {
  const [head, id, leaf, extra, last] = s;
  if (s.length === 1 && head === "samples") return YES;
  if (head === "jobs" && id !== undefined && UUID.test(id)) {
    if (s.length === 2) return YES;
    if (s.length === 3 && leaf === "events") return { ok: true, query: "after" };
    return NO;
  }
  if (head !== "documents" || id === undefined || !UUID.test(id)) return NO;
  if (s.length === 2) return YES;
  if (s.length === 3 && leaf !== undefined && DOCUMENT_LEAVES.has(leaf)) return YES;
  if (leaf === "pages" && extra !== undefined) {
    if (s.length === 4 && PAGE_PNG.test(extra)) return YES;
    if (s.length === 5 && PAGE.test(extra) && last === "geometry") return YES;
    return NO;
  }
  if (s.length === 4 && leaf === "why" && extra !== undefined && ELEMENT.test(extra)) return YES;
  return NO;
}

/**
 * The backend URL for a proxied read, or `null` when the proxy must refuse it: a route outside the
 * allowlist, a query other than `?after=<digits>` on a job's events, or a result whose origin is not
 * the backend's (the SSRF guard). Segments arrive decoded and are re-encoded here.
 */
export function resolveUpstreamUrl(
  backendBase: string,
  segments: readonly string[],
  search: string,
): URL | null {
  const found = match(segments);
  if (!found.ok) return null;
  if (search !== "" && !(found.query === "after" && AFTER.test(search))) return null;
  const base = new URL(backendBase);
  const prefix = base.pathname.replace(/\/+$/, "");
  const path = segments.map(encodeURIComponent).join("/");
  const url = new URL(`${prefix}/${path}${search}`, base.origin);
  return url.origin === base.origin ? url : null;
}

function clientAddress(incoming: Headers): string | null {
  for (const name of ["x-forwarded-for", "x-real-ip"]) {
    const value = incoming.get(name)?.split(",")[0]?.trim();
    if (value) return value;
  }
  return null;
}

/** Headers for the upstream request: the allowlist, the fresh token, the visitor's address. */
export function upstreamRequestHeaders(incoming: Headers, token: string): Headers {
  const out = new Headers();
  for (const name of PROXY_REQUEST_HEADERS) {
    const value = incoming.get(name);
    if (value !== null) out.set(name, value);
  }
  out.set("x-platform-token", token);
  const client = clientAddress(incoming);
  if (client !== null) out.set("x-forwarded-for", client);
  return out;
}

/** Headers for the browser: the allowlist, nothing else. */
export function downstreamResponseHeaders(upstream: Headers): Headers {
  const out = new Headers();
  for (const name of PROXY_RESPONSE_HEADERS) {
    const value = upstream.get(name);
    if (value !== null) out.set(name, value);
  }
  return out;
}
