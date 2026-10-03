# Project Directory Structure

## Complete Structure

```
material-harmonization-platform/
│
├── .github/                          # GitHub configurations
│   ├── CODEOWNERS                    # Auto-assign reviewers
│   └── workflows/                    # CI/CD pipelines (future)
│
├── contracts/                        # API contracts (Phase 0 - ALL 4 approve)
│   ├── canonical.json               # 20-attribute model + CMC format (Dev1 + Dev4)
│   ├── backend_api.json             # Backend API spec (Dev1)
│   └── extraction_api.json          # ML extraction API spec (Dev2)
│
├── backend/                          # Backend services (Developer 1)
│   ├── app/
│   │   ├── api/                     # FastAPI routes
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # Login, JWT
│   │   │   ├── batches.py           # Ingestion endpoints
│   │   │   ├── cmc.py               # CMC CRUD
│   │   │   ├── reviews.py           # Review queue
│   │   │   ├── migration.py         # Migration endpoints
│   │   │   ├── analytics.py         # Dashboard metrics
│   │   │   └── admin.py             # Admin operations
│   │   │
│   │   ├── pipeline/                # Processing pipeline
│   │   │   ├── __init__.py
│   │   │   ├── ingest.py            # CSV/Excel upload
│   │   │   ├── cleaner.py           # Dictionary-based cleaning
│   │   │   ├── canonicalizer.py     # Attribute extraction + validation
│   │   │   ├── stub_extractor.py    # Baseline rules (Phase 0-1)
│   │   │   └── decision.py          # Decision engine
│   │   │
│   │   ├── matching/                # Matching engine
│   │   │   ├── __init__.py
│   │   │   ├── lookup.py            # Exact canonical key lookup
│   │   │   ├── fallback.py          # Similarity-based matching
│   │   │   └── comparator.py        # Attribute comparison
│   │   │
│   │   ├── codes/                   # CMC service
│   │   │   ├── __init__.py
│   │   │   ├── generator.py         # Serial + check digit
│   │   │   ├── supersession.py      # Code updates
│   │   │   └── description.py       # Template-based description
│   │   │
│   │   ├── audit/                   # Audit chain (Developer 4)
│   │   │   ├── __init__.py
│   │   │   ├── logger.py            # Hash-chained audit log
│   │   │   └── verifier.py          # Chain verification
│   │   │
│   │   ├── procurement/             # Procurement analytics (Developer 4)
│   │   │   ├── __init__.py
│   │   │   ├── pooling.py           # Demand aggregation
│   │   │   └── price_spread.py      # Price analysis
│   │   │
│   │   ├── db/                      # Database models
│   │   │   ├── __init__.py
│   │   │   ├── models.py            # SQLAlchemy models
│   │   │   ├── connection.py        # DB connection
│   │   │   └── migrations/          # Alembic migrations
│   │   │
│   │   └── extraction/              # Interface to ML service (Developer 2)
│   │       ├── __init__.py
│   │       └── client.py            # HTTP client to ml/service
│   │
│   ├── tests/                       # Backend tests
│   │   ├── test_api.py
│   │   ├── test_pipeline.py
│   │   ├── test_matching.py
│   │   ├── test_decision.py
│   │   └── test_cmc.py
│   │
│   ├── requirements.txt             # Python dependencies
│   ├── .env.example                 # Environment template
│   └── main.py                      # FastAPI app entry point
│
├── ml/                               # ML/AI components (Developer 2)
│   ├── data/                        # Training data
│   │   ├── raw/                     # Original labelled data
│   │   ├── processed/               # Cleaned training data
│   │   └── synthetic/               # Generated variants
│   │
│   ├── train/                       # Model training
│   │   ├── baseline.py              # Rule-based extractor
│   │   ├── train_model.py           # SLM fine-tuning
│   │   ├── config.yaml              # Training config
│   │   └── models/                  # Saved checkpoints
│   │
│   ├── eval/                        # Evaluation
│   │   ├── evaluate.py              # Accuracy metrics
│   │   ├── test_sets/               # Frozen test data
│   │   └── results/                 # Evaluation reports
│   │
│   ├── service/                     # Extraction API service
│   │   ├── __init__.py
│   │   ├── api.py                   # FastAPI extraction endpoint
│   │   ├── inference.py             # Model inference
│   │   └── postprocess.py           # Template validation
│   │
│   └── requirements.txt             # ML dependencies
│
├── data/                             # Reference data (Developer 4)
│   ├── dictionaries/                # Terminology
│   │   ├── abbreviations.json       # VLV → VALVE
│   │   ├── units.json               # " → IN, MM → MM
│   │   ├── materials.json           # SS316 equivalents
│   │   └── ratings.json             # 150# → CL150
│   │
│   ├── templates/                   # Class templates
│   │   ├── valve.json               # Valve attributes
│   │   ├── pipe.json                # Pipe attributes
│   │   └── bearing.json             # Bearing attributes
│   │
│   ├── code_tables/                 # Numeric codes
│   │   ├── class_codes.json         # 0112 = VALVE
│   │   ├── material_codes.json      # 0017 = SS316
│   │   └── pressure_codes.json      # 0150 = CL150
│   │
│   ├── labelled/                    # Training & test data
│   │   ├── extraction/              # Description → attributes
│   │   │   ├── train.json
│   │   │   ├── dev.json
│   │   │   └── test.json
│   │   └── pairs/                   # Same/different pairs
│   │       ├── train.json
│   │       ├── dev.json
│   │       └── test.json
│   │
│   └── synthetic/                   # Synthetic data
│       ├── gen.py                   # Variant generator
│       ├── cpse_catalogs/           # Fake multi-CPSE data
│       └── procurement/             # Fake procurement data
│
├── frontend/                         # React UI (Developer 3)
│   ├── src/
│   │   ├── components/              # Reusable components
│   │   │   ├── AttributeBadge.tsx
│   │   │   ├── ComparisonGrid.tsx
│   │   │   ├── RelationshipTree.tsx
│   │   │   ├── CodeDisplay.tsx
│   │   │   ├── ConfidenceBar.tsx
│   │   │   └── StatusChip.tsx
│   │   │
│   │   ├── pages/                   # Main screens
│   │   │   ├── Login.tsx            # Phase 1
│   │   │   ├── CPSEPortal.tsx       # Phase 1 (upload)
│   │   │   ├── SearchBeforeCreate.tsx  # Phase 2
│   │   │   ├── GoldenRecord.tsx     # Phase 2
│   │   │   ├── StewardWorkbench.tsx # Phase 3
│   │   │   ├── Dashboard.tsx        # Phase 4
│   │   │   └── Admin.tsx            # Phase 4
│   │   │
│   │   ├── mocks/                   # Mock API (Phase 0-4)
│   │   │   ├── api.ts               # Generated FROM contracts
│   │   │   ├── mockBackend.ts
│   │   │   └── mockData.ts
│   │   │
│   │   ├── api/                     # Real API client (Phase 5)
│   │   │   ├── client.ts            # HTTP client
│   │   │   ├── auth.ts
│   │   │   ├── batches.ts
│   │   │   ├── cmc.ts
│   │   │   └── reviews.ts
│   │   │
│   │   ├── App.tsx                  # Main app
│   │   ├── main.tsx                 # Entry point
│   │   └── styles/                  # Tailwind config
│   │
│   ├── public/                      # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── docs/                             # Documentation
│   ├── API.md                       # API documentation
│   ├── ARCHITECTURE.md              # System design
│   ├── DEMO_SCRIPT.md               # 6-minute demo flow
│   └── EVALUATION.md                # Metrics and results
│
├── .gitignore                       # Git ignore rules
├── docker-compose.yml               # Docker services
├── README.md                        # Project overview
├── COLLABORATION_GUIDE.md           # Team workflow (this repo)
├── ADMIN_SETUP.md                   # GitHub admin guide
└── PROJECT_STRUCTURE.md             # This file

```

