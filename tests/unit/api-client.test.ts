import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiUrl, getJson, isColdStartError, withColdStartRetry } from "@/lib/api/client";
import { HttpError, NetworkError, ParseError, TimeoutError } from "@/lib/api/errors";

const S = z.object({ ok: z.boolean() });
afterEach(() => vi.unstubAllGlobals());

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

describe("api client (T-FE-9)", () => {
  it("parses a valid body", async () => {
    respond(200, { ok: true });
    await expect(getJson("/x", S)).resolves.toEqual({ ok: true });
  });
  it("throws HttpError with the envelope's code", async () => {
    respond(429, { error: "rate_limited", message: "slow down" });
    const err = await getJson("/x", S).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).code).toBe("rate_limited");
    expect((err as HttpError).status).toBe(429);
  });
  it("throws ParseError on a schema mismatch", async () => {
    respond(200, { ok: "yes" });
    await expect(getJson("/x", S)).rejects.toBeInstanceOf(ParseError);
  });
  it("throws NetworkError when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("down");
      }),
    );
    await expect(getJson("/x", S)).rejects.toBeInstanceOf(NetworkError);
  });
  it("throws TimeoutError when the request times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_u: unknown, init: RequestInit) =>
          new Promise((_r, reject) =>
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason)),
          ),
      ),
    );
    await expect(getJson("/x", S, { timeoutMs: 10 })).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe("cold start retry", () => {
  it("retries once on a network error or 5xx, not on 4xx", async () => {
    expect(isColdStartError(new NetworkError("x"))).toBe(true);
    expect(isColdStartError(new HttpError(503, ""))).toBe(true);
    expect(isColdStartError(new HttpError(404, ""))).toBe(false);
    let n = 0;
    const op = vi.fn(async () => {
      n += 1;
      if (n === 1) throw new NetworkError("cold");
      return 7;
    });
    await expect(withColdStartRetry(op, 1)).resolves.toBe(7);
    expect(op).toHaveBeenCalledTimes(2);
  });
});

describe("same-origin proxy URLs (T-PX-14)", () => {
  it("points every data call at /api/backend", () => {
    expect(apiUrl("/samples")).toBe("/api/backend/samples");
    expect(apiUrl("/documents/x/pages/1.png")).toBe("/api/backend/documents/x/pages/1.png");
  });
  it("fetches the proxy path", async () => {
    const f = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", f);
    await getJson("/samples", S);
    expect(f.mock.calls[0]?.[0]).toBe("/api/backend/samples");
  });
});
