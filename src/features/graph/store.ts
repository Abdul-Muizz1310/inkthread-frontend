/** Workspace UI state: selection, hover, filters, view, path ends. */
import { create } from "zustand";
import { defaultFilters, type Filters } from "@/lib/graph/filters";

export type View = "3d" | "2d";

type WorkspaceState = {
  selected: string | null;
  hovered: string | null;
  view: View;
  filters: Filters;
  pathFrom: string | null;
  pathTo: string | null;
  page: number;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setView: (v: View) => void;
  setFilters: (f: Filters) => void;
  setPath: (from: string | null, to: string | null) => void;
  setPage: (p: number) => void;
  reset: () => void;
};

export const useWorkspace = create<WorkspaceState>((set) => ({
  selected: null,
  hovered: null,
  view: "3d",
  filters: defaultFilters(),
  pathFrom: null,
  pathTo: null,
  page: 1,
  select: (selected) => set({ selected }),
  hover: (hovered) => set({ hovered }),
  setView: (view) => set({ view }),
  setFilters: (filters) => set({ filters }),
  setPath: (pathFrom, pathTo) => set({ pathFrom, pathTo }),
  setPage: (page) => set({ page }),
  reset: () =>
    set({ selected: null, hovered: null, filters: defaultFilters(), pathFrom: null, pathTo: null, page: 1 }),
}));

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
