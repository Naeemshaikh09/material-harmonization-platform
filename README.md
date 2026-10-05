<div align="center">

# NMIP
### National Material Identity Platform

**SIH 26099 · AI-Driven Standardization and Harmonization of Material Codes Across CPSEs**

*One Nation. One Material Code.*

---

[![Team](https://img.shields.io/badge/Team-QuantWarriors-1a1815?style=flat-square)](https://github.com/Naeemshaikh09/material-harmonization-platform)
[![Team ID](https://img.shields.io/badge/Team_ID-165259-4b5563?style=flat-square)](#)
[![PS ID](https://img.shields.io/badge/PS_ID-SIH26099-15803d?style=flat-square)](#)
[![Theme](https://img.shields.io/badge/Theme-Smart_Automation-b45309?style=flat-square)](#)
[![Organisation](https://img.shields.io/badge/Org-CPCL_%2F_MoPNG-b42318?style=flat-square)](#)
[![Status](https://img.shields.io/badge/Status-Active-15803d?style=flat-square)](#)

</div>

---

## The Problem

Walk into any of India's major CPSEs — ONGC, IOCL, BHEL, SAIL — and ask for a 2-inch Class 150 stainless ball valve.

You will get three different material codes, four different descriptions, and two different units of measure. All for the exact same item.

This is not a data entry problem. It is a structural one. Every CPSE built its material master independently, in isolation, without a shared identity standard. The result:

- **Duplicate stock** sitting in warehouses across the country because nobody knew the other CPSE already held it
- **Split procurement** — each CPSE negotiating alone, leaving pooled-demand savings unclaimed
- **Invisible equivalence** — engineers cannot safely combine records without attribute-level proof

The standard answer — fuzzy name matching — fails here. `VLV BALL 2" CL150 SS316 FLGD` and `BALL VALVE DN50 150# SS-316 FLANGED` describe the same item. A text similarity score of 0.73 does not tell you whether to merge them. One wrong merge — say, CL150 and CL300 both mapped to the same code — is a procurement and safety failure.

The question is not *do these names look alike?* It is: **are these provably the same material?**

---

## The Answer

NMIP decomposes every material description into **20 governed attribute dimensions** — type, size, material grade, pressure rating, connection end, standard, and more. Identity is decided attribute by attribute, with confidence scores, against a versioned class template. Only when every critical dimension matches — provably — do two records share a code.

```
RAW CPSE TEXT
    ↓
CLEAN + NORMALIZE          ← terminology dictionary (abbreviations, units, ratings)
    ↓
SLM + RULES EXTRACTION     ← 20-dimension canonical record, per-attribute confidence
    ↓
COMPLETENESS CHECK         ← critical dims all KNOWN? or send to review?
    ↓
EXACT KEY LOOKUP           ← deterministic: same dims → same code
    ↓
FALLBACK MATCH             ← trigram + attribute comparator for near-matches
    ↓
DECIDE                     ← LINKED / NEW CMC / PENDING REVIEW / CONFLICT
    ↓
COMMON MATERIAL CODE       ← 0112-0003-0050-0017-0150-0001-4
    ↓
CROSSWALK                  ← CPSE_A/1000234567, CPSE_B/70001234, CPSE_C/30007781
```

The CPSE's existing codes are **never changed**. The crosswalk maps them to the national code. The ERP is untouched.

---

## Four Decision Outcomes

| Outcome | Condition | Action |
|---------|-----------|--------|
| 🟢 **LINKED** | All critical attributes match an existing CMC | Map to existing code |
| 🔵 **NEW CMC** | All critical attributes known, no match found | Create new code |
| 🟡 **PENDING REVIEW** | Critical attribute missing or low confidence | Queue for steward |
| 🔴 **CONFLICT** | Critical attribute present but contradicts candidate | Keep separate, never merge |

> *A duplicate is cheap. A false merge is not.*  
> Incomplete records wait. Conflicting records stay separate. Silent decisions never happen.

---

## What the Platform Delivers

### Search Before Create
An uploader types a free-text description. The system extracts attributes, looks up the canonical key, and returns — within seconds — either an existing CMC with evidence, a request for the missing attribute, or a new code. Duplicates are stopped before they are created.

### Golden Master
Every CMC is a structured record: 20 attributes in governed dimension order, with state (`KNOWN` / `UNKNOWN` / `NA`), unit, code, confidence and source span. Short and long standardized descriptions are generated from the class template. The golden master is the single source of truth.

### CPSE Crosswalk
Every CPSE code maps to exactly one active CMC. The mapping records the relationship (`EXACT` / `POTENTIAL` / `PENDING`), the decision source (`AUTO` / `HUMAN`), and the original description. Supersession keeps old codes alive and traceable.

### Steward Workbench
Uncertain records — low confidence, missing attributes, or conflicting values — go to a review queue. The steward sees the original text, extracted attributes, the candidate CMC, and a colour-coded attribute-by-attribute comparison: green for MATCH, red for CONFLICT, amber for UNKNOWN. Approve is disabled while any critical conflict remains. Every decision is audited.

### Migration Console
A dry run computes the full mapping for a CPSE category without committing anything. The steward reviews the report, resolves pending items, then publishes a versioned crosswalk. Rollback restores the previous version. The source data is never touched.

### Dashboard and Procurement Intelligence
Duplicate counts by category, coverage by CPSE, migration progress, model evaluation metrics. The procurement panel shows pooled demand and price-spread savings — labelled synthetic, formula shown, number arguable.

### Tamper-Evident Audit Chain
Every write — creation, link, decision, correction, supersession — appends a row to an append-only log with a SHA-256 hash over the previous hash and the row content. Verify replays the chain and reports the first broken entry. The anchor writes the latest hash outside the database, so tampering requires compromising two independent systems.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  React + TypeScript + Tailwind (Vite)                           │
│  4 role-gated screens · mock mode · real API mode               │
└────────────────────────┬────────────────────────────────────────┘
                         │  REST / JSON
┌────────────────────────▼────────────────────────────────────────┐
│  FastAPI (Python 3.11)                                          │
│  Auth · Ingestion · CMC · Reviews · Migration · Analytics       │
│  Admin · Audit                                                  │
│                                                                 │
│  ┌──────────────────┐   ┌───────────────────────────────────┐  │
│  │ Pipeline         │   │ Decision Engine                   │  │
│  │ Cleaner          │──▶│ Canonical key lookup              │  │
│  │ Canonicalizer    │   │ Fallback: trigram + comparator    │  │
│  │ CMC service      │   │ LINKED / NEW / PENDING / CONFLICT │  │
│  └──────────────────┘   └───────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
          │              │
          ▼              ▼
┌─────────────┐   ┌──────────────────────────────────────────────┐
│ ML Service  │   │ PostgreSQL 16                                 │
│ FastAPI     │   │ JSONB attributes · pg_trgm fuzzy search       │
│ POST/extract│   │ Append-only audit_log · crosswalk · cmc       │
│ Rules+SLM   │   │ migration_batch · procurement_record          │
└─────────────┘   └──────────────────────────────────────────────┘
```

**Stack:**

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router v6 |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Python 3.11 |
| Database | PostgreSQL 16, JSONB, pg_trgm, pgvector (optional) |
| ML | Rules baseline + LoRA fine-tuned SLM, PyTorch, Hugging Face |
| Auth | JWT (python-jose), bcrypt, role-based access |
| DevOps | Docker Compose, GitHub Actions (planned) |

---

## The 20-Dimension Model

Every material is described by exactly 20 attribute slots. Each slot carries a value, unit, 4-digit code, state, confidence score, and source span — the substring of the original text that produced it.

```json
{
  "type":         { "value": "BALL",    "state": "KNOWN",   "confidence": 0.98, "source_span": "BALL"   },
  "primary_size": { "value": "50",      "unit": "MM",       "state": "KNOWN",   "confidence": 0.97, "source_span": "2 IN" },
  "pressure":     { "value": "150",     "unit": "CLASS",    "state": "KNOWN",   "confidence": 0.95, "source_span": "CL150" },
  "material":     { "value": "SS316",   "state": "KNOWN",   "confidence": 0.96, "source_span": "SS316"  },
  "connection":   { "value": "FLANGED", "state": "KNOWN",   "confidence": 0.93, "source_span": "FLG"    },
  "length":       {                     "state": "NA"                                                    },
  "protection":   {                     "state": "UNKNOWN"                                               }
}
```

`NA` means the class template says this dimension does not apply.  
`UNKNOWN` means it applies but extraction failed — never confused with `NA`.

---

## The CMC Code

```
0112 - 0003 - 0050 - 0017 - 0150 - 0001 - 4
 │      │      │      │      │      │      └─ Verhoeff check digit
 │      │      │      │      │      └──────── Serial within prefix
 │      │      │      │      └─────────────── Pressure code (CL150)
 │      │      │      └────────────────────── Material code (SS316)
 │      │      └───────────────────────────── Size code (DN50)
 │      └──────────────────────────────────── Subclass code (BALL VALVE)
 └─────────────────────────────────────────── Class code (VALVE)
```

The Verhoeff check digit catches all single-digit errors and all adjacent transpositions — the most common data entry mistakes.

---

## Team — QuantWarriors

| Developer | Role | Owns |
|-----------|------|------|
| **Developer 1** | Tech Lead + Backend | Repo, DB, pipeline, canonicalizer, decision engine, CMC service, all APIs |
| **Developer 2** | AI / ML Lead | Extraction service, SLM fine-tuning, evaluation |
| **Developer 3** | Frontend Lead | All screens, API client, demo polish |
| **Developer 4** | Data + Governance | Dictionaries, templates, code tables, labelled sets, audit chain, procurement |

---

## Quickstart

```bash
git clone https://github.com/Naeemshaikh09/material-harmonization-platform.git
cd material-harmonization-platform
git checkout jayedshaikh

# Frontend only — no backend needed
cd frontend
cp .env.example .env        # VITE_API_MODE=mock
npm install
npm run dev
# → http://localhost:5173
```

For full stack, Docker, and troubleshooting: see **[SETUP.md](./SETUP.md)**

---

## Demo Accounts

```
uploader1  / demo   →  CPSE Portal
steward1   / demo   →  Steward Workbench
approver1  / demo   →  Steward Workbench (L2 tasks)
admin1     / demo   →  Admin Console + all pages
auditor1   / demo   →  Audit tab (read-only)
```

Use the **Demo** role switcher in the top bar to switch roles without logging out.

---

## Research Foundations

| Reference | Relevance |
|-----------|-----------|
| Fellegi & Sunter (1969), JASA | Theoretical basis for record linkage |
| Elmagarmid et al. (2007), IEEE TKDE | Duplicate detection survey |
| Christen (2012), Springer — *Data Matching* | Blocking and comparison strategies |
| Hu et al. (2022), ICLR — *LoRA* | Parameter-efficient fine-tuning for the SLM |
| ISO 8000 / ISO 22745 | Material master data quality standards |
| Verhoeff (1969) | Error-detecting decimal codes (CMC check digit) |
| Haber & Stornetta (1991), J. Cryptology | Hash-linked tamper-evident records (audit chain) |

---

## Honesty Notes

- **Procurement savings** are upper-bound estimates from synthetic data. Labelled everywhere. Formula is shown so the number can be argued with.
- **SAP / Oracle** connection is mocked in this demo. The crosswalk design preserves existing CPSE codes — the adapter is the integration layer.
- **Class templates** are labelled as unvalidated until reviewed by a domain engineer. The process is the product.
- **Model accuracy** numbers come from a frozen test split, split by item, never seen during training.

---

<div align="center">

Built for **Smart India Hackathon 2026**  
Team **QuantWarriors** · Team ID **165259** · PS ID **SIH26099**  
Ministry of Petroleum & Natural Gas · CPCL  

*One Nation — One Material Code*

</div>
