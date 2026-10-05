# Local Setup Guide
## National Material Identity Platform — SIH 26099

Everything you need to go from a fresh clone to a running system.  
Two paths: **Mock mode** (frontend only, no backend needed) and **Full stack** (backend + DB + ML service).

---

## Prerequisites

| Tool | Minimum version | Check |
|------|----------------|-------|
| Python | 3.11+ | `python --version` |
| Node.js | 20+ | `node --version` |
| npm | 9+ | `npm --version` |
| PostgreSQL | 14+ | `psql --version` *(full stack only)* |
| Docker + Compose | 24+ | `docker --version` *(optional)* |
| Git | any | `git --version` |

---

## Path A — Frontend Only (Mock Mode)
> Fastest start. No Python, no database, no backend needed.  
> All data is served from in-memory fixtures. Every screen works.

### 1. Clone
```bash
git clone https://github.com/Naeemshaikh09/material-harmonization-platform.git
cd material-harmonization-platform
git checkout jayedshaikh
```

### 2. Frontend env
```bash
cd frontend
cp .env.example .env
```

Open `frontend/.env` and confirm it reads:
```
VITE_API_MODE=mock
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 3. Install and run
```bash
npm install
npm run dev
```

Open **http://localhost:5173** — the login page should appear.

### 4. Demo accounts (any password works in mock mode)

| Account | Role | Lands on |
|---------|------|----------|
| `uploader1` | UPLOADER | CPSE Portal |
| `steward1` | STEWARD | Steward Workbench |
| `approver1` | APPROVER | Steward Workbench |
| `admin1` | ADMIN | Admin Console |
| `auditor1` | AUDITOR | Admin Console |

---

## Path B — Full Stack (Backend + Database)

### Step 1 — Clone (same as above)
```bash
git clone https://github.com/Naeemshaikh09/material-harmonization-platform.git
cd material-harmonization-platform
git checkout jayedshaikh
```

---

### Step 2 — Backend virtual environment

```bash
cd backend

# Create the virtual environment
python -m venv venv

# Activate it
# Windows (PowerShell)
venv\Scripts\Activate.ps1
# Windows (CMD)
venv\Scripts\activate.bat
# macOS / Linux
source venv/bin/activate

# Your prompt should now show (venv)
```

Install dependencies:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

### Step 3 — Environment variables

```bash
# From the repo root
cp .env.example .env
```

Open `.env` and fill in the required values:

```env
# ── Database ──────────────────────────────────────────────────
# Option A: local PostgreSQL
DATABASE_URL=postgresql://nmip_user:nmip_pass@localhost:5432/nmip

# Option B: Supabase (cloud)
# DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# ── Security ──────────────────────────────────────────────────
SECRET_KEY=change_this_to_any_random_string_minimum_32_chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ── ML Service ────────────────────────────────────────────────
ML_SERVICE_URL=http://localhost:8001

# ── CORS ──────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173

# ── Paths ─────────────────────────────────────────────────────
DICTIONARIES_PATH=./data/dictionaries
TEMPLATES_PATH=./data/templates
CODE_TABLES_PATH=./data/code_tables

# ── Dev ───────────────────────────────────────────────────────
DEBUG=true
LOG_LEVEL=INFO
```

---

### Step 4 — Database setup

**Option A — Local PostgreSQL:**
```bash
# Create the database and user (run in psql)
psql -U postgres

CREATE USER nmip_user WITH PASSWORD 'nmip_pass';
CREATE DATABASE nmip OWNER nmip_user;
GRANT ALL PRIVILEGES ON DATABASE nmip TO nmip_user;
\q
```

**Option B — Docker PostgreSQL only:**
```bash
docker run -d \
  --name nmip-db \
  -e POSTGRES_USER=nmip_user \
  -e POSTGRES_PASSWORD=nmip_pass \
  -e POSTGRES_DB=nmip \
  -p 5432:5432 \
  postgres:16
```

---

### Step 5 — Run database migrations and seed

```bash
# Still inside backend/ with (venv) active
cd backend

# Create all tables
python -c "from app.db.database import engine, Base; Base.metadata.create_all(bind=engine); print('Tables created.')"

