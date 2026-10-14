"use client";

/**
 * The cinematic view: a three.js force graph with bloom. One mesh shape per node kind, edges
 * coloured by family, semantic edges carry particles, the selection glows white and everything
 * outside its neighbourhood dims. Loaded only on the client (see GraphView).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import { Mesh, MeshBasicMaterial, MeshLambertMaterial, type Object3D, Vector2 } from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import SpriteText from "three-spritetext";
import type { EdgeType, NodeKind } from "@/lib/contract/graph";
import { edgeColor, NODE_COLOR, nodeSize, SELECTED } from "./palette";
import { geometryFor } from "./shapes";

export type VizNode = {
  id: string;
  kind: NodeKind;
  label: string;
  degree: number;
  fresh?: boolean;
};
export type VizLink = {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  basis: "explicit" | "semantic";
};

type Props = {
  nodes: VizNode[];
  links: VizLink[];
  selected: string | null;
  highlight: ReadonlySet<string> | null;
  onSelect?: (id: string | null) => void;
  onHover?: (id: string | null) => void;
  autoRotate?: boolean;
  reducedMotion?: boolean;
  showLabels?: boolean;
  width?: number;
  height?: number;
  cinematic?: boolean;
};

type N = VizNode & { x?: number; y?: number; z?: number };
type L = VizLink;

const materials = new Map<string, MeshLambertMaterial | MeshBasicMaterial>();
function material(
  color: string,
  state: "normal" | "dim" | "selected",
): MeshLambertMaterial | MeshBasicMaterial {
  const key = `${color}:${state}`;
  let m = materials.get(key);
  if (!m) {
    m =
      state === "selected"
        ? new MeshBasicMaterial({ color })
        : new MeshLambertMaterial({
            color,
            emissive: color,
            emissiveIntensity: state === "dim" ? 0.05 : 0.45,
            transparent: true,
            opacity: state === "dim" ? 0.12 : 0.95,
          });
    materials.set(key, m);
  }
  return m;
}

export default function Graph3D({
  nodes,
  links,
  selected,
  highlight,
  onSelect,
  onHover,
  autoRotate = false,
  reducedMotion = false,
  showLabels = true,
  width,
  height,
  cinematic = true,
}: Props) {
  const ref = useRef<ForceGraphMethods<N, L> | undefined>(undefined);
  const [ready, setReady] = useState(false);
  // react-force-graph mutates node objects; keep stable copies so positions survive re-renders.
  const store = useRef(new Map<string, N>());
  const data = useMemo(() => {
    const keep = new Map<string, N>();
    const ns = nodes.map((n) => {
      const prev = store.current.get(n.id);
      const next = prev ? Object.assign(prev, n) : { ...n };
      keep.set(n.id, next);
      return next;
    });
    store.current = keep;
    return { nodes: ns, links: links.map((l) => ({ ...l })) };
  }, [nodes, links]);

  // Bloom once the renderer exists.
  useEffect(() => {
    const fg = ref.current;
    if (!fg || !cinematic) return;
    const bloom = new UnrealBloomPass(new Vector2(256, 256), 1.25, 0.6, 0.12);
    fg.postProcessingComposer().addPass(bloom);
    setReady(true);
    return () => {
      fg.postProcessingComposer().removePass(bloom);
    };
  }, [cinematic]);

  // Gentle auto-rotation for the hero (never under reduced motion).
  useEffect(() => {
    const fg = ref.current;
    if (!fg || !autoRotate || reducedMotion) return;
    const controls = fg.controls() as { autoRotate?: boolean; autoRotateSpeed?: number };
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    return () => {
      controls.autoRotate = false;
    };
  }, [autoRotate, reducedMotion]);

  // Fly to the selection.
  useEffect(() => {
    const fg = ref.current;
    if (!fg || !selected) return;
    const n = store.current.get(selected);
    if (!n || n.x === undefined || n.y === undefined || n.z === undefined) return;
    const dist = 90;
    const ratio = 1 + dist / Math.max(1, Math.hypot(n.x, n.y, n.z));
    fg.cameraPosition(
      { x: n.x * ratio, y: n.y * ratio, z: n.z * ratio },
      { x: n.x, y: n.y, z: n.z },
      reducedMotion ? 0 : 1200,
    );
  }, [selected, reducedMotion]);

  const objectFor = (n: N): Object3D => {
    const state =
      n.id === selected ? "selected" : highlight && !highlight.has(n.id) ? "dim" : "normal";
    const color = state === "selected" ? SELECTED : NODE_COLOR[n.kind];
    const mesh = new Mesh(geometryFor(n.kind), material(color, state));
    const s = nodeSize(n.kind, n.degree);
    mesh.scale.set(s, s, s);
    const labelled =
      showLabels && (n.kind === "document" || n.kind === "section" || n.id === selected);
    if (labelled && state !== "dim") {
      const text = n.label.length > 42 ? `${n.label.slice(0, 40)}…` : n.label;
      const sprite = new SpriteText(
        text,
        n.kind === "document" ? 3.2 : 2.2,
        state === "selected" ? "#ffffff" : "#d9d7cf",
      );
      sprite.fontFace = "Geist Mono, ui-monospace, monospace";
      sprite.position.y = -s * 1.6 - 2;
      sprite.scale.multiplyScalar(1 / s);
      mesh.add(sprite);
    }
    return mesh;
  };

  const dimLink = (l: L) => {
    if (!highlight) return false;
    const s = typeof l.source === "object" ? (l.source as N).id : l.source;
    const t = typeof l.target === "object" ? (l.target as N).id : l.target;
    return !(highlight.has(s) && highlight.has(t));
  };

  return (
    <div data-testid="graph-3d" data-ready={ready} className="h-full w-full">
      <ForceGraph3D<N, L>
        ref={ref}
        width={width}
        height={height}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        showNavInfo={false}
        nodeId="id"
        nodeLabel={(n) => `${n.kind}: ${n.label}`}
        nodeThreeObject={objectFor}
        linkColor={(l) => (dimLink(l) ? "rgba(80,80,90,0.15)" : edgeColor(l.type))}
        linkOpacity={0.55}
        linkWidth={(l) => (l.type === "contains" ? 0.25 : l.basis === "semantic" ? 0.6 : 0.9)}
        linkDirectionalParticles={(l) =>
          reducedMotion || dimLink(l)
            ? 0
            : l.basis === "semantic"
              ? 2
              : l.type === "contains"
                ? 0
                : 1
        }
        linkDirectionalParticleWidth={1.6}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleColor={(l) => edgeColor(l.type)}
        cooldownTicks={reducedMotion ? 60 : 160}
        warmupTicks={reducedMotion ? 120 : 30}
        enableNodeDrag={false}
        onNodeClick={(n) => onSelect?.(n.id)}
        onNodeHover={(n) => onHover?.(n ? n.id : null)}
        onBackgroundClick={() => onSelect?.(null)}
        onEngineStop={() => {
          if (!selected) ref.current?.zoomToFit(reducedMotion ? 0 : 900, 40);
        }}
      />
    </div>
  );
}
