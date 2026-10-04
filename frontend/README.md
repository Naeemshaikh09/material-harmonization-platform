# National Material Identity Platform — Frontend (developer3)

React + TypeScript + Vite + Tailwind. All screens run on the mock API first; the
real backend swaps in with one environment variable and **zero layout changes**.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | dev server (host 0.0.0.0, port 5173) |
| `npm run build` | type-check + production build |
| `npm run preview` | serve the production build |

## Mock → real API swap (Phase 5)

`.env`:

```
VITE_API_MODE=mock          # default: rich in-memory demo data
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Set `VITE_API_MODE=live` and every call in `src/lib/api.ts` goes to the FastAPI
backend with the exact contracts §2 shapes. Components never touch transport.

## Screens (detailed_plan §4)

1. **CPSE Portal** (`/portal`) — Search-Before-Create hero with the three
   outcomes (EXISTING / NEEDS_INFO / NO_MATCH), Upload (dropzone → column
   mapping → live progress + counts), My items + crosswalk CSV export.
2. **Steward Workbench** (`/workbench`) — queue with filters, attribute
   comparison grid (critical rows marked, CONFLICT tinted), Correct editor that
   re-runs the decision, Approve disabled while a critical CONFLICT remains
   (409 is shown as a toast), keyboard: `J/K` navigate · `A` approve · `C`
   correct · `R` reject.
3. **Golden Record Explorer** (`/golden`, `/golden/:code`) — 20-dimension table
   (NA = "—", UNKNOWN = amber), relationship tree, supersession banner, audit
   timeline, procurement panel with synthetic badge + visible formula.
4. **Dashboard** (`/dashboard`) — stat cards with sparklines, category/coverage
   charts (hand-drawn SVG, zero chart deps), procurement tab, model metrics tab
   (baseline vs model, sample sizes stated).
5. **Admin** (`/admin`) — versioned reference data with diff modal, migration
   stepper Extract → Dry run → Review → Publish → Verify (+ rollback with
   confirmation), audit chain viewer with **Verify chain** and a demo
   tamper-simulation switch, users & CPSE scoping.

Login offers one-click demo accounts for all five roles. The topbar demo chip
switches roles instantly (demo affordance only — remove before production).

## Design system

- **Warm paper + ink** light theme; no blue/purple. Semantic colour is reserved
  for data meaning: green MATCH/KNOWN · red CONFLICT · amber UNKNOWN · grey NA.
- Codes are monospace, hyphen-grouped, with copy buttons.
- Confidence is always a small bar next to the value it describes.
- The four-square brand mark is the four attribute states — identity, not decor.

## Structure

```
src/
  lib/         types.ts (contract types) · api.ts (mock ⇄ live) · format.ts
  mocks/       fixtures.ts — realistic valve/pipe/bearing demo data
  state/       AuthContext (roles) · ToastContext (error toasts)
  components/  ui/ (Button, CodeDisplay, AttributeBadge, DataTable, Stepper…)
               domain/ (ComparisonGrid, RelationshipTree, audit, charts)
               layout/ (AppShell — sidebar + topbar, responsive)
  pages/       Login · Portal · Workbench · Golden · GoldenDetail · Dashboard · Admin
```

## Rules honored

- All state colours follow README §4 exactly.
- Approve refuses critical CONFLICT (mock mirrors the backend 409).
- NA never equals UNKNOWN anywhere in decision copy.
- Procurement numbers carry a **synthetic** badge and a visible formula.
- Responsive down to laptop and mobile (drawer nav, stacking panes, scrollable tables).

_Branch: `dev3/frontend/platform-ui` · PR reviewers: developer1 + (developer2 or 4)_
