"use client";

import { FAMILY_COLOR, TIER_COLOR } from "@/features/graph/palette";
import type { Graph } from "@/lib/contract/graph";
import { EDGE_TYPES, FAMILIES, FAMILY_OF, TIERS } from "@/lib/contract/graph";
import type { Filters } from "@/lib/graph/filters";
import { cn } from "@/lib/utils";

type Props = { graph: Graph; filters: Filters; onChange: (f: Filters) => void };

function toggle<T>(set: ReadonlySet<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

export function Legend({ graph, filters, onChange }: Props) {
  const counts = new Map<string, number>();
  for (const e of graph.edges) counts.set(e.family, (counts.get(e.family) ?? 0) + 1);
  return (
    <div className="space-y-3 font-mono text-[11px]" data-testid="legend">
      <div>
        <h4 className="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-fg-faint">threads</h4>
        <ul className="space-y-1">
          {FAMILIES.map((f) => {
            const on = filters.families.has(f);
            const types = EDGE_TYPES.filter((t) => FAMILY_OF[t] === f).map((t) =>
              t.replace("_", " "),
            );
            return (
              <li key={f}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ ...filters, families: toggle(filters.families, f) })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-surface-hover",
                    !on && "opacity-40",
                  )}
                  title={types.join(", ")}
                >
                  <span className="h-[3px] w-5 rounded" style={{ background: FAMILY_COLOR[f] }} />
                  <span className="text-foreground">{f}</span>
                  <span className="truncate text-[10px] text-fg-faint">{types.join(" · ")}</span>
                  <span className="ml-auto text-fg-faint" data-testid={`count-${f}`}>
                    {counts.get(f) ?? 0}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-[0.15em] text-fg-faint">tier</span>
        {TIERS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={filters.tiers.has(t)}
            onClick={() => onChange({ ...filters, tiers: toggle(filters.tiers, t) })}
            className={cn(
              "rounded px-1.5 font-bold text-black",
              !filters.tiers.has(t) && "opacity-30",
            )}
            style={{ background: TIER_COLOR[t] }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-[0.15em] text-fg-faint">made by</span>
        {(["explicit", "semantic"] as const).map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={filters.basis.has(b)}
            onClick={() => onChange({ ...filters, basis: toggle(filters.basis, b) })}
            className={cn(
              "rounded border border-border px-1.5",
              !filters.basis.has(b) && "opacity-40",
              b === "semantic" && "border-dashed",
            )}
          >
            {b === "explicit" ? "rules" : "agents"}
          </button>
        ))}
      </div>
    </div>
  );
}
