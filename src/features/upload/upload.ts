/** Client-side upload checks and the XHR upload (fetch cannot report upload progress). */
import { apiUrl } from "@/lib/api/client";
import { ErrorEnvelope, UploadOut } from "@/lib/contract/api";

export const MAX_BYTES = 15 * 1024 * 1024;
export const MAX_PAGES = 40;

export function validateFile(f: File): string | null {
  const pdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
  if (!pdf) return "inkthread reads PDFs only.";
  if (f.size === 0) return "That file is empty.";
  if (f.size > MAX_BYTES) return "That PDF is over the 15 MB limit.";
  return null;
}

export function messageFor(code: string, retryAfter: string | null): string {
  switch (code) {
    case "file_too_large":
      return "That PDF is over the 15 MB limit.";
    case "not_a_pdf":
      return "That file is not a PDF.";
    case "empty_file":
      return "That file is empty.";
    case "pdf_encrypted":
      return "That PDF is password-protected; inkthread cannot read it.";
    case "too_many_pages":
      return `That PDF has more than ${MAX_PAGES} pages, the limit for live uploads.`;
    case "pdf_unreadable":
      return "That PDF could not be opened.";
    case "rate_limited": {
      const s = Number(retryAfter);
      return Number.isFinite(s) && s > 0
        ? `Upload limit reached; try again in ${Math.ceil(s / 60)} min.`
        : "Upload limit reached; try again later.";
    }
    case "queue_full":
      return "The queue is full right now; try again in a few minutes.";
    default:
      return "Something unexpected went wrong; try again.";
  }
}

export type UploadResult = { ok: true; data: UploadOut } | { ok: false; message: string };

export function uploadPdf(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl("/documents"));
    xhr.timeout = 120_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        const parsed = UploadOut.safeParse(body);
        resolve(
          parsed.success
            ? { ok: true, data: parsed.data }
            : { ok: false, message: messageFor("parse", null) },
        );
        return;
      }
      const env = ErrorEnvelope.safeParse(body);
      resolve({
        ok: false,
        message: messageFor(
          env.success ? env.data.error : "http",
          xhr.getResponseHeader("Retry-After"),
        ),
      });
    };
    xhr.onerror = () =>
      resolve({
        ok: false,
        message: "The backend did not answer; it may be waking up. Try again in a minute.",
      });
    xhr.ontimeout = xhr.onerror;
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