# Seed reference data (dictionaries, templates, code tables, demo users)
python seed.py
```

Expected output:
```
Tables created.
Seeding terminology dictionary... done (10 rows)
Seeding class templates... done (3 templates)
Seeding code tables... done (5 tables)
Seeding demo users... done
Seeding synthetic CPSEs... done (3 CPSEs)
Seed complete.
```

---

### Step 6 — Start the backend

```bash
# From backend/ with (venv) active
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Verify at **http://localhost:8000/api/docs** — you should see the Swagger UI with all 8 routers.

Health check:
```bash
curl http://localhost:8000/api/v1/health
# {"status":"ok","database":"connected","ml_service":"integrated"}
```

---

### Step 7 — Frontend in live mode

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_MODE=live
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

```bash
npm install
npm run dev
```

Open **http://localhost:5173**

---

## Path C — Docker (One Command)

Runs everything: PostgreSQL + ML service + Backend + Frontend.

```bash
# From repo root
cp .env.example .env
# Edit .env — at minimum set SECRET_KEY

docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger docs | http://localhost:8000/api/docs |
| ML service | http://localhost:8001 |
| PostgreSQL | localhost:5432 |

Stop everything:
```bash
docker compose down
# To also delete the database volume:
docker compose down -v
```

---

## Project Structure

```
material-harmonization-platform/
├── backend/                  # FastAPI — Developer 1
│   ├── app/
│   │   ├── api/              # Route handlers (auth, batches, cmc, reviews, …)
│   │   ├── db/               # SQLAlchemy models + Alembic migrations
│   │   ├── pipeline/         # Cleaner → Canonicalizer → Decision engine
│   │   ├── matching/         # Exact lookup + fallback matcher
│   │   ├── codes/            # CMC serial + Verhoeff check digit
│   │   └── ...
│   ├── tests/
│   ├── main.py
│   ├── seed.py
│   └── requirements.txt
│
├── ml/                       # Extraction service — Developer 2
│   ├── service/              # FastAPI POST /extract endpoint
│   ├── train/                # Baseline rules + SLM fine-tuning
│   └── eval/                 # Per-attribute accuracy evaluation
│
├── frontend/                 # React + TypeScript — Developer 3
│   ├── src/
│   │   ├── pages/            # Login, Portal, Workbench, Golden, Dashboard, Admin
│   │   ├── components/       # AttributeBadge, ComparisonGrid, CodeDisplay, …
│   │   ├── lib/              # api.ts, types.ts, format.ts
│   │   ├── mocks/            # fixtures.ts — full demo dataset
│   │   └── state/            # AuthContext, ToastContext
│   └── package.json
│
├── data/                     # Reference data — Developer 4
│   ├── dictionaries/         # Abbreviation, unit, material, rating tables
│   ├── templates/            # Valve, pipe, bearing class templates
│   ├── code_tables/          # Numeric code → canonical value maps
│   ├── labelled/             # Hand-labelled extraction + pair sets
│   └── synthetic/            # Generated CPSE catalogs
│
├── contracts/                # Shared API schemas (all 4 approve changes)
├── docs/                     # Architecture, API, demo script
├── docker-compose.yml
├── .env.example
├── SETUP.md                  # ← this file
└── README.md
```

---

## Common Issues

### `psycopg2` install fails on Windows
```bash
pip install psycopg2-binary==2.9.9
```
If that still fails, install the [PostgreSQL Windows installer](https://www.postgresql.org/download/windows/) first.

### PowerShell blocks venv activation
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port 5432 already in use
```bash
# Find what is using it
netstat -ano | findstr :5432     # Windows
lsof -i :5432                    # macOS / Linux
```

### `VITE_API_MODE=live` but seeing mock data
Check that `frontend/.env` (not `.env.example`) has `VITE_API_MODE=live`. Vite only reads `.env`.

### Backend starts but 401 on every request
The `SECRET_KEY` in `.env` must be at least 32 characters. A quick generator:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Verify the full stack is working

```bash
# 1. Health
curl http://localhost:8000/api/v1/health

# 2. Login (returns a JWT)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"demo"}'

# 3. Analytics summary
curl http://localhost:8000/api/v1/analytics/summary \
  -H "Authorization: Bearer <token_from_step_2>"
```

---

## Running Tests

```bash
cd backend
# With (venv) active
pytest tests/ -v
```

---

## Switching API mode without restarting

Edit `frontend/.env`:
```env
VITE_API_MODE=mock    # pure frontend demo
VITE_API_MODE=live    # calls real FastAPI backend
```

Vite hot-reloads env changes automatically — no restart needed.
