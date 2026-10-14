import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { HeroGraph } from "@/features/landing/HeroGraph";
import { Samples } from "@/features/landing/Samples";
import { UploadWindow } from "@/features/upload/UploadWindow";

const STAGES = [
  [
    "read",
    "rule",
    "inkgrid reads the text layer: every word, block and table cell, verified by a second PDF engine",
  ],
  [
    "structure",
    "rule",
    "headings become a section tree; furniture and the table of contents are set aside",
  ],
  [
    "classify",
    "rule",
    "each part gets roles from the words that say so: obligation, condition, exception, definition…",
  ],
  ["classify · agent", "agent", "a free model types what the rules left untyped, quoting the page"],
  [
    "link",
    "rule",
    "terms, footnotes, section and table references, citations, precedence and lead-ins become threads",
  ],
  [
    "relate · agent",
    "agent",
    "a model links conditions and examples to what they qualify, quoting the page",
  ],
  ["verify · agent", "agent", "a different model judges every model-made claim"],
] as const;

const GUARANTEES = [
  ["verbatim", "every node's text is the page's own words; no model writes text into the graph"],
  [
    "grounded",
    "every thread carries the exact span that licenses it, and every node maps to its page region",
  ],
  [
    "attributed",
    "every node, role and thread names the rule or model that made it, in a hash-chained log",
  ],
  [
    "honest gaps",
    "a footnote with no note or a reference with no target is flagged on its part, never dropped",
  ],
] as const;

export default function Home() {
  return (
    <PageFrame
      active="home"
      statusLeft="inkthread.dev ~/"
      statusRight="UTF-8 · verbatim · grounded"
    >
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Prompt>whoami</Prompt>
            <Prompt kind="output">inkthread</Prompt>
            <Prompt kind="comment">a document, as a graph of what depends on what</Prompt>
          </div>
          <h1 className="font-mono text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl lg:text-[3.1rem]">
            every part of a document, and the <span className="thread-underline">threads</span>{" "}
            between them
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
            Upload a PDF. inkthread reads it with inkgrid, then rules and agents thread each part to
            what it defines, cites, governs and overrides. Every thread is grounded in the
            page&apos;s own words, set here in a serif.
          </p>
          <UploadWindow />
        </div>
        <HeroGraph />
      </section>

      <section className="mt-20 space-y-5">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-thread">
          {/* try a sample */}
        </h2>
        <Samples />
      </section>

      <section className="mt-20 space-y-5">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-thread">
          {/* how it threads a document */}
        </h2>
        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-4" data-testid="stages">
          {STAGES.map(([name, by, what], i) => (
            <li key={name} className="rounded-xl border border-border bg-surface/50 p-4">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-fg-faint">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-foreground">{name}</span>
                <span
                  className={
                    by === "agent"
                      ? "ml-auto rounded-full border border-dashed border-accent-thread/60 px-1.5 text-[9px] text-accent-thread"
                      : "ml-auto rounded-full border border-border-bright px-1.5 text-[9px] text-fg-muted"
                  }
                >
                  {by}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{what}</p>
            </li>
          ))}
          <li className="rounded-xl border border-accent-thread/30 bg-accent-thread-soft p-4">
            <div className="font-mono text-[11px] text-accent-thread">08 finalize</div>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
              tiers from the evidence, an explain gate over the op log, and a content hash so the
              same PDF always gives the same graph
            </p>
          </li>
        </ol>
      </section>

      <section className="mt-20 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {GUARANTEES.map(([name, what]) => (
          <div key={name} className="rounded-xl border border-border bg-surface/50 p-5">
            <div className="font-mono text-xs text-accent-thread">✓ {name}</div>
            <p className="verbatim mt-2 text-[0.95rem] text-fg-muted">{what}</p>
          </div>
        ))}
      </section>
    </PageFrame>
  );
}
