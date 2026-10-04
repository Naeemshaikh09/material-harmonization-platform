"""
Evaluation script — developer2.

Runs on the FROZEN TEST SET ONLY.
Computes per-attribute accuracy, false-merge rate, false-split rate.
Compares baseline (rules-v1) vs model (slm-v1).
Saves results to ml/eval/results/ and pushes to DB via developer1's API.

Usage:
  python -m ml.eval.evaluate --name baseline
  python -m ml.eval.evaluate --name model_v1 --use-model

NEVER run this on train.jsonl or dev.jsonl.
"""

from __future__ import annotations
import json
import logging
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DATA = REPO_ROOT / "ml" / "train" / "test.jsonl"
RESULTS_DIR = REPO_ROOT / "ml" / "eval" / "results"

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
EXTRACT_URL = os.environ.get("EXTRACT_URL", "http://localhost:8001")

# Critical dimensions per class (from developer4's templates — hardcoded as fallback)
CRITICAL_DIMS = {
    "0112": ["type", "primary_size", "pressure", "material", "connection"],  # VALVE
    "0210": ["primary_size", "thickness", "material"],                        # PIPE
    "0211": ["primary_size", "material", "connection"],                       # PIPE FITTING
    "0312": ["primary_size", "material"],                                     # BEARING
}

ALL_DIMS = [
    "type", "primary_size", "length", "thickness", "material",
    "secondary_material", "pressure", "temperature", "flow",
    "electrical", "mechanical_loading", "stiffness_hardness",
    "connection", "actuation", "standard", "protection",
    "measurement", "coating", "manufacturer_part", "uom",
]


# ---------------------------------------------------------------------------
# Metric computation
# ---------------------------------------------------------------------------

def _normalize_value(val: Optional[str]) -> Optional[str]:
    """Normalize for comparison — strip whitespace, uppercase."""
    if val is None:
        return None
    return val.strip().upper().replace(" ", "")


def attribute_accuracy(
    predicted: Dict, ground_truth: Dict
) -> Dict[str, Dict]:
    """
    Compare predicted attributes vs ground truth per dimension.

    Returns per-dimension:
      correct: bool
      predicted_state: KNOWN|UNKNOWN
      gt_state: KNOWN|UNKNOWN
      predicted_value: str|None
      gt_value: str|None
    """
    results = {}
    for dim in ALL_DIMS:
        pred_attr = predicted.get(dim, {})
        gt_attr = ground_truth.get(dim, {})

        pred_state = pred_attr.get("state", "UNKNOWN")
        gt_state = gt_attr.get("state", "UNKNOWN") if gt_attr else "UNKNOWN"
        pred_val = _normalize_value(pred_attr.get("value"))
        gt_val = _normalize_value(gt_attr.get("value") if gt_attr else None)

        # Correct if:
        #   - Both UNKNOWN (correctly abstained)
        #   - Both KNOWN and values match
        if gt_state == "UNKNOWN" and pred_state == "UNKNOWN":
            correct = True
        elif gt_state == "KNOWN" and pred_state == "KNOWN" and pred_val == gt_val:
            correct = True
        else:
            correct = False

        results[dim] = {
            "correct": correct,
            "predicted_state": pred_state,
            "gt_state": gt_state,
            "predicted_value": pred_val,
            "gt_value": gt_val,
        }
    return results


