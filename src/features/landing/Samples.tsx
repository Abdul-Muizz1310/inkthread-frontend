"use client";

import Link from "next/link";
import { useSamples } from "@/features/data/hooks";
import { TIER_COLOR } from "@/features/graph/palette";

export function Samples() {
  const samples = useSamples();
  const items = samples.data?.items ?? [];
  if (samples.isLoading) return <p className="font-mono text-xs text-fg-faint">$ ls samples/ …</p>;
  if (items.length === 0)
    return (
      <p className="font-mono text-xs text-fg-faint">
        $ ls samples/ — the backend is waking up; refresh in a minute.
      </p>
    );
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="samples">
      {items.map((s) => {
        const tiers = s.stats?.tiers ?? {};
        const total = Object.values(tiers).reduce((a, b) => a + b, 0) || 1;
        return (
          <li key={s.id}>
            <Link
              href={`/d/${s.id}`}
              className="group block h-full rounded-xl border border-border bg-surface/50 p-5 transition-all hover:-translate-y-0.5 hover:border-border-bright hover:shadow-[0_0_30px_rgb(232_121_249_/_0.12)]"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-thread">
                {/* sample */}
              </div>
              <h3 className="verbatim mt-2 line-clamp-2 text-lg leading-snug text-foreground">
                {s.title?.replaceAll("\n", " ") ?? s.file_name}
              </h3>
              <div className="mt-3 font-mono text-[11px] text-fg-muted">
                {s.page_count} pages · {s.stats?.nodes ?? "—"} nodes · {s.stats?.edges ?? "—"}{" "}
                threads
              </div>
              <div
                className="mt-3 flex h-1.5 overflow-hidden rounded"
                role="img"
                aria-label="confidence tiers"
              >
                {(["A", "B", "C", "D"] as const).map((t) => (
                  <span
                    key={t}
                    style={{
                      width: `${(100 * (tiers[t] ?? 0)) / total}%`,
                      background: TIER_COLOR[t],
                    }}
                  />
                ))}
              </div>
              <div className="mt-4 font-mono text-xs text-fg-faint group-hover:text-accent-thread">
                $ open →
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
