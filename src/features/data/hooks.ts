"use client";

import { useQuery } from "@tanstack/react-query";
import { apiUrl, getJson, withColdStartRetry } from "@/lib/api/client";
import { DocumentOut, PageGeometry, SamplesOut, WhyOut } from "@/lib/contract/api";
import { Graph } from "@/lib/contract/graph";

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["document", id],
    queryFn: () =>
      withColdStartRetry(() =>
        getJson(`/documents/${encodeURIComponent(id)}`, DocumentOut, { timeoutMs: 45_000 }),
      ),
    refetchInterval: (q) =>
      q.state.data && ["queued", "processing"].includes(q.state.data.status) ? 4000 : false,
  });
}

export function useGraph(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["graph", id],
    queryFn: () =>
      getJson(`/documents/${encodeURIComponent(id)}/graph`, Graph, { timeoutMs: 45_000 }),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSamples() {
  return useQuery({
    queryKey: ["samples"],
    queryFn: () => withColdStartRetry(() => getJson("/samples", SamplesOut, { timeoutMs: 45_000 })),
  });
}

export function useGeometry(id: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: ["geometry", id, page],
    queryFn: () =>
      getJson(`/documents/${encodeURIComponent(id)}/pages/${page}/geometry`, PageGeometry),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useWhy(id: string, element: string | null) {
  return useQuery({
    queryKey: ["why", id, element],
    queryFn: () =>
      getJson(
        `/documents/${encodeURIComponent(id)}/why/${encodeURIComponent(element ?? "")}`,
        WhyOut,
      ),
    enabled: element !== null,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function pageImageUrl(id: string, page: number): string {
  return apiUrl(`/documents/${encodeURIComponent(id)}/pages/${page}.png`);
}

export function exportUrl(id: string, format: "json" | "jsonld" | "graphml" | "cypher"): string {
  const path = format === "json" ? "graph" : `graph.${format}`;
  return apiUrl(`/documents/${encodeURIComponent(id)}/${path}`);
}
