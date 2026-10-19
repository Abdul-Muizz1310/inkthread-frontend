# 🧵 `inkthread-frontend`

> 🕸️ **Watch a PDF become a knowledge graph — then walk it with the page beside you.**
> Every thread's evidence is highlighted in the page's own words.

🔗 [Backend](https://github.com/Abdul-Muizz1310/inkthread-backend) · 📖 [Why](WHY.md) · 🏗️ [Architecture](docs/ARCHITECTURE.md) · 📐 [Design](docs/specs/00-design.md)

![next](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![react](https://img.shields.io/badge/React-19.2-149eca?style=flat-square&logo=react&logoColor=white)
![three](https://img.shields.io/badge/three.js-0.184-black?style=flat-square&logo=three.js)
![ci](https://img.shields.io/github/actions/workflow/status/Abdul-Muizz1310/inkthread-frontend/ci.yml?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

```console
$ open /                         # drop a PDF, or open a sample
$ open /d/<id>                   # live: stages tick, the graph grows as agents add threads
                                 # ready: outline · 3D/2D graph · page with evidence · inspector
```

---

## ✨ Features

- 🌌 **3D graph** — three.js with bloom, a mesh shape per part kind, particles on model-made threads, fly-to on select
- 🗺️ **2D document map** — a deterministic tidy tree: the same graph always draws the same picture
- 📄 **Page beside the graph** — the selected part's region, its neighbours' regions, and the evidence words highlighted
- ✒️ **Verbatim in serif** — the page's own words in Newsreader; everything inkthread says in Geist Mono
- 🔎 **Inspector** — roles with their cues, threads grouped by type with quotes, makers and tiers, a "why" log
- 🧭 **Path to…** — the shortest typed path between two parts, each hop with its quote
- 📑 **Reading** — inkgrid's tables (with Markdown) and its second-engine verdict, one click from each table's node
- 📡 **Live build** — the pipeline's SSE events animate the graph and a `pipeline.log`; replay any finished build
- ♿ **Accessible** — keyboard outline and search, visible focus, reduced motion honoured everywhere

---

## 🧱 Stack

| Concern | Choice |
|---|---|
| App | Next.js 16.2 App Router, React 19.2, TypeScript strict |
| Graph | react-force-graph-3d / -2d, three.js UnrealBloomPass, d3-hierarchy |
| Data | TanStack Query, zustand, Zod 4 at every boundary |
| Style | Tailwind v4, the portfolio's dark terminal tokens, fuchsia thread accent |
| Quality | Biome, Vitest + Testing Library, Playwright |

---

## 🧪 Testing

| Metric | Value |
|---|---|
| Unit | Vitest: contract, client, graph index and paths, filters, 2D layout, build reducer, segments, upload |
| End to end | Playwright against a mocked API served from fixtures the real pipeline produced |

```bash
pnpm test          # unit
pnpm test:e2e      # builds, serves and drives Chromium
```

---

## 🎨 Colour

Edges are coloured by family and validated with a colour-blind-safety check on the dark surface (all
pairs): structure `#898781`, notes `#c98500`, terms `#008300`, references `#3987e5`, logic `#d55181`.
Shape and line style are the second channel. Tiers use the status palette with the letter printed.

---

## 📜 License

MIT — see [LICENSE](LICENSE).

---

> 🧵 *What the document says, set apart from what the machine says.*
