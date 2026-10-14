"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { NODE_COLOR } from "@/features/graph/palette";
import type { GraphNode } from "@/lib/contract/graph";
import type { GraphIndex } from "@/lib/graph/index";
import { cn } from "@/lib/utils";

type Props = { index: GraphIndex; selected: string | null; onSelect: (id: string) => void };

function Branch({
  node,
  index,
  depth,
  selected,
  onSelect,
}: { node: GraphNode; index: GraphIndex; depth: number } & Omit<Props, "index">) {
  const children = index.children(node.id);
  const sections = children.filter((c) => c.kind === "section");
  const [open, setOpen] = useState(depth < 2);
  return (
    <li>
      <div className="flex items-center">
        {sections.length > 0 ? (
          <button
            type="button"
            aria-label={open ? "collapse" : "expand"}
            onClick={() => setOpen(!open)}
            className="p-0.5 text-fg-faint hover:text-foreground"
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="w-4" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left font-mono text-[11px] transition-colors",
            selected === node.id
              ? "bg-accent-thread-soft text-accent-thread"
              : "text-fg-muted hover:bg-surface-hover hover:text-foreground",
          )}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rotate-45"
            style={{ background: NODE_COLOR[node.kind] }}
          />
          <span className="truncate">{node.label}</span>
          <span className="ml-auto shrink-0 text-[9px] text-fg-faint">
            {children.length - sections.length || ""}
          </span>
        </button>
      </div>
      {open && sections.length > 0 && (
        <ul className="ml-2.5 border-l border-border pl-1">
          {sections.map((s) => (
            <Branch
              key={s.id}
              node={s}
              index={index}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function Outline({ index, selected, onSelect }: Props) {
  const doc = index.graph.nodes.find((n) => n.kind === "document");
  if (!doc) return null;
  return (
    <ul aria-label="document outline" className="space-y-0.5" data-testid="outline">
      <Branch node={doc} index={index} depth={0} selected={selected} onSelect={onSelect} />
    </ul>
  );
}
