# ML Service — developer2

Extraction service for the National Material Identity Platform.

## What this does

Takes a raw industrial item description like:
```
BALL VLV 2IN CL150 SS316 FLG
```
and returns structured attributes:
```json
{
  "class_code": "0112",
  "subclass_code": "0003",
  "class_confidence": 0.97,
  "attributes": {
    "type":         { "value": "BALL",    "unit": null,    "state": "KNOWN", "confidence": 0.98, "source_span": "BALL" },
    "primary_size": { "value": "50",      "unit": "MM",    "state": "KNOWN", "confidence": 0.95, "source_span": "2IN" },
    "pressure":     { "value": "150",     "unit": "CLASS", "state": "KNOWN", "confidence": 0.97, "source_span": "CL150" },
    "material":     { "value": "SS316",   "unit": null,    "state": "KNOWN", "confidence": 0.97, "source_span": "SS316" },
    "connection":   { "value": "FLANGED", "unit": null,    "state": "KNOWN", "confidence": 0.97, "source_span": "FLG" },
    "...": "... (20 dimensions total, UNKNOWN if not found)"
  },
  "model_version": "rules-v1"
}
```

**Critical rule:** `state` is always `KNOWN` or `UNKNOWN`. **Never `NA`.** `NA` is applied by developer1's canonicalizer from the class template.

---

## Structure

```
ml/
  service/
    main.py          ← FastAPI app (endpoints: /extract, /extract/batch, /health, /version)
    extractor.py     ← Rules-based extractor (Phase 1 baseline)
    model.py         ← SLM inference wrapper (Phase 2/3, stub until model is trained)
    postprocess.py   ← Validation against templates/code tables, confidence threshold
    dictionary.py    ← Terminology dictionary loader
    schemas.py       ← Pydantic request/response models
    Dockerfile
    requirements.txt
  data/
    build_training_data.py  ← Converts developer4's labelled sets to training pairs
  train/
    train.py                ← Fine-tuning script (seq2seq, causal+LoRA, token_cls)
    train.jsonl             ← Generated — do not edit manually
    dev.jsonl               ← Generated — do not edit manually
    test.jsonl              ← FROZEN — never train on this
    split_manifest.json     ← Locks the split
  eval/
    evaluate.py             ← Evaluation on frozen test set
    results/                ← Saved evaluation runs (JSON)
  tests/
    test_extractor.py
    test_postprocess.py
```

---

## Quick start

### Run with Docker (recommended)

```bash
docker compose up ml-service
```

Service starts at `http://localhost:8001`.

### Run locally (development)

```bash
pip install -r ml/service/requirements.txt
uvicorn ml.service.main:app --port 8001 --reload
```

### Test it

```bash
curl -X POST http://localhost:8001/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "BALL VLV 2IN CL150 SS316 FLG"}'
```

---

## Phase 1: Rules-only mode (current)

No model needed. The rules extractor handles:
- Valve types (BALL, GATE, GLOBE, CHECK, BUTTERFLY, RELIEF, SOLENOID)
- Primary size (DN, NB, MM, inches, fractions)
- Pressure/rating (CL, #, LB, PN, BAR, PSI)
- Material (SS316, SS304, WCB, A105, PTFE, CI, DI, Bronze, etc.)
- Connection (FLANGED, BUTT_WELD, SOCKET_WELD, THREADED, NPT, etc.)
- Actuation (MANUAL, MOTOR_OPERATED, AIR_OPERATED, SOLENOID, etc.)
- Standard (ASME, API, IS, BS, DIN, IBR)
- Pipe schedule/thickness
- Bearing attributes (bore, OD, bearing number)

Set `MODEL_PATH=""` (default) to stay in rules-only mode.

---

## Phase 2/3: Adding the SLM

Once the model is trained:

```bash
# Train
python -m ml.train.train \
  --model-type seq2seq \
  --base-model google/flan-t5-small \
  --epochs 5

# This saves to ml/train/output/seq2seq-<timestamp>/final/
# Set the path in docker-compose.yml or .env:

MODEL_PATH=ml/train/output/seq2seq-20260101_120000/final
MODEL_TYPE=seq2seq
```

Restart the service. The `/version` endpoint will report `rules-v1+slm-v1`.

### Model type selection guide

| Model | Memory | Speed | When to use |
|---|---|---|---|
| `flan-t5-small` (seq2seq) | ~300MB | Fast | Start here — fits any machine |
| `flan-t5-base` (seq2seq) | ~900MB | Medium | Better accuracy, 8GB+ RAM |
| `Qwen2.5-0.5B` (causal+LoRA) | ~1GB | Medium | Try if seq2seq accuracy is insufficient |
| `SmolLM2-1.7B` (causal+LoRA) | ~3.4GB | Slower | 8GB+ RAM, use Colab if needed |
| `deberta-v3-small` (token_cls) | ~140MB | Very fast | Alternative architecture, good on CPU |

Use Colab/Kaggle for anything above flan-t5-base if your laptop runs short.

---

## Build training data

First get developer4's labelled files in `data/labelled/` and `data/synthetic/`, then:

```bash
python -m ml.data.build_training_data
```

This creates `ml/train/train.jsonl`, `dev.jsonl`, `test.jsonl` split by item.
**The split is frozen after first run.** Use `--force` only if labelled data changes (invalidates test set).

---

## Evaluation

Always evaluate on the frozen test set only:

```bash
# Baseline (rules-only)
python -m ml.eval.evaluate --name baseline --dataset test_real

# After training
MODEL_PATH=ml/train/output/.../final python -m ml.eval.evaluate \
  --name model_v1 --dataset test_real --use-model
```

Results are saved to `ml/eval/results/` and pushed to the backend DB.
The error analysis file goes to developer4 for dictionary improvement.

---

## Run tests

```bash
pytest ml/tests/ -v
```

All tests must pass before merging. Key safety tests:
- `test_state_never_na` — extractor never returns `NA`
- `test_different_pressure_different_extraction` — safety pair test
- `test_different_material_different_extraction` — safety pair test

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `MODEL_PATH` | `""` | Path to fine-tuned model. Empty = rules-only. |
| `MODEL_TYPE` | `seq2seq` | `seq2seq`, `causal`, or `token_cls` |
| `MODEL_VERSION` | `slm-v1` | Version label reported in responses |
| `CONFIDENCE_THRESHOLD` | `0.50` | Below this confidence → UNKNOWN |
| `TERMINOLOGY_DICT_PATH` | `data/dictionaries/terminology.json` | developer4's dictionary |
| `TEMPLATES_DIR` | `data/templates` | developer4's class templates |
| `CODE_TABLES_DIR` | `data/code_tables` | developer4's code tables |
| `BACKEND_URL` | `http://localhost:8000` | developer1's backend (for pushing metrics) |

---

## CPU fallback

The service runs entirely on CPU. No GPU required for the rules extractor or for inference with flan-t5-small. For larger models:
```bash
# Force CPU even if GPU is available
CUDA_VISIBLE_DEVICES="" uvicorn ml.service.main:app --port 8001
```

---

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/extract` | POST | Single item extraction |
| `/extract/batch` | POST | Bulk extraction (max 1000 items) |
| `/health` | GET | Liveness check + model status |
| `/version` | GET | Service and model versions |
| `/reload-dict` | POST | Reload terminology dictionary from disk |
| `/docs` | GET | Interactive API docs (Swagger) |
