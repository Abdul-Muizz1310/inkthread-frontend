import Link from "next/link";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";

export default function NotFound() {
  return (
    <PageFrame statusLeft="inkthread.dev ~/404">
      <TerminalWindow title="404.log" statusDot="red" className="mx-auto max-w-xl">
        <div className="space-y-2">
          <Prompt>cat document</Prompt>
          <Prompt kind="comment">no such document — it may have expired after seven days</Prompt>
          <Link href="/" className="inline-block pt-3 font-mono text-sm text-accent-thread">
            $ cd ~
          </Link>
        </div>
      </TerminalWindow>
    </PageFrame>
  );
}
