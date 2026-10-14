# inkthread frontend v1: implementation plan

> **For agentic workers:** use subagent-driven development or executing-plans to work through this
> plan task by task. Every task is Spec-TDD against `docs/specs/00-design.md` § 6.

**Goal:** a Next.js 16 app with three jobs:
- upload a PDF;
- watch inkthread's pipeline build its knowledge graph live;
- walk the graph in 3D and 2D, with the page and the evidence beside it.

**Architecture:**
- App Router with server components for shells and client islands for the canvas, the store and the
  stream.
- `src/features/{upload,build,graph,page,inspector,samples}`.
- `src/lib/{contract,api,graph,sse,env}`.

**Tech stack:** Next 16.2.12, React 19.2.4, TypeScript 5.9 strict, Tailwind v4, Zod 4, TanStack Query
5, zustand 5, react-force-graph-3d / -2d, three (UnrealBloomPass), d3-hierarchy, motion,
react-resizable-panels, lucide-react; Biome, Vitest 4 + Testing Library + MSW, Playwright. pnpm 10,
Node 24.

**Spec:** `docs/specs/00-design.md`; backend contract `inkthread-backend/docs/specs/01-graph-contract.md`
and `07-api-events.md`.

## Global constraints

- **Before writing any Next code,** read `node_modules/next/dist/docs/` for each API used.
  AGENTS.md says why.
- **Style:** paper-trail's tokens verbatim, plus `--accent-thread: #e879f9`.
  - Fonts: Geist, Geist Mono, Newsreader (verbatim text only).
  - The graph palette is spec § 2, exactly.
- **Typing:** no `any`. Every server response is parsed with Zod at the boundary.
- **Imports and formatting:** the `@/*` alias maps to `src/*`; named exports, except Next's page and
  layout defaults; line length 100.
- **Motion:** respect `prefers-reduced-motion` everywhere motion appears.
- **Coverage:** at least 80% on `src/lib` and `src/features` (lines and statements), at least 70%
  branches.
- **Commits:** Conventional Commits with **no Co-Authored-By trailer**.

## Review focus

1. **A graph of 1 node (document only).** Every view renders an empty state, not a crash. → Task 6,
   `empty graph renders`.
2. **A node whose text is 20,000 characters.** The inspector stays responsive (virtualised or
   clamped with expand). → Task 7, `long text clamps`.
3. **An SSE stream that drops mid-build.** The client resumes with `?after=` and the log shows no
   duplicates. → Task 4, `reconnect resumes`.
4. **The API down at first load.** A cold-start pill and a retry, never an unhandled error page. →
   Task 2, `cold start retry`.
5. **Labels with RTL or very long words.** No layout overflow in the inspector or the outline. →
   Task 7, `overflow wraps`.

---

### Task 1: Scaffold and house style
- **Files:** `package.json` (pinned versions), `pnpm-workspace.yaml`, `biome.json`, `tsconfig.json`,
  `next.config.ts` (CSP with `worker-src 'self' blob:`, `img-src` covering the API origin),
  `postcss.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `AGENTS.md`, `CLAUDE.md`,
  `src/app/{layout,globals.css,not-found,error}.tsx`,
  `src/components/terminal/{AppNav,PageFrame,Prompt,StatusBar,TerminalWindow}.tsx`,
  `src/lib/{env,utils}.ts`.
- Done when `pnpm build`, `pnpm lint` and `pnpm test` pass on the empty shell.

### Task 2: Contract and API client
- `src/lib/contract/*.ts`: Zod mirrors of `inkthread.graph/1`, `DocumentOut`, `JobOut`, the error
  envelope and the event payloads.
- `src/lib/api/client.ts`: typed errors (network, timeout, http with code, parse); a cold-start retry.
- **Tests:** T-FE-1, T-FE-9 and `cold start retry`. The fixture `tests/fixtures/graph.uspto.json` is
  copied from the backend sample.

### Task 3: Graph index, filters, paths
- `src/lib/graph/{index,filters,path}.ts`. **Tests:** T-FE-2, T-FE-3.

### Task 4: Build state and the event stream
- `src/features/build/{reducer,useJobStream}.ts`. **Tests:** T-FE-4 and `reconnect resumes`.

### Task 5: Text segments and page geometry
- `src/lib/text/segments.ts`, `src/features/page/scale.ts`. **Tests:** T-FE-5, T-FE-6.

### Task 6: Graph views
- `src/features/graph/{GraphView,Graph3D,Graph2D,layout2d,shapes,palette}.ts(x)`; 3D loaded through
  `next/dynamic` with `ssr: false` inside a client wrapper.
- **Tests:** T-FE-7 and `empty graph renders`.

### Task 7: Inspector and page pane
- `src/features/inspector/*`, `src/features/page/*`. **Tests:** `long text clamps`, `overflow wraps`.

### Task 8: Landing and upload
- `src/app/page.tsx`, `src/features/upload/*`, `src/features/samples/*`, the hero graph.
  **Tests:** T-FE-8, T-FE-10, T-FE-11.

### Task 9: Document page
- `src/app/d/[id]/page.tsx`, the live build, the workspace layout, the export menu, path-to.
  **Tests:** T-FE-12 to T-FE-18.

### Task 10: Ship
- README in house style, `WHY.md`, `docs/ARCHITECTURE.md`, `docs/DEMO.md`, CI (lint, typecheck,
  test, build, e2e mocked, smoke), Vercel project with `NEXT_PUBLIC_API_URL`.
- Check every flow visually with Playwright screenshots before calling it done.
