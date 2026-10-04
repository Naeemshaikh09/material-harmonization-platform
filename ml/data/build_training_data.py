"""
Training data pipeline — developer2.

Converts developer4's labelled extraction sets and synthetic variants
into (input_text, output_json) pairs for model fine-tuning.

Input files (from developer4):
  data/labelled/extraction_<category>.json  — hand-labelled descriptions
  data/synthetic/variants_<category>.json   — messy auto-generated variants

Output files (in ml/train/):
  train.jsonl   — training split
  dev.jsonl     — development/validation split
  test.jsonl    — held-out test split (NEVER used for training)

IMPORTANT:
  - Split is by ITEM, not by pair or variant.
  - The test split is frozen once created. Never retrain on test data.
  - Splits are written once and locked by a manifest file.
  - If the manifest exists, splits are NOT regenerated (frozen).
"""

from __future__ import annotations
import hashlib
import json
import logging
import os
import random
from pathlib import Path
from typing import Dict, List, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Paths
REPO_ROOT = Path(__file__).resolve().parents[2]
LABELLED_DIR = REPO_ROOT / "data" / "labelled"
SYNTHETIC_DIR = REPO_ROOT / "data" / "synthetic"
OUTPUT_DIR = REPO_ROOT / "ml" / "train"
MANIFEST_PATH = OUTPUT_DIR / "split_manifest.json"

# Split ratios
TRAIN_RATIO = 0.70
DEV_RATIO = 0.15
TEST_RATIO = 0.15

RANDOM_SEED = 42


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_labelled(category: str) -> List[Dict]:
    """
    Load developer4's labelled extraction set for a category.

    Expected file format (data/labelled/extraction_valve.json):
    [
      {
        "item_id": "V001",
        "raw_text": "BALL VLV 2IN CL150 SS316 FLG",
        "attributes": {
          "type": {"value": "BALL", "unit": null, "state": "KNOWN", "source_span": "BALL"},
          "primary_size": {"value": "50", "unit": "MM", "state": "KNOWN", "source_span": "2IN"},
          ...
        },
        "class_code": "0112",
        "subclass_code": "0003"
      },
      ...
    ]
    """
    fpath = LABELLED_DIR / f"extraction_{category}.json"
    if not fpath.exists():
        logger.warning("Labelled file not found: %s", fpath)
        return []
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    logger.info("Loaded %d labelled items for category '%s'", len(data), category)
    return data


def load_synthetic_variants(category: str) -> List[Dict]:
    """
    Load developer4's synthetic messy variants.

    Expected file format (data/synthetic/variants_valve.json):
    [
      {
        "item_id": "V001",          <- same item_id as labelled set
        "raw_text": "VLV BALL 2\" 150# SS 316 FLGD",   <- messy variant
        "attributes": { ... }       <- same ground truth attributes
      },
      ...
    ]
    """
    fpath = SYNTHETIC_DIR / f"variants_{category}.json"
    if not fpath.exists():
        logger.warning("Synthetic variants file not found: %s", fpath)
        return []
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    logger.info("Loaded %d synthetic variants for category '%s'", len(data), category)
    return data


# ---------------------------------------------------------------------------
# Example formatting
# ---------------------------------------------------------------------------

def _attr_to_output(attributes: Dict) -> Dict:
    """
    Convert attributes dict to model output format.
    Only includes KNOWN attributes in training target.
    Model should predict value=null for UNKNOWN.
    """
    output = {}
    for attr_name, attr_data in attributes.items():
        if isinstance(attr_data, dict):
            output[attr_name] = {
                "value": attr_data.get("value"),
                "unit": attr_data.get("unit"),
                "confidence": 1.0 if attr_data.get("state") == "KNOWN" else 0.0,
                "source_span": attr_data.get("source_span"),
            }
    return output


def format_example(item: Dict, include_class_hint: bool = False) -> Dict:
    """
    Format one labelled item into a training example.

    Returns:
      {
        "item_id": "V001",
        "input": "Extract material attributes from: BALL VLV 2IN CL150 SS316 FLG",
        "output": "{\"type\": {\"value\": \"BALL\", ...}, ...}",
        "class_code": "0112",
        "split": null   <- filled in later
      }
    """
    class_hint = ""
    if include_class_hint and item.get("class_code"):
        # Map class code to name for prompt
        _class_names = {
            "0112": "VALVE", "0210": "PIPE",
            "0211": "PIPE FITTING", "0312": "BEARING",
        }
        cn = _class_names.get(item["class_code"], item["class_code"])
        class_hint = f" The item class is {cn}."

    input_text = (
        f"Extract material attributes from this industrial item description.{class_hint}\n"
        f"Description: {item['raw_text']}\n"
        f"Output JSON with keys: type, primary_size, length, thickness, material, "
        f"secondary_material, pressure, temperature, flow, electrical, mechanical_loading, "
        f"stiffness_hardness, connection, actuation, standard, protection, measurement, "
        f"coating, manufacturer_part, uom.\n"
        f"Each key has: value (string or null), unit (string or null), "
        f"confidence (0-1), source_span (string or null).\n"
        f"JSON:"
    )

    output_json = json.dumps(_attr_to_output(item.get("attributes", {})), ensure_ascii=False)

    return {
        "item_id": item.get("item_id", ""),
        "input": input_text,
        "output": output_json,
        "class_code": item.get("class_code"),
        "subclass_code": item.get("subclass_code"),
    }


