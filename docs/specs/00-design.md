# inkthread frontend: design

The frontend is where the graph becomes visible. It has three jobs:
- take a PDF;
- show the pipeline building the graph, live;
- let a person walk the graph with the page always beside it, so every node and every relationship can
  be checked against the words that justify it.

The backend contract is `inkthread.graph/1` (backend spec 01) and the event stream (backend spec 07).
This repo mirrors both as Zod schemas in `src/lib/contract/`.

## 1. Look: the house style, one new idea

**From the portfolio** (paper-trail's tokens, slowquery's structure):
- dark only, the shared neutrals;
- Geist and Geist Mono;
- macOS-style terminal windows on a dot grid with a top glow and scanlines;
- lowercase copy with `$ > //` prompt lines;
- a sticky blurred nav and a status-bar footer.

**inkthread's accent** is fuchsia `#e879f9` (`--accent-thread`), used by no sibling. The supporting
accents are sky `#38bdf8` and soft violet `#a78bfa`, for glows only.

**The new idea: the page's own words are set in a serif.** Every verbatim string inkgrid read from
the PDF is set in Newsreader: node text, quotes, cell text. Everything the machine says is set in
Geist or Geist Mono: labels, makers, tiers, ids. A reader can tell at a glance what the document says
from what inkthread says about it.

## 2. Colour in the graph

Edges are coloured by **family** and nodes by the family they belong to. The palette was checked with
the dataviz validator on both the page (`#0a0a0a`) and panel (`#12121a`) surfaces, all pairs. Every
check passes. The worst CVD pair (green against yellow, ΔE 6.9) sits in the floor band, so a secondary
encoding is mandatory and supplied:
- **shape** for node kind;
- **line style** for basis: solid for explicit edges, translucent with particles for semantic ones;
- a **legend** that names every family.

| family | colour | edges | nodes |
|---|---|---|---|
| structure | neutral `#898781` (document `#f0efec`) | `contains`, `continues` | document, section, paragraph, list item, table |
| notes | yellow `#c98500` | `cites_note` | note |
| terms | green `#008300` | `defines`, `uses_term` | definition, term |
| references | blue `#3987e5` | `refers_to`, `cites_external` | external |
| logic | magenta `#d55181` | `governs`, `qualifies`, `overrides`, `illustrates` | — (logic lives on edges) |

**Selection is not a hue.** The selected node is white with a bloom halo, its neighbours keep their
colours, and everything else dims to 15%. **Tiers use the status palette** with their letter always
printed: A `#0ca30c`, B `#fab219`, C `#ec835a`, D `#d03b3b`. Text is never coloured by family; a
coloured swatch sits beside the text instead.

**Shapes** (3D mesh / 2D glyph):

| node | shape |
|---|---|
| document | large sphere |
| section | octahedron / diamond |
| paragraph | small sphere / circle |
| list item | small sphere / circle with a dot |
| table | box / square |
| note | tetrahedron / triangle |
| definition | cylinder / rounded square |
| term | icosahedron / hexagon |
| external | torus / ring |

Size grows with degree, clamped.

## 3. Pages

| route | what |
|---|---|
| `/` | landing: hero, upload, samples, how it works, guarantees |
| `/d/[id]` | the document: live build while the job runs, then the workspace |
| not-found, error | house-style terminal pages |

### 3.1 Landing

- **Hero, left:**
  - a prompt stack (`$ whoami` → `inkthread`, `// a document, as a graph of what depends on what`);
  - the headline "every part of a document, and the threads between them", with *threads* in the
    accent and a glowing underline;
  - one line of plain explanation;
  - the upload window.
- **Hero, right:** a `sample.graph` window holding a slowly turning 3D graph of a sample with bloom.
  Clicking it opens that sample.
- **Upload window** (`upload.pdf`):
  - a drop zone with a file picker;
  - the limits printed (PDF only, 15 MB, 40 pages);
  - the privacy note (free LLM providers may log text; uploads are processed, not kept: the PDF goes when
    its job ends, the graph and page images an hour later);
  - a progress bar during upload, with errors mapped from the API's codes;
  - success navigates to `/d/<id>`.
- **Samples:** one card per sample with title, pages, node and edge counts, and a tier bar.
- **How it works:** the seven stages as a row of steps. Each step is marked `rule` or `agent`, with one
  line on what it adds.
- **Guarantees:** verbatim, grounded, attributed, honest gaps. Each comes with one sentence and the
  backend test that checks it.
- **Footer:** the status bar, plus the source links that the AGPL notice requires.

### 3.2 Document: live build

While the job is queued or running:
- **Centre:** the 3D canvas grows as `delta` events arrive. New nodes scale in with a glow; new edges
  fire one particle along their length.
- **Top:** a stage stepper (read → structure → classify → link → relate → verify → finalize) with
  pending, running (pulse), done, skipped and failed states.
- **Right:** a `pipeline.log` terminal window, one line per event, for example:
  `[✓] read · 15 pages · 27.4s`
  `[~] classify_agent · nemotron-3-super · batch 1/2`
  `[–] verify_agent · skipped (budget)`
- **On `done`:** the full graph is fetched, and the view becomes the workspace without moving the
  camera.
- **On `failed`:** the error appears in the log with its code and a plain explanation.

A **replay build** button re-streams any finished document's event log into the canvas.

### 3.3 Document: workspace

Resizable panes. The left and right columns collapse to tabs below 1024 px wide.

| left rail | centre | right column |
|---|---|---|
| **outline**: the section tree, keyboard-navigable; **legend and filters**: families and edge types, roles, tiers, basis; **search** over labels and verbatim text | **graph**: 3D (default) or 2D, with a view toggle, focus depth (1 or 2 hops), "fit", and the selected node's label | **page**: the page image with the selected node's regions and its neighbours' regions drawn over it, the evidence words highlighted, and page navigation. **inspector**: below the page |

