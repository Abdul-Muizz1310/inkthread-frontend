"use client";

import { Table2 } from "lucide-react";
import { useReading } from "@/features/data/hooks";

type Props = { docId: string; onSelect: (id: string) => void };

/** inkgrid's verdict and tables (backend spec 11); hidden while the document has no reading. */
export function ReadingMenu({ docId, onSelect }: Props) {
  const reading = useReading(docId);
  if (!reading.data) return null;
  const { verification: v, tables, inkgrid_version } = reading.data;
  const verdict = v.ok
    ? "verified"
    : `${v.disagreements} disagreement${v.disagreements === 1 ? "" : "s"}`;
  return (
    <details className="relative" data-testid="reading">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md border border-border px-2 py-0.5 font-mono text-[11px] text-fg-muted hover:text-foreground">
        <Table2 className="h-3 w-3" /> reading
      </summary>
      <div className="absolute right-0 z-30 mt-1 max-h-[70vh] w-[min(28rem,90vw)] space-y-2 overflow-y-auto rounded-md border border-border-bright bg-surface p-2 font-mono text-[11px] shadow-lg">
        <p data-testid="verification">
          <span style={{ color: v.ok ? "var(--tier-a)" : "var(--tier-c)" }}>{verdict}</span>
          <span className="text-fg-faint">
            {" "}
            · {v.checked} pages checked by {v.engine}
          </span>
        </p>
        <p className="text-fg-faint">
          inkgrid {inkgrid_version} · {tables.length} table{tables.length === 1 ? "" : "s"}
        </p>
        <ul className="space-y-1">
          {tables.map((t) => (
            <li
              key={t.id}
              data-testid="reading-table"
              className="rounded border border-border p-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-fg-muted">
                  p.{t.page} · {t.rows.length}×{t.rows[0]?.length ?? 0}
                </span>
                {t.node_id !== null && (
                  <button
                    type="button"
                    onClick={() => onSelect(t.node_id ?? "")}
                    className="ml-auto rounded px-1.5 text-accent-thread hover:bg-surface-hover"
                  >
                    select
                  </button>
                )}
              </div>
              <details>
                <summary className="cursor-pointer text-fg-faint">markdown</summary>
                <pre className="mt-1 overflow-x-auto whitespace-pre text-[10px] text-foreground">
                  {t.markdown}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
