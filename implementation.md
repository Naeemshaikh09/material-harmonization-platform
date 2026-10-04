# SIH 26099 — Implementation Plan (4 People)

Prototype of the National Material Identity Platform. Timeline is in phases; map them to developer1r real deadline.

## 1. Role split

| Person | Strength / constraint | Role | Owns |
| --- | --- | --- | --- |
| **developer1** | Strong laptop | **Tech lead + backend core** | Repo, DB, pipeline orchestration, canonicalizer, matching engine, CMC service, APIs, integration |
| **developer2** | Strong laptop | **AI/ML lead** | SLM fine-tuning, training data pipeline, extraction service, evaluation |
| **developer3** | Frontend expert | **UI lead** | All 4 screens, API client, demo polish |
| **developer4** | Lighter laptop | **Data, rules and governance lead** | Terminology dictionary, class templates, code tables, labelled sets, synthetic data, audit chain, procurement module, docs/testing |

**Why this split:** the two heavy jobs (model training, database plus matching) go to strong laptops. developer4's work is mostly text, data and light Python, so no GPU is needed. If anything heavy is required, use a free cloud notebook (e.g. Colab) or borrow developer2's machine. developer4's data work is the most important input to quality: engineers' rules decide identity.

**Rules of collaboration**

- One Git repo, branches per person, pull requests reviewed by the lead.
- **Contracts first (Phase 0):** agree JSON schemas and API shapes before anyone codes. Everyone mocks the others until real parts land.
- Daily 15-minute sync; shared task board.

## 2. Scope

- **Categories:** valves (full), pipes, bearings. Add fasteners/cables only if time remains.
- **Build:** ingest, clean, extract, canonicalize, lookup, fallback match, review, CMC and crosswalk, search-before-create, migration dry run, audit chain, procurement view (synthetic), metrics.
- **Mock:** live SAP/Oracle connection, multilingual models.

## 3. Repository ladeveloper1t

```
repo/
  contracts/        # JSON schemas, OpenAPI (Phase 0, shared)
  backend/
    app/api/        # routes
    app/pipeline/   # ingest, clean, canonicalize, decide
    app/matching/   # lookup, fallback, comparator
    app/codes/      # CMC service, check digit
    app/audit/      # hash chain
    app/procurement/
    app/db/         # models, migrations
    tests/
  ml/
    data/ train/ eval/ service/   # extraction service
  data/
    dictionaries/ templates/ code_tables/ labelled/ synthetic/
  frontend/
  docs/
  docker-compose.yml
```

## 4. Phase 0 — Contracts and setup (everyone, first)

Deliverables, with owner:

1. **Canonical record schema** (`contracts/canonical.json`): `class`, `subclass`, the 20 dimensions (value, unit, confidence, state = KNOWN/UNKNOWN/NA), `raw_text`, `cpse_id`, `cpse_code`. *Owner: developer1 + developer4.*
2. **Class template schema** (`contracts/template.json`): per class, applicable dimensions, critical dimensions, allowed values, units, description templates. *Owner: developer4.*
3. **Extraction API:** `POST /extract {text, cpse_id}` returns canonical record candidate. *Owner: developer2.*
4. **Backend OpenAPI** (list in Section 6). *Owner: developer1.*
5. **Tools:** Python 3.11, FastAPI, PostgreSQL (Docker), Node 20, React + TypeScript + Vite + Tailwind. Same lockfiles for everyone. *Owner: developer1.*
6. **Mock servers:** developer3 uses a static mock of the backend; developer1 use a stub extractor (Section 5.1) until developer2's model lands.

Done when: contracts merged, `docker compose up` runs the database for all four, mocks exist.

## 5. Component-by-component

### 5.1 Data and rules (developer4)

Parts in build order:

- **Terminology dictionary** (`dictionaries/`): abbreviation to term (VLV, FLGD, SS), unit synonyms (", IN, INCH, MM, NB, DN), rating forms (150#, CL150, 150 LB), material aliases (SS316, S.S. 316, A351 CF8M where equivalence is certain). Versioned file, loaded by the cleaner. Source: standard engineering references, public CPSE tender text, developer1r own examples.
- **Class templates** (`templates/valve.json`, `pipe.json`, `bearing.json`): applicable and critical dimensions per class, validated with a mechanical or process engineer (a faculty member or an industry contact). Without this review, treat the templates as unvalidated and say so.
- **Code tables** (`code_tables/`): numeric codes for class, subclass, size, material, pressure. Never reuse a value; retire and add.
- **Description templates:** per class, fixed attribute order and wording, short and long versions.
- **Labelled data** (`labelled/`): (a) extraction set — description plus correct attributes, aim 300+ per category; (b) pair set — same/equivalent/different including hard negatives, aim 300+ pairs. Split by item into train/dev/test **before** anyone touches it.
- **Synthetic generator** (`synthetic/gen.py`): takes clean canonical records and produces messy variants (abbreviation swaps, unit changes, reordering, typos). Produces training data for developer2 and fake multi-CPSE catalogs for the demo.
- **Procurement synthetic data:** per CPSE code: annual quantity, price history, stock. Labelled "synthetic".
- **Audit chain** (Section 5.6) and **procurement analytics** (Section 5.7). Done when: templates and code tables load cleanly through a validator script; labelled sets frozen.

### 5.2 Extraction service (developer2)

1. **Baseline extractor (first, in 2–3 days):** regex plus dictionary rules producing the canonical record. This keeps the pipeline unblocked and becomes developer1r comparison baseline.
2. **Training data:** developer4's synthetic variants plus labelled train set, converted to input text to output JSON.
3. **Model:** fine-tune a small open model (a small instruction model with LoRA, or a token-classification encoder) to output attributes with confidence. Pick one that fits in the strong laptops' memory; test inference speed early, since the review loop needs responses within a few seconds. Start training on developer2's machine; use cloud notebooks if memory runs short.
4. **Post-processing:** pass model output through the dictionary and template validators (units, allowed values). Reject outputs that violate the template; mark those attributes UNKNOWN.
5. **Service:** FastAPI `POST /extract`, returns the canonical candidate plus per-attribute confidence and model version. Hybrid order: rules, then model for what rules missed.
6. **Evaluation (`ml/eval/`):** per-attribute accuracy on the frozen test set, baseline vs model, saved as a table for the pitch. Done when: model beats baseline on critical-attribute accuracy on the test set, or developer1 present the baseline honestly if it doesn't.

### 5.3 Backend pipeline (developer1)

- **Database** (PostgreSQL): `raw_record`, `canonical_record`, `cmc` (code, class, subclass, canonical_key, attributes JSONB, status, superseded_by), `crosswalk` (cpse_id, cpse_code, cmc, relationship, evidence, version), `review_task`, `audit_log`, `procurement`, `migration_batch`. Unique constraint: one (cpse_id, cpse_code) maps to one active CMC.
- **Ingest:** CSV/Excel upload, column mapping, store raw record unchanged; incremental by hash of each row.
- **Cleaner:** applies developer4's dictionary, version recorded.
- **Canonicalizer:** calls extraction service, validates against template, sets each dimension to KNOWN, UNKNOWN or NA (NA comes only from the template, never from failed extraction).
- **Canonical key:** deterministic string from the critical dimensions in template order.
- **Decision engine:** the logic in Section 6 of the design. Pending/review for incomplete records; never a silent new CMC.
- **Fallback matcher:** candidate search (class filter, part number, attribute equality, text similarity using Postgres trigram, optionally vector index) and a comparator returning MATCH/CONFLICT/UNKNOWN per critical attribute.
- **CMC service:** assigns serial, computes check digit (Verhoeff), enforces supersession (new code, old code marked, crosswalks updated in one transaction).
- **Description generator:** template-based. Done when: a CSV of 200 messy valve records goes in and produces CMCs, a crosswalk and a review queue, with a test for each outcome.

### 5.4 API (developer1) — endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /upload` | Start bulk ingest, returns batch id |
| `GET /batches/{id}` | Progress and counts |
| `POST /items/check` | **Search-before-create**: text in, matching CMC with evidence or "none" |
| `GET /cmc/{code}` | Golden record with linked CPSE codes |
| `GET /search` | By CMC, CPSE code, keywords, attributes |
| `GET /reviews` / `POST /reviews/{id}/decision` | Review queue and decisions |
| `POST /migration/dry-run` / `/publish` / `/rollback` | Migration flow |
| `GET /audit` / `GET /audit/verify` | Log and chain verification |
| `GET /analytics/*` | Duplicate stats, procurement, metrics |
| `POST /auth/login` | JWT with roles |

### 5.5 Frontend (developer3) — page by page

Stack: React, TypeScript, Vite, Tailwind, a charting library, React Router. Build against the mock first.

**Page 1 — Login and role routing.** Roles: uploader, steward, approver, admin, auditor. Shows only allowed menus.

**Page 2 — CPSE Portal (uploader).**

- *Upload panel:* drag-and-drop CSV/Excel, column-mapping step, progress bar tied to `/batches/{id}`.
- *Search-Before-Create panel:* one text box. User types a description; shows the standardized description, extracted attributes with confidence badges, and either "Existing CMC found" with evidence or "No match, request new code". Highlights missing critical attributes. This is the hero demo screen.
- *My items table:* their records with mapped CMC and status.

**Page 3 — Steward Workbench.**

- *Queue list:* filter by category, confidence, status; sorted by priority.
- *Review detail (split view):* left, original text and attributes; right, candidate CMC; center, attribute-by-attribute grid colored MATCH / CONFLICT / UNKNOWN with confidence; buttons Approve, Reject, Correct attribute, Create new. Correcting an attribute reruns the decision.
- Approver view shows items escalated for functional equivalence.

**Page 4 — Golden Record Explorer.** Search by CMC, CPSE code or text. Detail page: standardized description, 20-dimension table (NA shown as "—", UNKNOWN highlighted), CPSE relationship tree, supersession history, audit timeline, procurement summary.

**Page 5 — Dashboard.** Cards: total records, CMCs, duplicates found, review rate, auto-resolved share. Charts: duplicates by category, coverage by CPSE, migration progress. Procurement panel: pooled demand and price-spread table with the formula shown and a "synthetic data" label. Metrics tab for the evaluation numbers.

**Page 6 — Admin.** Edit dictionary entries, templates, code tables (versioned, with diff view); migration console (dry run report, publish, rollback); user roles; audit verify button with chain status.

**Shared components:** attribute badge (state and confidence), comparison grid, relationship tree, code display with hyphen grouping and copy button, toast and error handling. Done when: all pages run on mock data, then on the real API without ladeveloper1t changes.

### 5.6 Audit and governance (developer4 builds, developer1 integrate)

- Append-only `audit_log`: actor, action, before/after, evidence, model and template versions, timestamp, previous hash, hash (SHA-256 of entry plus previous hash).
- `verify()` recomputes the chain and reports the first broken entry.
- Anchor: periodically write the latest hash to a file outside the database (and optionally a commit in the repo) so tampering with the database alone is detectable.
- Role checks on every write endpoint.

### 5.7 Procurement intelligence (developer4 builds, developer1 expose)

Queries over CMC plus synthetic procurement data: pooled demand (after unit conversion, exact equivalents only), price spread (price minus best price times quantity, upper bound), duplicate stock inside one CPSE, surplus-versus-demand matching. Output tables for the dashboard.

### 5.8 Migration (developer1)

Batch states: `extracted → dry_run → in_review → published → verified` (or `rolled_back`). Dry run writes to a staging crosswalk only. Verify checks that every source row maps to one CMC or a pending state, and that counts reconcile. Rollback restores the previous crosswalk version. Intra-CPSE duplicates listed with a recommended code.

## 6. Phases and who does what

| Phase | developer1 | developer2 | developer3 | developer4 |
| --- | --- | --- | --- | --- |
| **0 Contracts** | Repo, DB, OpenAPI | Extraction API shape | Mock server, design tokens | Canonical and template schemas |
| **1 Skeleton** | Ingest, cleaner, DB models, stub decision flow | Baseline rule extractor | Login, ladeveloper1t, Upload page | Dictionary v1, valve template, code tables |
| **2 Core** | Canonicalizer, canonical key, CMC service, decision engine | Training data build, first model run | Search-Before-Create, Golden Record page | Labelled sets, synthetic generator |
| **3 Intelligence** | Fallback matcher, review tasks, API for reviews | Model improvement, post-processing, eval v1 | Steward workbench, comparison grid | Pipe and bearing templates, audit chain |
| **4 Governance and value** | Migration, supersession, auth/roles | Eval on test set, error analysis | Dashboard, Admin | Procurement analytics, synthetic CPSEs |
| **5 Integrate and harden** | End-to-end tests, performance, Docker | Final model packaging | Replace mocks with real API, polish | Metrics table, docs, test data, demo script |
| **6 Rehearse** | Everyone: 3 full demo runs, fix bugs, freeze code |  |  |  |

**Integration checkpoints** (do not skip): end of Phase 1 (stub flows through UI), end of Phase 3 (real model plus real review), end of Phase 5 (full demo).

## 7. Prototype run (Docker)

```
docker compose up   # postgres, backend, ml-service, frontend
```

Backend `http://localhost:8000`, UI `http://localhost:5173`. A seed script loads dictionaries, templates, code tables and 3 synthetic CPSE catalogs.

## 8. Testing

- **Unit:** cleaner, unit conversion, canonical key, check digit, hash chain.
- **Decision tests:** one test per outcome (identical, new, incomplete, conflict, supersession).
- **Safety tests:** pairs differing only in pressure or grade must never share a CMC.
- **Integration:** upload 200-row file end to end.
- **Evaluation:** frozen test set, metrics from Section 13 of the design.

## 9. Demo script (about 6 minutes)

1. Show three messy descriptions of one item (the ball-valve example).
2. Upload CSVs from 3 synthetic CPSEs; show pipeline progress.
3. Dashboard: duplicates found, review rate.
4. Open a CMC: standardized description, attributes, relationship tree.
5. Steward reviews one conflict (same text, different pressure): system refuses to merge.
6. **Search-Before-Create:** type a new description; existing CMC returned.
7. Migration dry run, publish, rollback.
8. Procurement panel (synthetic, labelled) with formula.
9. Audit verify, then tamper one row and show it detected.
10. Metrics slide: extraction accuracy, false-merge rate, review rate, baseline comparison. Say clearly: SAP connection is mocked; savings are estimates; procurement data is synthetic.

## 10. Risks and fallbacks

| Risk | Fallback |
| --- | --- |
| Model not ready or weak | Rule extractor is the working baseline; report honestly |
| Templates not validated by an engineer | Say so; lead with the process, not claimed correctness |
| Weak laptop slows developer4 | Cloud notebooks for any heavy step; developer4's tasks are light by design |
| Scope creep to 5 categories | Freeze at valves, pipes, bearings |
| Integration surprises late | Contracts and checkpoints in Section 6 |
| Review rate very high | Present as designed behavior, show prioritization |