- **2D view.** A deterministic "document map". Sections form a tidy tree (left to right in reading
  order), parts hang under their section, terms sit in a column on the right and externals on the
  left. Cross-relations are drawn as curves. The positions are computed, so the same graph always
  draws the same picture.
- **Inspector:**
  - kind chip, tier badge and id (copyable);
  - role chips: solid for explicit, dashed for semantic; hover shows the cue's quote;
  - the verbatim text in serif, with each outgoing edge's evidence highlighted in its family colour
    (hover names the edge; click selects the target);
  - hidden spans struck through, with a warning;
  - for tables, the grid, where hovering a cell shows its header path and row labels;
  - relationships grouped by type, out then in. Each row shows the target's label, the evidence quote
    in serif, the maker (rule id, or model and request key) and the tier;
  - unresolved calls and references, with the reason;
  - flags;
  - the "why" log from `/why` as a terminal list;
  - **path to…**, which picks a second node by search and shows the shortest typed path between them
    as a chain of edges, each with its quote.
- **Exports:** a menu with JSON, JSON-LD, GraphML and Cypher.
- **Reading:** a menu beside the exports with what inkgrid read (backend spec 11): the second
  engine's verdict (verified, or how many disagreements, over how many pages, by which engine) and
  the document's tables, each with its page and size, a button that selects its node, and its
  Markdown. A document with no reading yet (`409`) shows no menu.

## 4. Behaviour

- **Data:**
  - TanStack Query holds the document, the job, the graph and the samples.
  - A zustand store holds selection, hover, filters, view mode, focus depth, search and the path ends.
  - The graph is indexed once into adjacency maps for neighbours and paths.
- **Events:** `EventSource` with named listeners. Reconnects back off from 0.5 s to 8 s with jitter.
  A terminal latch stops reconnecting after `done` or `failed`. On a manual reconnect, `?after=<last
  id>` resumes the stream.
- **Upload** goes through XHR, which can report upload progress (fetch cannot).
- **3D** is a client component loaded with `next/dynamic` and `ssr: false`, from a client wrapper.
  three.js colours are resolved from CSS variables at mount. The WebGL context is disposed on unmount.
- **Reduced motion:** no auto-rotation, no particles, instant camera moves, no scale-in, no cursor blink.
- **Accessibility:**
  - every graph action is also reachable from the outline, the search and the inspector;
  - the canvas has a label, and the outline is a tree with arrow-key navigation;
  - focus rings are visible, icon buttons carry `aria-label`, and contrast is at least 4.5:1 for text.

## 5. Stack

Next.js 16.2 (App Router) and React 19.2, TypeScript strict, Tailwind v4, Zod 4, TanStack Query 5,
zustand 5, react-force-graph-3d and react-force-graph-2d (three.js, bloom via UnrealBloomPass), d3-hierarchy
for the 2D layout, motion for UI transitions, react-resizable-panels, lucide-react, Biome, Vitest,
Testing Library, MSW, Playwright. pnpm 10, Node 24. Template: slowquery-dashboard-frontend's structure
(`features/`, typed API errors, CSP) with paper-trail's tokens.

## 6. Test cases

Unit (Vitest):
- T-FE-1 The contract schemas parse the backend's sample graph fixture and reject a graph with an
  unknown edge type.
- T-FE-2 The graph index returns neighbours by direction and type, and the shortest typed path between
  two nodes; a disconnected pair returns none.
- T-FE-3 Filters: hiding a family hides its edges and orphans no selected node; tier and role filters
  combine with AND.
- T-FE-4 The build reducer folds `stage`, `delta`, `llm`, `done` and `failed` into the live state;
  a duplicate event id is ignored; events after `done` are ignored.
- T-FE-5 Text segmentation turns overlapping spans (evidence, cues, hidden) into ordered, non-overlapping
  segments whose concatenation is the text.
- T-FE-6 Region scaling maps a PDF-point bbox to image pixels at any zoom.
- T-FE-7 The 2D layout gives every node a position, is identical across two runs, and keeps reading
  order left to right inside a section.
- T-FE-8 Upload validation refuses non-PDF types and oversized files before any request; each API error
  code maps to its message.
- T-FE-9 The API client throws typed errors: network, timeout, HTTP with the envelope's code, and parse.

End to end (Playwright, mocked backend via `page.route`; the browser runs WebGL on SwiftShader):
- T-FE-10 The landing renders its hero, upload window, samples and stages; the 3D canvas mounts.
- T-FE-11 Upload: choosing a PDF posts it, shows progress, and lands on `/d/<id>`; a 413 shows the
  size message; a 429 shows the retry time.
- T-FE-12 Live build: mocked events advance the stepper and the log; `done` loads the workspace.
- T-FE-13 Workspace: clicking a section in the outline selects it, and the inspector shows its verbatim
  text and relationships, and the page shows its region.
- T-FE-14 Clicking a relationship selects its target; "path to" shows a chain.
- T-FE-15 Turning off a family in the legend removes its edges from the legend count and the inspector
  list.
- T-FE-16 The 2D toggle switches views and keeps the selection.
- T-FE-17 Reduced motion: the landing graph does not auto-rotate.
- T-FE-18 The export menu links to the four export URLs.
- T-FE-19 An upload whose page images are gone (`410 upload_not_kept`) shows a note in the page pane
  instead of a broken image, and the graph, outline and inspector still work.
- T-FE-20 The reading contract parses the sample's `/reading` body and rejects one with another
  `schema` or a table without rows.
- T-FE-21 The reading menu shows the verification verdict and lists the tables; choosing a table
  selects its node; a document whose reading answers `409` shows no menu.
