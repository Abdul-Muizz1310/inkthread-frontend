"use client";

/** Client wrapper: loads the WebGL/canvas views lazily (never on the server) and sizes them. */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Graph } from "@/lib/contract/graph";
import type { VizLink, VizNode } from "./Graph3D";

const Graph3D = dynamic(() => import("./Graph3D"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center font-mono text-xs text-fg-faint">
      $ loading webgl…
    </div>
  ),
});
const Graph2D = dynamic(() => import("./Graph2D"), { ssr: false });

type Props = {
  view: "3d" | "2d";
  graph?: Graph;
  nodes: VizNode[];
  links: VizLink[];
  selected: string | null;
  highlight: ReadonlySet<string> | null;
  onSelect?: (id: string | null) => void;
  onHover?: (id: string | null) => void;
  autoRotate?: boolean;
  reducedMotion?: boolean;
  showLabels?: boolean;
};

export function GraphView({ view, graph, ...rest }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize({ width: el.clientWidth, height: el.clientHeight }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={box}
      className="relative h-full w-full overflow-hidden"
      role="img"
      aria-label="knowledge graph of the document; use the outline and inspector to navigate it by keyboard"
    >
      {size.width > 0 &&
        (view === "2d" && graph ? (
          <Graph2D graph={graph} width={size.width} height={size.height} {...rest} />
        ) : (
          <Graph3D width={size.width} height={size.height} {...rest} />
        ))}
    </div>
  );
}