---

## Ownership Map

| Directory | Owner | Purpose |
|-----------|-------|---------|
| `contracts/` | ALL 4 | API contracts - requires all 4 approvals |
| `backend/app/api/` | Dev1 | FastAPI routes |
| `backend/app/pipeline/` | Dev1 | Processing pipeline |
| `backend/app/matching/` | Dev1 | Matching engine |
| `backend/app/codes/` | Dev1 | CMC service |
| `backend/app/db/` | Dev1 | Database models |
| `backend/app/audit/` | Dev4 | Audit chain |
| `backend/app/procurement/` | Dev4 | Procurement analytics |
| `ml/` | Dev2 | AI/ML components |
| `data/` | Dev4 | Reference data & governance |
| `frontend/` | Dev3 | React UI |
| `docs/` | Dev4 | Documentation |
| `.github/` | Dev1 | GitHub configs |

---

## Phase-by-Phase File Creation

### Phase 0: Contracts + Mocks + Tokens
**Files to create (ALL 4 collaborate):**
- `contracts/canonical.json` (Dev1 + Dev4)
- `contracts/backend_api.json` (Dev1)
- `contracts/extraction_api.json` (Dev2)
- `frontend/src/mocks/api.ts` (Dev3 - generated from contracts)
- `backend/app/pipeline/stub_extractor.py` (Dev1 - stub)
- `.env.example` (Dev1)
- `docker-compose.yml` (Dev1)

