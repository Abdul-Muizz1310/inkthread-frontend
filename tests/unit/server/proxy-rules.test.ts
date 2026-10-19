// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  downstreamResponseHeaders,
  resolveUpstreamUrl,
  upstreamRequestHeaders,
} from "@/lib/server/proxy-rules";

/** Spec 02 § 2, T-PX-4…7: what the proxy forwards. */

const BASE = "http://backend.test";
const ID = "11111111-1111-4111-8111-111111111111";
const at = (segments: string[], search = "") => resolveUpstreamUrl(BASE, segments, search)?.href;

describe("allowlisted paths (T-PX-4)", () => {
  it.each([
    [["samples"], "", `${BASE}/samples`],
    [["documents", ID], "", `${BASE}/documents/${ID}`],
    [["documents", ID, "graph"], "", `${BASE}/documents/${ID}/graph`],
    [["documents", ID, "graph.jsonld"], "", `${BASE}/documents/${ID}/graph.jsonld`],
    [["documents", ID, "graph.graphml"], "", `${BASE}/documents/${ID}/graph.graphml`],
    [["documents", ID, "graph.cypher"], "", `${BASE}/documents/${ID}/graph.cypher`],
    [["documents", ID, "reading"], "", `${BASE}/documents/${ID}/reading`],
    [["documents", ID, "pages", "3.png"], "", `${BASE}/documents/${ID}/pages/3.png`],
    [["documents", ID, "pages", "12", "geometry"], "", `${BASE}/documents/${ID}/pages/12/geometry`],
    [["jobs", ID], "", `${BASE}/jobs/${ID}`],
    [["jobs", ID, "events"], "", `${BASE}/jobs/${ID}/events`],
    [["jobs", ID, "events"], "?after=42", `${BASE}/jobs/${ID}/events?after=42`],
  ])("%j%s → %s", (segments, search, expected) => {
    expect(at(segments, search)).toBe(expected);
  });

  it.each([
    "p:4109c48ee22fb618",
    "e:0123456789abcdef",
    "d:31a66e827c4549e5",
    "p:4109c48ee22fb618:2",
    "p:4109c48ee22fb618#obligation",
  ])("re-encodes the why element %s", (element) => {
    const url = at(["documents", ID, "why", element]);
    expect(url).toBe(`${BASE}/documents/${ID}/why/${encodeURIComponent(element)}`);
    expect(decodeURIComponent(new URL(url ?? "").pathname.split("/").at(-1) ?? "")).toBe(element);
  });

  it("keeps a base path", () => {
    expect(resolveUpstreamUrl("http://backend.test/api/", ["samples"], "")?.href).toBe(
      "http://backend.test/api/samples",
    );
  });
});

describe("refused paths (T-PX-5)", () => {
  it.each([
    [[], ""],
    [["health"], ""],
    [["documents"], ""],
    [["documents", "not-a-uuid"], ""],
    [["documents", ID, "reprocess"], ""],
    [["jobs", ID, "cancel"], ""],
    [["jobs", "not-a-uuid"], ""],
    [["documents", ID, ".."], ""],
    [["..", "samples"], ""],
    [["documents", ID, "pages", "a.png"], ""],
    [["documents", ID, "pages", "1.png.exe"], ""],
    [["documents", ID, "pages", "1", "geometry", "x"], ""],
    [["documents", ID, "graph.exe"], ""],
    [["documents", ID, "why", "p:../../x"], ""],
    [["documents", ID, "why", "p:4109c48ee22fb618/../x"], ""],
    [["documents", `${ID}/x`], ""],
    [["samples"], "?x=1"],
    [["documents", ID], "?after=1"],
    [["jobs", ID, "events"], "?after=abc"],
    [["jobs", ID, "events"], "?after=1&x=2"],
    [["jobs", ID, "events"], "after=1"],
  ])("%j%s", (segments, search) => {
    expect(resolveUpstreamUrl(BASE, segments, search)).toBeNull();
  });

  it("refuses a base that would leave the backend's origin", () => {
    expect(resolveUpstreamUrl("http://backend.test//evil.test/", ["samples"], "")).toBeNull();
  });
});

describe("request headers (T-PX-6)", () => {
  it("copies only the allowlist, adds the token and one client address", () => {
    const out = upstreamRequestHeaders(
      new Headers({
        accept: "text/event-stream",
        "last-event-id": "6",
        "x-request-id": "r-1",
        "if-none-match": '"abc"',
        cookie: "session=1",
        authorization: "Bearer leaked",
        "x-platform-token": "forged",
        origin: "https://evil.test",
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      }),
      "fresh-token",
    );
    expect(Object.fromEntries(out.entries())).toEqual({
      accept: "text/event-stream",
      "last-event-id": "6",
      "x-request-id": "r-1",
      "if-none-match": '"abc"',
      "x-platform-token": "fresh-token",
      "x-forwarded-for": "203.0.113.7",
    });
  });

  it("falls back to x-real-ip, and sends no address when there is none", () => {
    const real = upstreamRequestHeaders(new Headers({ "x-real-ip": "198.51.100.2" }), "t");
    expect(real.get("x-forwarded-for")).toBe("198.51.100.2");
    expect(upstreamRequestHeaders(new Headers(), "t").has("x-forwarded-for")).toBe(false);
  });
});

describe("response headers (T-PX-7)", () => {
  it("copies only the allowlist", () => {
    const out = downstreamResponseHeaders(
      new Headers({
        "content-type": "image/png",
        "cache-control": "public, max-age=31536000, immutable",
        etag: '"h"',
        "content-disposition": 'attachment; filename="x.cypher"',
        "retry-after": "30",
        "x-request-id": "r",
        "last-event-id": "7",
        "x-accel-buffering": "no",
        "set-cookie": "a=1",
        server: "uvicorn",
        "access-control-allow-origin": "*",
      }),
    );
    expect([...out.keys()].sort()).toEqual(
      [
        "cache-control",
        "content-disposition",
        "content-type",
        "etag",
        "last-event-id",
        "retry-after",
        "x-accel-buffering",
        "x-request-id",
      ].sort(),
    );
  });
});
