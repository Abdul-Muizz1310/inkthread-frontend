"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { LiveBuild } from "@/features/build/LiveBuild";
import { useJobStream } from "@/features/build/useJobStream";
import { useDocument, useGraph } from "@/features/data/hooks";
import { useWorkspace } from "@/features/graph/store";
import { HttpError } from "@/lib/api/errors";
import { Workspace } from "./Workspace";

export function DocumentScreen({ id }: { id: string }) {
  const doc = useDocument(id);
  const qc = useQueryClient();
  const [replay, setReplay] = useState(false);
  const reset = useWorkspace((s) => s.reset);
  useEffect(() => reset(), [reset]);
  const building = doc.data ? ["queued", "processing"].includes(doc.data.status) : false;
  const jobId = (building || replay) && doc.data?.latest_job ? doc.data.latest_job.id : null;
  const stream = useJobStream(jobId);
  const ready = doc.data?.status === "ready";
  const graph = useGraph(id, ready && !replay);

  useEffect(() => {
    if (stream.status === "done" && building)
      void qc.invalidateQueries({ queryKey: ["document", id] });
  }, [stream.status, building, qc, id]);

  if (doc.isError) {
    const missing = doc.error instanceof HttpError && doc.error.status === 404;
    return (
      <TerminalWindow
        title={missing ? "404.log" : "error.log"}
        statusDot="red"
        className="mx-auto mt-10 max-w-xl"
      >
        <Prompt>open {id.slice(0, 8)}</Prompt>
        <Prompt kind="comment">
          {missing
            ? "no such document — uploads expire after seven days"
            : "the backend did not answer; it may be waking up"}
        </Prompt>
        <Link href="/" className="mt-3 inline-block font-mono text-sm text-accent-thread">
          $ cd ~
        </Link>
      </TerminalWindow>
    );
  }
  if (!doc.data)
    return <div className="p-10 font-mono text-xs text-fg-faint">$ waking the backend…</div>;
  const title = doc.data.title ?? doc.data.file_name ?? "document";
  if (doc.data.status === "failed" && !replay) {
    const err = doc.data.latest_job?.error;
    return (
      <TerminalWindow title="pipeline.log" statusDot="red" className="mx-auto mt-10 max-w-xl">
        <Prompt>inkthread run {doc.data.file_name ?? ""}</Prompt>
        <Prompt kind="comment">
          {err ? `${err.code}: ${err.message}` : "the pipeline failed"}
        </Prompt>
      </TerminalWindow>
    );
  }
  if (building || replay) {
    return (
      <div>
        <LiveBuild state={stream} title={title} />
        {replay && stream.status !== "building" && (
          <button
            type="button"
            onClick={() => setReplay(false)}
            className="fixed bottom-12 right-6 rounded-md border border-accent-thread/60 bg-surface px-3 py-1.5 font-mono text-xs text-accent-thread"
          >
            $ open the graph
          </button>
        )}
      </div>
    );
  }
  if (!graph.data)
    return <div className="p-10 font-mono text-xs text-fg-faint">$ loading the graph…</div>;
  return (
    <Workspace
      docId={id}
      graph={graph.data}
      onReplay={doc.data.latest_job ? () => setReplay(true) : undefined}
    />
  );
}
