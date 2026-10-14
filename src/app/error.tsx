"use client";

import { useEffect } from "react";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("inkthread error", error.digest);
  }, [error]);
  return (
    <PageFrame statusLeft="inkthread.dev ~/error">
      <TerminalWindow title="error.log" statusDot="red" className="mx-auto max-w-xl">
        <div className="space-y-2">
          <Prompt kind="comment">something broke while rendering this page</Prompt>
          <button
            type="button"
            onClick={reset}
            className="pt-3 font-mono text-sm text-accent-thread"
          >
            $ retry
          </button>
        </div>
      </TerminalWindow>
    </PageFrame>
  );
}