### Phase 1: Login/Layout/Upload
**Backend (Dev1):**
- `backend/app/api/auth.py`
- `backend/app/api/batches.py`
- `backend/app/db/models.py`

**Frontend (Dev3):**
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/CPSEPortal.tsx` (upload panel)
- `frontend/src/components/layout/`

**Data (Dev4):**
- `data/dictionaries/abbreviations.json`
- `data/templates/valve.json`

**ML (Dev2):**
- `ml/train/baseline.py` (rule-based extractor)

### Phase 2: Search-Before-Create + Golden Record
**Backend (Dev1):**
- `backend/app/api/cmc.py`
- `backend/app/pipeline/canonicalizer.py`
- `backend/app/matching/lookup.py`

**Frontend (Dev3):**
- `frontend/src/pages/SearchBeforeCreate.tsx`
- `frontend/src/pages/GoldenRecord.tsx`
- `frontend/src/components/AttributeBadge.tsx`
- `frontend/src/components/CodeDisplay.tsx`

**Data (Dev4):**
- `data/code_tables/class_codes.json`
- `data/labelled/extraction/train.json`

**ML (Dev2):**
- `ml/train/train_model.py` (start model training)

### Phase 3: Steward Workbench
**Backend (Dev1):**
- `backend/app/api/reviews.py`
- `backend/app/pipeline/decision.py`
- `backend/app/matching/fallback.py`

**Frontend (Dev3):**
- `frontend/src/pages/StewardWorkbench.tsx`
- `frontend/src/components/ComparisonGrid.tsx`

**ML (Dev2):**
- `ml/service/api.py` (extraction service)
- `ml/service/inference.py`

### Phase 4: Dashboard + Admin
**Backend (Dev1):**
- `backend/app/api/analytics.py`
- `backend/app/api/admin.py`
- `backend/app/api/migration.py`

**Frontend (Dev3):**
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/Admin.tsx`

**Data (Dev4):**
- `backend/app/audit/logger.py`
- `backend/app/procurement/pooling.py`
- `data/synthetic/gen.py`

**ML (Dev2):**
- `ml/eval/evaluate.py` (run evaluation)

### Phase 5: Real API Swap + Polish
**Backend (Dev1):**
- Integration tests
- Performance optimization

**Frontend (Dev3):**
- `frontend/src/api/client.ts` (replace mocks)
- `frontend/src/api/*.ts` (real API calls)

**ML (Dev2):**
- Model optimization
- Final evaluation

**Data (Dev4):**
- Complete synthetic datasets
- Documentation

### Phase 6: Demo Rehearsal
**All 4:**
- Test demo script
- Fix bugs
- Polish UI
- Prepare presentation

---

## File Naming Conventions

### Python Files:
```
snake_case.py           # All Python files
test_feature.py         # Test files
__init__.py            # Package initialization
```

### TypeScript/React Files:
```
PascalCase.tsx         # Components and pages
camelCase.ts           # Utilities and services
kebab-case.css         # CSS files
```

### Data Files:
```
snake_case.json        # JSON data files
UPPER_SNAKE.md         # Documentation
```

---

## Important Notes

1. **Never commit:**
   - `.env` (use `.env.example` instead)
   - `*.pem`, `*.key` (private keys)
   - `node_modules/`, `__pycache__/`
   - Large model files (use Git LFS or external storage)
   - Screenshots (attach in PR description)

2. **Always commit:**
   - `.env.example` (template with placeholders)
   - `requirements.txt`, `package.json` (dependencies)
   - Migration files (database changes)
   - Test files (with the code they test)

3. **Branch strategy:**
   - `main` - protected, only via PR
   - `devN/<area>/<task>` - feature branches
   - Delete after merge

4. **Integration points:**
   - Backend ↔ ML: `contracts/extraction_api.json`
   - Backend ↔ Frontend: `contracts/backend_api.json`
   - All: `contracts/canonical.json`

---

## Quick Commands

### Create a new feature:
```bash
# Pick your area
git checkout -b dev1/backend/new-feature    # Backend
git checkout -b dev2/ml/new-model          # ML
git checkout -b dev3/frontend/new-page     # Frontend
git checkout -b dev4/data/new-template     # Data
```

### File organization check:
```bash
# Count files per developer area
ls -R backend/app/api/*.py | wc -l         # Dev1
ls -R ml/*.py | wc -l                      # Dev2
ls -R frontend/src/*.tsx | wc -l           # Dev3
ls -R data/*.json | wc -l                  # Dev4
```

---

**Ready to start coding!** 🚀

Each developer knows their area, phases are clear, integration points are defined!
