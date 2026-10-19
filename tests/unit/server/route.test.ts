// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { decodePart, ed25519Pair, verifiesWith } from "./keys";

/**
 * Spec 02 T-PX-8…13: the real route modules, token minting and rules; only `fetch` stands in for
 * the backend, so nothing opens a socket.
 */

const BACKEND = "http://backend.test";
const ID = "11111111-1111-4111-8111-111111111111";
const pair = ed25519Pair();

type ProxyModule = typeof import("@/app/api/backend/[...path]/route");
type TokenModule = typeof import("@/app/api/upload-token/route");

let proxy: ProxyModule;
let upload: TokenModule;
let fetchMock: Mock<(input: URL | RequestInfo, init?: RequestInit) => Promise<Response>>;

function get(path: string[], init: RequestInit & { query?: string } = {}): Promise<Response> {
  const { query = "", ...rest } = init;
  const url = `http://localhost:3000/api/backend/${path.map(encodeURIComponent).join("/")}${query}`;
  return proxy.GET(new Request(url, rest) as Parameters<ProxyModule["GET"]>[0], {
    params: Promise.resolve({ path }),
  });
}

function upstream(index = 0): { url: string; init: RequestInit; headers: Headers } {
  const [input, init] = fetchMock.mock.calls[index];
  return {
    url: input instanceof URL ? input.href : String(input),
    init: init ?? {},
    headers: new Headers(init?.headers),
  };
}

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", BACKEND);
  vi.stubEnv("INKTHREAD_FRONTEND_SIGNING_KEY_PRIVATE", pair.privateB64);
  fetchMock = vi.fn(async () => Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  vi.resetModules();
  proxy = await import("@/app/api/backend/[...path]/route");
  upload = await import("@/app/api/upload-token/route");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("segment config (T-PX-12)", () => {
  it("exports GET only, on Node, dynamic, for five minutes", () => {
    expect(typeof proxy.GET).toBe("function");
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(method in proxy).toBe(false);
    }
    expect(proxy.runtime).toBe("nodejs");
    expect(proxy.dynamic).toBe("force-dynamic");
    expect(proxy.maxDuration).toBe(300);
  });
});

describe("forwarding (T-PX-8)", () => {
  it("signs, forwards and returns the allowlisted answer", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"items":[]}', {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": "r-9", server: "x" },
      }),
    );
    const res = await get(["samples"], {
      headers: { "x-forwarded-for": "203.0.113.7", cookie: "s=1", "x-request-id": "r-9" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const up = upstream();
    expect(up.url).toBe(`${BACKEND}/samples`);
    expect(up.init.method).toBe("GET");
    expect(up.init.cache).toBe("no-store");
    expect(up.init.redirect).toBe("manual");
    expect(up.init.signal).toBeInstanceOf(AbortSignal);
    const token = up.headers.get("x-platform-token") ?? "";
    expect(verifiesWith(token, pair.publicB64)).toBe(true);
    expect(decodePart(token.split(".")[1])).toMatchObject({
      iss: "inkthread-frontend",
      aud: "inkthread",
      role: "frontend",
    });
    expect(up.headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(up.headers.has("cookie")).toBe(false);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("r-9");
    expect(res.headers.has("server")).toBe(false);
    expect(await res.text()).toBe('{"items":[]}');
  });

  it("passes an upstream error status through", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "graph_not_ready" }, { status: 409 }));
    const res = await get(["documents", ID, "reading"]);
    expect(res.status).toBe(409);
    expect(upstream().url).toBe(`${BACKEND}/documents/${ID}/reading`);
  });
});

describe("the event stream (T-PX-9)", () => {
  it("delivers the first event while the upstream is still open", async () => {
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    });
    fetchMock.mockResolvedValueOnce(
      new Response(body, {
        status: 200,
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache, no-transform",
          "x-accel-buffering": "no",
        },
      }),
    );
    const res = await get(["jobs", ID, "events"], {
      query: "?after=3",
      headers: { accept: "text/event-stream", "last-event-id": "3" },
    });
    expect(upstream().url).toBe(`${BACKEND}/jobs/${ID}/events?after=3`);
    expect(upstream().headers.get("last-event-id")).toBe("3");
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
    const reader = res.body?.getReader();
    if (!reader || !controller) throw new Error("no stream");
    const first = 'id: 4\nevent: stage\ndata: {"stage":"read"}\n\n';
    controller.enqueue(encoder.encode(first));
    const chunk = await reader.read();
    expect(new TextDecoder().decode(chunk.value)).toBe(first);
    controller.close();
    expect((await reader.read()).done).toBe(true);
  });
});

describe("binary and downloads (T-PX-10)", () => {
  it("keeps a page PNG's type and bytes", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 255, 7]);
    fetchMock.mockResolvedValueOnce(
      new Response(png, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "cache-control": "public, max-age=31536000, immutable",
        },
      }),
    );
    const res = await get(["documents", ID, "pages", "2.png"]);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(png);
  });

  it("keeps an export's content-disposition", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("MERGE (n)", {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "content-disposition": 'attachment; filename="inkthread-abc.cypher"',
        },
      }),
    );
    const res = await get(["documents", ID, "graph.cypher"]);
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="inkthread-abc.cypher"',
    );
  });
});

describe("failures (T-PX-11)", () => {
  it("answers 503 without a key, and calls nothing", async () => {
    vi.stubEnv("INKTHREAD_FRONTEND_SIGNING_KEY_PRIVATE", "");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await get(["samples"]);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "proxy not configured" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(errors.mock.calls[0]?.[0])).not.toContain(pair.privateB64);
  });

  it("answers 502 when the backend is unreachable", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await get(["samples"]);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "backend unreachable" });
  });

  it("does not log a closed tab as a failure", async () => {
    const abort = new AbortController();
    fetchMock.mockImplementationOnce(async () => {
      abort.abort();
      throw new DOMException("aborted", "AbortError");
    });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await get(["samples"], { signal: abort.signal });
    expect(res.status).toBe(502);
    expect(errors).not.toHaveBeenCalled();
  });

  it("answers 400 for a refused path, and calls nothing", async () => {
    const res = await get(["documents", ID, "reprocess"]);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid path" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("the upload token (T-PX-13)", () => {
  it("answers a token for inkthread, the backend's upload URL and no-store", async () => {
    const res = await upload.POST();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { token: string; url: string; expires_at: number };
    expect(body.url).toBe(`${BACKEND}/documents`);
    expect(verifiesWith(body.token, pair.publicB64)).toBe(true);
    const claims = decodePart(body.token.split(".")[1]) as { aud: string; exp: number };
    expect(claims.aud).toBe("inkthread");
    expect(body.expires_at).toBe(claims.exp);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 503 without a key", async () => {
    vi.stubEnv("INKTHREAD_FRONTEND_SIGNING_KEY_PRIVATE", "garbage!");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await upload.POST();
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("exports POST only, on Node, dynamic", () => {
    expect(typeof upload.POST).toBe("function");
    expect("GET" in upload).toBe(false);
    expect(upload.runtime).toBe("nodejs");
    expect(upload.dynamic).toBe("force-dynamic");
  });
});