# ---------------------------------------------------------------------------
# Split logic — by item, not by example
# ---------------------------------------------------------------------------

def split_by_item(items: List[Dict], seed: int = RANDOM_SEED) -> Dict[str, List[str]]:
    """
    Assign each unique item_id to a split.
    All variants of the same item go to the same split.
    Returns {"train": [...item_ids], "dev": [...], "test": [...]}
    """
    item_ids = list({item["item_id"] for item in items})
    rng = random.Random(seed)
    rng.shuffle(item_ids)

    n = len(item_ids)
    n_test = max(1, int(n * TEST_RATIO))
    n_dev = max(1, int(n * DEV_RATIO))
    n_train = n - n_test - n_dev

    return {
        "train": item_ids[:n_train],
        "dev": item_ids[n_train:n_train + n_dev],
        "test": item_ids[n_train + n_dev:],
    }


def _manifest_hash(items: List[Dict]) -> str:
    """Deterministic hash of item IDs — detects if labelled set changed."""
    ids = sorted({item["item_id"] for item in items})
    return hashlib.sha256(json.dumps(ids).encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Main build
# ---------------------------------------------------------------------------

def build(categories: Optional[List[str]] = None, force: bool = False) -> None:
    """
    Build training, dev, and test splits.

    Args:
        categories: list of category names to include. Default: all found files.
        force: if True, regenerate even if manifest exists (use carefully — invalidates frozen test set).
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if categories is None:
        # Auto-discover
        categories = []
        for fpath in LABELLED_DIR.glob("extraction_*.json"):
            cat = fpath.stem.replace("extraction_", "")
            categories.append(cat)
        if not categories:
            logger.error(
                "No labelled data files found in %s. "
                "developer4 needs to deliver extraction_<category>.json files.",
                LABELLED_DIR,
            )
            return

    logger.info("Building training data for categories: %s", categories)

    all_labelled: List[Dict] = []
    all_synthetic: List[Dict] = []

    for cat in categories:
        all_labelled.extend(load_labelled(cat))
        all_synthetic.extend(load_synthetic_variants(cat))

    if not all_labelled:
        logger.error("No labelled data loaded. Cannot build training set.")
        return

    all_items = all_labelled + all_synthetic
    current_hash = _manifest_hash(all_labelled)  # hash labelled only (ground truth)

    # Check if frozen splits already exist
    if MANIFEST_PATH.exists() and not force:
        with open(MANIFEST_PATH, "r") as f:
            manifest = json.load(f)
        if manifest.get("hash") == current_hash:
            logger.info(
                "Splits already frozen (hash match). "
                "Use force=True to regenerate. "
                "WARNING: this would invalidate the test set."
            )
            return
        else:
            logger.warning(
                "Labelled data changed (hash mismatch). Regenerating splits. "
                "Test set will be different — update evaluation accordingly."
            )

    # Create splits by item
    splits = split_by_item(all_labelled)  # split by labelled items only
    logger.info(
        "Split sizes — train: %d, dev: %d, test: %d item IDs",
        len(splits["train"]), len(splits["dev"]), len(splits["test"])
    )

    # Assign split to each example (labelled + synthetic)
    item_to_split = {}
    for split_name, item_ids in splits.items():
        for iid in item_ids:
            item_to_split[iid] = split_name

    split_examples: Dict[str, List[Dict]] = {"train": [], "dev": [], "test": []}

    for item in all_items:
        iid = item.get("item_id", "")
        split_name = item_to_split.get(iid)
        if split_name is None:
            # Synthetic item with no matching labelled item_id — goes to train
            split_name = "train"
        example = format_example(item)
        example["split"] = split_name
        split_examples[split_name].append(example)

    # Write JSONL files
    for split_name, examples in split_examples.items():
        out_path = OUTPUT_DIR / f"{split_name}.jsonl"
        with open(out_path, "w", encoding="utf-8") as f:
            for ex in examples:
                f.write(json.dumps(ex, ensure_ascii=False) + "\n")
        logger.info("Wrote %d examples to %s", len(examples), out_path)

    # Write manifest (freezes the split)
    manifest = {
        "hash": current_hash,
        "categories": categories,
        "split_counts": {k: len(v) for k, v in split_examples.items()},
        "item_id_counts": {k: len(v) for k, v in splits.items()},
        "total_examples": sum(len(v) for v in split_examples.values()),
    }
    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)
    logger.info("Split manifest written to %s", MANIFEST_PATH)
    logger.info("Training data build complete.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Build training data splits")
    parser.add_argument("--categories", nargs="+", help="Categories to include")
    parser.add_argument(
        "--force", action="store_true",
        help="Force regeneration even if splits are frozen (invalidates test set)"
    )
    args = parser.parse_args()
    build(categories=args.categories, force=args.force)