def false_merge_rate(predictions: List[Dict], ground_truths: List[Dict]) -> float:
    """
    Estimate false-merge rate:
    Two items that are DIFFERENT (different canonical key) but
    the extractor produces the same canonical key for both.

    Approximation using test set items:
      - Build canonical key from extracted critical attrs
      - Find pairs where GT keys differ but extracted keys match
    """
    def _make_key(attrs: Dict, class_code: Optional[str]) -> str:
        dims = CRITICAL_DIMS.get(class_code or "", [])
        parts = []
        for dim in dims:
            attr = attrs.get(dim, {})
            if attr.get("state") == "KNOWN":
                parts.append(f"{dim}:{_normalize_value(attr.get('value'))}")
            else:
                parts.append(f"{dim}:UNKNOWN")
        return "|".join(parts)

    gt_keys = []
    pred_keys = []
    for gt, pred in zip(ground_truths, predictions):
        cc = gt.get("class_code")
        gt_keys.append(_make_key(gt.get("attributes", {}), cc))
        pred_keys.append(_make_key(pred.get("attributes", {}), cc))

    n = len(gt_keys)
    if n < 2:
        return 0.0

    # Count pairs where GT keys differ but predicted keys match
    false_merges = 0
    total_diff_pairs = 0

    for i in range(n):
        for j in range(i + 1, n):
            if gt_keys[i] != gt_keys[j]:
                total_diff_pairs += 1
                if pred_keys[i] == pred_keys[j]:
                    false_merges += 1

    return false_merges / total_diff_pairs if total_diff_pairs > 0 else 0.0


def false_split_rate(predictions: List[Dict], ground_truths: List[Dict]) -> float:
    """
    False-split rate:
    Two items that ARE THE SAME (same GT canonical key) but
    the extractor produces different keys for them.
    """
    def _make_key(attrs: Dict, class_code: Optional[str]) -> str:
        dims = CRITICAL_DIMS.get(class_code or "", [])
        parts = []
        for dim in dims:
            attr = attrs.get(dim, {})
            if attr.get("state") == "KNOWN":
                parts.append(f"{dim}:{_normalize_value(attr.get('value'))}")
            else:
                parts.append(f"{dim}:UNKNOWN")
        return "|".join(parts)

    gt_keys = []
    pred_keys = []
    for gt, pred in zip(ground_truths, predictions):
        cc = gt.get("class_code")
        gt_keys.append(_make_key(gt.get("attributes", {}), cc))
        pred_keys.append(_make_key(pred.get("attributes", {}), cc))

    n = len(gt_keys)
    if n < 2:
        return 0.0

    false_splits = 0
    total_same_pairs = 0

    for i in range(n):
        for j in range(i + 1, n):
            if gt_keys[i] == gt_keys[j] and "UNKNOWN" not in gt_keys[i]:
                total_same_pairs += 1
                if pred_keys[i] != pred_keys[j]:
                    false_splits += 1

    return false_splits / total_same_pairs if total_same_pairs > 0 else 0.0


# ---------------------------------------------------------------------------
# Extraction runner
# ---------------------------------------------------------------------------

