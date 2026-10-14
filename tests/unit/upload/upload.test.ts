import { describe, expect, it } from "vitest";
import { MAX_BYTES, messageFor, validateFile } from "@/features/upload/upload";

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
