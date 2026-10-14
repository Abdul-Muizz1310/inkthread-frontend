/** One three.js geometry per node kind: shape is the secondary encoding the palette relies on. */
import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  SphereGeometry,
  TetrahedronGeometry,
  TorusGeometry,
} from "three";
import type { NodeKind } from "@/lib/contract/graph";

let cache: Record<NodeKind, BufferGeometry> | null = null;

export function geometryFor(kind: NodeKind): BufferGeometry {
  cache ??= {
    document: new SphereGeometry(1, 32, 24),
    section: new OctahedronGeometry(1, 0),
    paragraph: new SphereGeometry(1, 16, 12),
    list_item: new SphereGeometry(0.9, 12, 10),
    table: new BoxGeometry(1.5, 1.5, 1.5),
    note: new TetrahedronGeometry(1.2, 0),
    definition: new CylinderGeometry(0.9, 0.9, 1.4, 16),
    term: new IcosahedronGeometry(1.1, 0),
    external: new TorusGeometry(0.9, 0.32, 10, 24),
  };
  return cache[kind];
}