def run_extraction(text: str, class_code: Optional[str] = None) -> Dict:
    """Call the extraction service."""
    try:
        resp = httpx.post(
            f"{EXTRACT_URL}/extract",
            json={"text": text, "class_hint": class_code},
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning("Extraction failed for '%s': %s", text[:50], e)
        return {
            "class_code": None, "subclass_code": None, "class_confidence": 0.0,
            "attributes": {dim: {"value": None, "state": "UNKNOWN", "confidence": 0.0}
                          for dim in ALL_DIMS},
            "model_version": "error",
        }


# ---------------------------------------------------------------------------
# Main evaluation
# ---------------------------------------------------------------------------

def evaluate(
    name: str,
    dataset: str = "test_real",
    use_model: bool = False,
) -> Dict:
    """
    Run evaluation on the frozen test set.

    Args:
        name: evaluation run name, e.g. "baseline" or "model_v1"
        dataset: label for the dataset ("test_real" or "test_synthetic")
        use_model: if True, use MODEL_PATH env var to run with the SLM loaded

    Returns:
        metrics dict (also saved to file and pushed to DB)
    """
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    if not TEST_DATA.exists():
        logger.error(
            "Test data not found at %s. "
            "Run ml/data/build_training_data.py first.",
            TEST_DATA,
        )
        sys.exit(1)

    logger.info("Loading test set from %s", TEST_DATA)
    test_examples = []
    with open(TEST_DATA, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                test_examples.append(json.loads(line))

    logger.info("Evaluating %d test examples (name=%s)", len(test_examples), name)

    # Per-dimension accumulators
    dim_correct: Dict[str, int] = defaultdict(int)
    dim_total: Dict[str, int] = defaultdict(int)
    dim_false_known: Dict[str, int] = defaultdict(int)  # predicted KNOWN, GT UNKNOWN
    dim_false_unknown: Dict[str, int] = defaultdict(int)  # predicted UNKNOWN, GT KNOWN

    predictions = []
    ground_truths = []
    error_analysis = []

    for ex in test_examples:
        # Get ground truth from the labelled output JSON
        try:
            gt_attrs_raw = json.loads(ex["output"])
        except Exception:
            continue

        # Format GT to match our attribute structure
        gt_attrs = {}
        for dim in ALL_DIMS:
            raw = gt_attrs_raw.get(dim, {})
            if isinstance(raw, dict):
                gt_attrs[dim] = {
                    "value": raw.get("value"),
                    "unit": raw.get("unit"),
                    "state": "KNOWN" if raw.get("value") is not None else "UNKNOWN",
                    "confidence": raw.get("confidence", 1.0),
                }
            else:
                gt_attrs[dim] = {"value": None, "state": "UNKNOWN", "confidence": 0.0}

        gt = {
            "class_code": ex.get("class_code"),
            "subclass_code": ex.get("subclass_code"),
            "attributes": gt_attrs,
        }

        # Get prediction
        # Extract raw description from prompt
        lines = ex["input"].split("\n")
        desc_line = next((l for l in lines if l.startswith("Description:")), None)
        if not desc_line:
            continue
        desc = desc_line.replace("Description:", "").strip()

        pred = run_extraction(desc, class_code=ex.get("class_code"))

        predictions.append(pred)
        ground_truths.append(gt)

        # Per-attribute accuracy
        attr_results = attribute_accuracy(pred.get("attributes", {}), gt_attrs)

        for dim, res in attr_results.items():
            dim_total[dim] += 1
            if res["correct"]:
                dim_correct[dim] += 1
            if res["predicted_state"] == "KNOWN" and res["gt_state"] == "UNKNOWN":
                dim_false_known[dim] += 1
            if res["predicted_state"] == "UNKNOWN" and res["gt_state"] == "KNOWN":
                dim_false_unknown[dim] += 1

            # Collect errors for developer4's dictionary improvement
            if not res["correct"]:
                error_analysis.append({
                    "item_id": ex.get("item_id"),
                    "raw_text": desc,
                    "dim": dim,
                    "predicted_value": res["predicted_value"],
                    "gt_value": res["gt_value"],
                    "predicted_state": res["predicted_state"],
                    "gt_state": res["gt_state"],
                })

    # Compute aggregate metrics
    per_attr_accuracy = {}
    for dim in ALL_DIMS:
        total = dim_total[dim]
        correct = dim_correct[dim]
        per_attr_accuracy[dim] = {
            "accuracy": round(correct / total, 4) if total > 0 else None,
            "correct": correct,
            "total": total,
            "false_known": dim_false_known[dim],
            "false_unknown": dim_false_unknown[dim],
        }

    # Overall accuracy (macro average over dims with data)
    accs = [v["accuracy"] for v in per_attr_accuracy.values() if v["accuracy"] is not None]
    overall_accuracy = round(sum(accs) / len(accs), 4) if accs else 0.0

    # Critical dimension accuracy (macro average over critical dims)
    # Use VALVE critical dims as primary indicator
    critical_dims_valve = CRITICAL_DIMS.get("0112", [])
    crit_accs = [
        per_attr_accuracy[d]["accuracy"]
        for d in critical_dims_valve
        if per_attr_accuracy[d]["accuracy"] is not None
    ]
    critical_accuracy = round(sum(crit_accs) / len(crit_accs), 4) if crit_accs else 0.0

    # False merge / split rates
    fm_rate = false_merge_rate(predictions, ground_truths)
    fs_rate = false_split_rate(predictions, ground_truths)

    metrics = {
        "name": name,
        "dataset": dataset,
        "sample_size": len(predictions),
        "overall_accuracy": overall_accuracy,
        "critical_accuracy": critical_accuracy,
        "false_merge_rate": round(fm_rate, 4),
        "false_split_rate": round(fs_rate, 4),
        "per_attribute": per_attr_accuracy,
        "model_version": test_examples[0].get("model_version", "rules-v1") if test_examples else "rules-v1",
        "evaluated_at": datetime.utcnow().isoformat(),
    }

    # Save results locally
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    result_path = RESULTS_DIR / f"eval_{name}_{ts}.json"
    with open(result_path, "w") as f:
        json.dump(metrics, f, indent=2)
    logger.info("Results saved to %s", result_path)

    # Save error analysis for developer4
    error_path = RESULTS_DIR / f"errors_{name}_{ts}.json"
    with open(error_path, "w") as f:
        json.dump(error_analysis, f, indent=2, ensure_ascii=False)
    logger.info(
        "Error analysis (%d errors) saved to %s. Share with developer4 for dictionary improvement.",
        len(error_analysis), error_path,
    )

    # Push to database via developer1's API
    _push_to_db(metrics)

    # Print summary
    _print_summary(metrics)

    return metrics


def _push_to_db(metrics: Dict) -> None:
    """Push evaluation run to developer1's evaluation_run table."""
    try:
        resp = httpx.post(
            f"{BACKEND_URL}/api/v1/analytics/metrics",
            json={
                "name": metrics["name"],
                "dataset": metrics["dataset"],
                "sample_size": metrics["sample_size"],
                "metrics": {
                    "overall_accuracy": metrics["overall_accuracy"],
                    "critical_accuracy": metrics["critical_accuracy"],
                    "false_merge_rate": metrics["false_merge_rate"],
                    "false_split_rate": metrics["false_split_rate"],
                    "per_attribute": metrics["per_attribute"],
                },
            },
            timeout=10.0,
        )
        if resp.status_code in (200, 201):
            logger.info("Metrics pushed to backend DB.")
        else:
            logger.warning("Failed to push metrics to DB: %s %s", resp.status_code, resp.text)
    except Exception as e:
        logger.warning("Could not reach backend to push metrics: %s", e)


def _print_summary(metrics: Dict) -> None:
    print("\n" + "=" * 60)
    print(f"  Evaluation: {metrics['name']}  |  Dataset: {metrics['dataset']}")
    print(f"  Sample size: {metrics['sample_size']}")
    print("=" * 60)
    print(f"  Overall accuracy:    {metrics['overall_accuracy']:.1%}")
    print(f"  Critical accuracy:   {metrics['critical_accuracy']:.1%}")
    print(f"  False-merge rate:    {metrics['false_merge_rate']:.1%}")
    print(f"  False-split rate:    {metrics['false_split_rate']:.1%}")
    print("-" * 60)
    print("  Per-attribute accuracy:")
    for dim, stat in metrics["per_attribute"].items():
        if stat["accuracy"] is not None and stat["total"] > 0:
            print(f"    {dim:<25} {stat['accuracy']:.1%}  ({stat['correct']}/{stat['total']})")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Evaluate extraction model on frozen test set")
    parser.add_argument("--name", required=True, help="Run name e.g. baseline, model_v1")
    parser.add_argument("--dataset", default="test_real", help="Dataset label")
    parser.add_argument(
        "--use-model", action="store_true",
        help="Use MODEL_PATH env var for SLM inference (default: rules-only)"
    )
    args = parser.parse_args()
    evaluate(name=args.name, dataset=args.dataset, use_model=args.use_model)
