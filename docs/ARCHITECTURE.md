# Architecture

```mermaid
flowchart LR
  L["/ landing"] --> U[UploadWindow: XHR + progress] --> D["/d/[id]"]
  D --> DS[DocumentScreen]
  DS -->|queued, processing| LB[LiveBuild: useJobStream → reducer → Graph3D]
  DS -->|ready| WS[Workspace]
  WS --> O[Outline] & LG[Legend: filters] & GV[GraphView: Graph3D / Graph2D] & PV[PageView: PNG + SVG overlay] & IN[Inspector: verbatim + evidence + why]
  subgraph lib
    C[contract: Zod mirrors] --- A[api client: typed errors] --- I[graph index, filters, path] --- S[text segments]
  end
```

- Every server payload is parsed with Zod at the boundary (`src/lib/contract`).
- The graph is indexed once into adjacency maps; filters, neighbours and the shortest typed path read
  from it.
- WebGL and canvas views load only on the client (`next/dynamic`, `ssr: false`, inside a client wrapper).
- The live build folds named SSE events into state with a pure reducer; a terminal latch stops
  reconnects after `done` or `failed`, and `?after=` resumes a dropped stream.
