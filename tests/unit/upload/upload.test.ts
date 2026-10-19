import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_BYTES,
  messageFor,
  UPLOAD_NOT_AUTHORISED,
  uploadPdf,
  validateFile,
} from "@/features/upload/upload";

const file = (name: string, type: string, size: number) => ({ name, type, size }) as File;

describe("upload validation (T-FE-8)", () => {
  it("accepts a PDF under the limit", () => {
    expect(validateFile(file("a.pdf", "application/pdf", 1000))).toBeNull();
    expect(validateFile(file("A.PDF", "", 1000))).toBeNull();
  });
  it("refuses other types, empty and oversized files before any request", () => {
    expect(validateFile(file("a.png", "image/png", 10))).toMatch(/PDF/);
    expect(validateFile(file("a.pdf", "application/pdf", 0))).toMatch(/empty/);
    expect(validateFile(file("a.pdf", "application/pdf", MAX_BYTES + 1))).toMatch(/15 MB/);
  });
  it("maps each API error code to a message", () => {
    for (const code of [
      "file_too_large",
      "not_a_pdf",
      "pdf_encrypted",
      "too_many_pages",
      "pdf_unreadable",
      "rate_limited",
      "queue_full",
      "empty_file",
    ]) {
      expect(messageFor(code, null)).not.toMatch(/unexpected/);
    }
    expect(messageFor("rate_limited", "120")).toMatch(/2 min/);
    expect(messageFor("weird", null)).toMatch(/unexpected/);
  });
});

type Sent = { method: string; url: string; headers: Record<string, string>; body: unknown };

class FakeXhr {
  static sent: Sent[] = [];
  static answer = { status: 202, body: "" };
  status = 0;
  responseText = "";
  timeout = 0;
  upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  private method = "";
  private url = "";
  private headers: Record<string, string> = {};
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  }
  getResponseHeader() {
    return null;
  }
  send(body: unknown) {
    FakeXhr.sent.push({ method: this.method, url: this.url, headers: this.headers, body });
    this.status = FakeXhr.answer.status;
    this.responseText = FakeXhr.answer.body;
    queueMicrotask(() => this.onload?.());
  }
}

describe("uploads go token-then-backend (T-PX-15)", () => {
  const pdf = new File([new Uint8Array([37, 80, 68, 70])], "a.pdf", { type: "application/pdf" });
  const accepted = JSON.stringify({
    document: {
      id: "d",
      sha256: "s",
      file_name: "a.pdf",
      title: null,
      page_count: 1,
      kind: "upload",
      status: "queued",
      created_at: "2026-10-20T00:00:00Z",
      expires_at: null,
      stats: null,
      latest_job: null,
    },
    job: null,
  });

  beforeEach(() => {
    FakeXhr.sent = [];
    FakeXhr.answer = { status: 202, body: accepted };
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("asks the site for a token, then posts the PDF straight to the backend", async () => {
    const f = vi.fn(async () =>
      Response.json({ token: "t.o.k", url: "https://api.test/documents", expires_at: 1 }),
    );
    vi.stubGlobal("fetch", f);
    const result = await uploadPdf(pdf, () => {});
    expect(f).toHaveBeenCalledWith(
      "/api/upload-token",
      expect.objectContaining({ method: "POST" }),
    );
    expect(FakeXhr.sent).toHaveLength(1);
    expect(FakeXhr.sent[0]).toMatchObject({
      method: "POST",
      url: "https://api.test/documents",
      headers: { "x-platform-token": "t.o.k" },
    });
    expect(FakeXhr.sent[0]?.body).toBeInstanceOf(FormData);
    expect(result.ok).toBe(true);
  });

  it.each([
    ["a 503", async () => Response.json({ error: "proxy not configured" }, { status: 503 })],
    ["a malformed answer", async () => Response.json({ token: 1 })],
    [
      "a network error",
      async () => {
        throw new TypeError("down");
      },
    ],
  ])("posts nothing after %s", async (_name, answer) => {
    vi.stubGlobal("fetch", vi.fn(answer));
    const result = await uploadPdf(pdf, () => {});
    expect(FakeXhr.sent).toHaveLength(0);
    expect(result).toEqual({ ok: false, message: UPLOAD_NOT_AUTHORISED });
  });
});
