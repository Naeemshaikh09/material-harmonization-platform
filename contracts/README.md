# API Contracts - Phase 0

## ⚠️ CRITICAL: Phase 0 Requirement

**ALL 4 developers MUST agree on these contracts before writing ANY feature code.**

## Required Contracts

### 1. `canonical.json` (Developer 1 + Developer 4)
**Purpose:** 20-attribute material model + CMC code format

**Must define:**
- 20 universal attributes with data types
- CMC code structure (CCCC-SSSS-ZZZZ-MMMM-PPPP-NNNN-K)
- Attribute states: KNOWN, UNKNOWN, NA
- Class templates structure

**Example Structure:**
```json
{
  "version": "1.0",
  "attributes": {
    "type": {"dataType": "string", "required": true},
    "primary_size": {"dataType": "number", "unit": "MM", "required": true},
    ...
  },
  "cmc_format": {
    "segments": ["class", "subclass", "size", "material", "pressure", "serial", "check_digit"],
    "format": "CCCC-SSSS-ZZZZ-MMMM-PPPP-NNNN-K"
  }
}
```

---

### 2. `backend_api.json` or `openapi.yaml` (Developer 1)
**Purpose:** All backend API endpoints specification

**Must include:**
- Authentication endpoints
- Ingestion endpoints
- CMC CRUD endpoints
- Review endpoints
- Search endpoints
- Analytics endpoints
- Admin endpoints

**Example (OpenAPI 3.0):**
```yaml
openapi: 3.0.0
info:
  title: Material Harmonization API
  version: 0.1.0

paths:
  /api/v1/auth/login:
    post:
      summary: User login
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                username: string
                password: string
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  token: string
                  user: object
```

---

### 3. `extraction_api.json` (Developer 2)
**Purpose:** ML extraction service interface

**Must define:**
- POST /extract endpoint
- Input: raw description text
- Output: canonical attributes with confidence scores

**Example:**
```json
{
  "version": "1.0",
  "endpoint": "/extract",
  "method": "POST",
  "request": {
    "text": "string (required)",
    "cpse_id": "integer (optional)",
    "class_hint": "string (optional)"
  },
  "response": {
    "class_code": "string",
    "subclass_code": "string",
    "class_confidence": "float (0-1)",
    "attributes": {
      "type": {
        "value": "string",
        "state": "KNOWN|UNKNOWN",
        "confidence": "float (0-1)",
        "source_span": "string"
      }
    },
    "model_version": "string"
  }
}
```

---

## Contract Creation Process

### Step 1: Draft (Week 1, Day 1-2)
- Dev1 + Dev4: Draft `canonical.json`
- Dev1: Draft `backend_api.json`
- Dev2: Draft `extraction_api.json`

### Step 2: Review (Week 1, Day 3)
- Share drafts in team chat
- Schedule 1-hour meeting
- Discuss conflicts and dependencies
- Make revisions

### Step 3: PR (Week 1, Day 4)
- Create ONE PR with all 3 contracts
- Title: `[Contracts] Phase 0 - API Contracts`
- ALL 4 developers review
- ALL 4 developers approve

### Step 4: Freeze (Week 1, Day 5)
- Merge contracts PR
- Contracts are now FROZEN
- Any changes require new PR + all 4 informed

---

## Contract Change Policy

**After Phase 0, to change a contract:**

1. Create PR with `[Contracts]` prefix
2. Explain WHY change is needed
3. List all impacted code
4. All 4 developers MUST review
5. Cannot break existing integrations

**Breaking changes:**
- Require migration plan
- Need all 4 approvals
- Must update dependent code

---

## Frontend Mocks

**NO `ui_mock.json` in this folder!**

Frontend mocks live in `frontend/src/mocks/` and are **generated FROM** these contracts.

Dev3 creates mocks by:
1. Reading `canonical.json`
2. Reading `backend_api.json`
3. Generating mock responses in TypeScript

---

## Checklist

Before moving to Phase 1:

- [ ] `canonical.json` created (Dev1 + Dev4)
- [ ] `backend_api.json` created (Dev1)
- [ ] `extraction_api.json` created (Dev2)
- [ ] All 3 contracts in ONE PR
- [ ] ALL 4 developers reviewed
- [ ] ALL 4 developers approved
- [ ] PR merged to main
- [ ] Dev3 generated frontend mocks from contracts

---

## Notes

**Do NOT skip Phase 0!**

Without agreed contracts:
- Frontend mocks will be wrong
- Backend/ML integration will break
- Constant merge conflicts
- Wasted development time

**Invest time in Phase 0 to save time in all other phases.**

---

**Status:** 🔴 Phase 0 Not Started

After all contracts merged: ✅ Phase 0 Complete → Start Phase 1
