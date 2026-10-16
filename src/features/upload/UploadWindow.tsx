"use client";

import { FileUp, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { cn } from "@/lib/utils";
import { uploadPdf, validateFile } from "./upload";

export function UploadWindow() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  async function send(file: File | undefined) {
    if (!file) return;
    setError(null);
    const bad = validateFile(file);
    if (bad) {
      setError(bad);
      return;
    }
    setName(file.name);
    setProgress(0);
    const res = await uploadPdf(file, setProgress);
    if (res.ok) {
      router.push(`/d/${res.data.document.id}`);
      return;
    }
    setProgress(null);
    setError(res.message);
  }

  return (
    <TerminalWindow
      title="upload.pdf"
      statusDot={progress !== null ? "thread" : "off"}
      statusLabel={progress !== null ? "sending" : undefined}
      strong
    >
      <label
        htmlFor="pdf-input"
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void send(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center transition-all",
          drag
            ? "border-accent-thread bg-accent-thread-soft shadow-[0_0_30px_rgb(232_121_249_/_0.18)]"
            : "border-border-bright hover:border-accent-thread/60",
        )}
        data-testid="dropzone"
      >
        <FileUp className="h-6 w-6 text-accent-thread" />
        <span className="font-mono text-sm text-foreground">
          {name && progress !== null ? name : "drop a PDF here, or choose one"}
        </span>
        <span className="font-mono text-[11px] text-fg-faint">
          born-digital PDF · up to 15 MB · up to 40 pages
        </span>
        <input
          ref={input}
          id="pdf-input"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => void send(e.target.files?.[0])}
        />
      </label>
      {progress !== null && (
        <div
          className="mt-4 h-1 overflow-hidden rounded bg-border"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-accent-thread transition-[width]"
            style={{ width: `${Math.max(4, progress * 100)}%` }}
          />
        </div>
      )}
      {error && (
        <p
          role="alert"
          data-testid="upload-error"
          className="mt-4 rounded-md border border-error/40 bg-error/10 px-3 py-2 font-mono text-xs text-error"
        >
          ⨯ {error}
        </p>
      )}
      <p className="mt-4 flex gap-2 font-mono text-[10.5px] leading-relaxed text-fg-faint">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        text you upload goes to free LLM providers through OpenRouter, which may log it. don&apos;t
        upload confidential documents. uploads are processed, not kept: the PDF is deleted once
        processed, the graph an hour later.
      </p>
    </TerminalWindow>
  );
}
