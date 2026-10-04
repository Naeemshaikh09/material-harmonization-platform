"""
Model fine-tuning script — developer2.

Trains a small language model on the extraction task.
Reads from ml/train/train.jsonl and ml/train/dev.jsonl.
NEVER reads test.jsonl.

Supported model types (set via --model-type):
  seq2seq   : T5-style (default, recommended for structured output)
  causal    : Causal LM with LoRA (Phi-3-mini, Qwen2.5, SmolLM2)
  token_cls : Token classification (BERT/DeBERTa)

Usage:
  python -m ml.train.train --model-type seq2seq --base-model google/flan-t5-small
  python -m ml.train.train --model-type causal --base-model Qwen/Qwen2.5-0.5B-Instruct
  python -m ml.train.train --model-type token_cls --base-model microsoft/deberta-v3-small

Output:
  ml/train/output/<model-type>-<timestamp>/   <- model weights (set as MODEL_PATH)

Memory guide (pick what fits your laptop):
  flan-t5-small         : ~300MB  — fits any machine
  flan-t5-base          : ~900MB  — fits 8GB RAM
  Qwen2.5-0.5B          : ~1GB    — fits 8GB RAM, use LoRA
  SmolLM2-1.7B          : ~3.4GB  — needs 8GB+ RAM with LoRA
  Phi-3-mini (3.8B)     : ~7GB    — needs 16GB RAM with QLoRA
  deberta-v3-small      : ~140MB  — very fast, good for token_cls
"""

from __future__ import annotations
import argparse
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
TRAIN_DATA = REPO_ROOT / "ml" / "train" / "train.jsonl"
DEV_DATA = REPO_ROOT / "ml" / "train" / "dev.jsonl"
OUTPUT_BASE = REPO_ROOT / "ml" / "train" / "output"


def load_jsonl(path: Path) -> List[Dict]:
    examples = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                examples.append(json.loads(line))
    return examples


# ---------------------------------------------------------------------------
# Seq2Seq training (T5-style) — recommended starting point
# ---------------------------------------------------------------------------

def train_seq2seq(
    base_model: str,
    output_dir: Path,
    epochs: int,
    batch_size: int,
    lr: float,
    max_input_len: int,
    max_output_len: int,
) -> None:
    try:
        from transformers import (  # type: ignore
            AutoTokenizer, AutoModelForSeq2SeqLM,
            Seq2SeqTrainer, Seq2SeqTrainingArguments,
            DataCollatorForSeq2Seq,
        )
        import torch  # type: ignore
        from torch.utils.data import Dataset  # type: ignore
    except ImportError:
        logger.error("Install: pip install transformers torch datasets")
        raise

    logger.info("Loading base model: %s", base_model)
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    model = AutoModelForSeq2SeqLM.from_pretrained(base_model)

    train_examples = load_jsonl(TRAIN_DATA)
    dev_examples = load_jsonl(DEV_DATA)
    logger.info("Train: %d, Dev: %d examples", len(train_examples), len(dev_examples))

    class ExtractionDataset(Dataset):
        def __init__(self, examples: List[Dict]) -> None:
            self.examples = examples

        def __len__(self) -> int:
            return len(self.examples)

        def __getitem__(self, idx: int) -> Dict:
            ex = self.examples[idx]
            model_inputs = tokenizer(
                ex["input"],
                max_length=max_input_len,
                truncation=True,
                padding=False,
            )
            with tokenizer.as_target_tokenizer():
                labels = tokenizer(
                    ex["output"],
                    max_length=max_output_len,
                    truncation=True,
                    padding=False,
                )
            model_inputs["labels"] = labels["input_ids"]
            return model_inputs

    train_dataset = ExtractionDataset(train_examples)
    dev_dataset = ExtractionDataset(dev_examples)

    data_collator = DataCollatorForSeq2Seq(tokenizer, model=model, padding=True)

    training_args = Seq2SeqTrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=lr,
        warmup_ratio=0.1,
        weight_decay=0.01,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        predict_with_generate=True,
        generation_max_length=max_output_len,
        logging_steps=50,
        fp16=torch.cuda.is_available(),
        report_to="none",
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=dev_dataset,
        tokenizer=tokenizer,
        data_collator=data_collator,
    )

    logger.info("Starting seq2seq training...")
    trainer.train()
    trainer.save_model(str(output_dir / "final"))
    tokenizer.save_pretrained(str(output_dir / "final"))
    logger.info("Model saved to %s", output_dir / "final")


# ---------------------------------------------------------------------------
# Causal LM with LoRA
# ---------------------------------------------------------------------------

def train_causal_lora(
    base_model: str,
    output_dir: Path,
    epochs: int,
    batch_size: int,
    lr: float,
    max_input_len: int,
    max_output_len: int,
) -> None:
    try:
        from transformers import (  # type: ignore
            AutoTokenizer, AutoModelForCausalLM,
            TrainingArguments, Trainer, DataCollatorForLanguageModeling,
        )
        from peft import LoraConfig, get_peft_model, TaskType  # type: ignore
        import torch  # type: ignore
        from torch.utils.data import Dataset  # type: ignore
    except ImportError:
        logger.error("Install: pip install transformers torch peft")
        raise

    logger.info("Loading causal base model: %s", base_model)
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        torch_dtype="auto",
        device_map="auto" if os.environ.get("USE_GPU", "0") == "1" else "cpu",
    )

    # LoRA config — small rank for efficiency
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=8,
        lora_alpha=16,
        lora_dropout=0.05,
        target_modules=["q_proj", "v_proj"],  # adjust for specific model
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    train_examples = load_jsonl(TRAIN_DATA)
    dev_examples = load_jsonl(DEV_DATA)

    class CausalDataset(Dataset):
        def __init__(self, examples: List[Dict]) -> None:
            self.examples = examples

        def __len__(self) -> int:
            return len(self.examples)

        def __getitem__(self, idx: int) -> Dict:
            ex = self.examples[idx]
            # Full sequence: input + output (causal LM trains on completion)
            full_text = ex["input"] + " " + ex["output"] + tokenizer.eos_token
            encoded = tokenizer(
                full_text,
                max_length=max_input_len + max_output_len,
                truncation=True,
                padding=False,
            )
            # Mask input tokens in labels so we only train on the output
            input_len = len(tokenizer(ex["input"])["input_ids"])
            labels = list(encoded["input_ids"])
            for i in range(min(input_len, len(labels))):
                labels[i] = -100  # ignore loss on input tokens
            encoded["labels"] = labels
            return encoded

    train_dataset = CausalDataset(train_examples)
    dev_dataset = CausalDataset(dev_examples)

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=lr,
        warmup_ratio=0.1,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        logging_steps=50,
        fp16=False,  # use bf16 on supported hardware
        bf16=False,
        report_to="none",
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=dev_dataset,
        data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
    )

    logger.info("Starting causal LM + LoRA training...")
    trainer.train()
    model.save_pretrained(str(output_dir / "final"))
    tokenizer.save_pretrained(str(output_dir / "final"))
    logger.info("LoRA adapters saved to %s", output_dir / "final")


# ---------------------------------------------------------------------------
# Token classification (BERT/DeBERTa)
# ---------------------------------------------------------------------------

# BIO tag set for the 20 dimensions
BIO_LABELS = ["O"]
for dim in [
    "type", "primary_size", "length", "thickness", "material",
    "secondary_material", "pressure", "temperature", "flow",
    "electrical", "mechanical_loading", "stiffness_hardness",
    "connection", "actuation", "standard", "protection",
    "measurement", "coating", "manufacturer_part", "uom",
]:
    BIO_LABELS.append(f"B-{dim}")
    BIO_LABELS.append(f"I-{dim}")

LABEL2ID = {label: i for i, label in enumerate(BIO_LABELS)}
ID2LABEL = {i: label for label, i in LABEL2ID.items()}


def _build_bio_labels_from_example(
    text: str, attributes: Dict, tokenizer
) -> List[int]:
    """
    Build BIO label sequence for a piece of text given known source spans.
    Falls back to O for tokens not matched to any span.
    """
    tokens = tokenizer(text, return_offsets_mapping=True)
    offsets = tokens["offset_mapping"]
    labels = [LABEL2ID["O"]] * len(offsets)

    for attr_name, attr_data in attributes.items():
        if not isinstance(attr_data, dict):
            continue
        if attr_data.get("state") != "KNOWN":
            continue
        span = attr_data.get("source_span")
        if not span:
            continue
        # Find span in text (simple search)
        start = text.find(span)
        if start == -1:
            continue
        end = start + len(span)

        first_token = True
        for i, (tok_start, tok_end) in enumerate(offsets):
            if tok_start >= start and tok_end <= end:
                if first_token:
                    labels[i] = LABEL2ID.get(f"B-{attr_name}", LABEL2ID["O"])
                    first_token = False
                else:
                    labels[i] = LABEL2ID.get(f"I-{attr_name}", LABEL2ID["O"])

    return labels


def train_token_cls(
    base_model: str,
    output_dir: Path,
    epochs: int,
    batch_size: int,
    lr: float,
    max_input_len: int,
    **_kwargs,
) -> None:
    try:
        from transformers import (  # type: ignore
            AutoTokenizer, AutoModelForTokenClassification,
            TrainingArguments, Trainer, DataCollatorForTokenClassification,
        )
        import torch  # type: ignore
        from torch.utils.data import Dataset  # type: ignore
    except ImportError:
        logger.error("Install: pip install transformers torch")
        raise

    logger.info("Loading token classification base model: %s", base_model)
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    model = AutoModelForTokenClassification.from_pretrained(
        base_model,
        num_labels=len(BIO_LABELS),
        id2label=ID2LABEL,
        label2id=LABEL2ID,
        ignore_mismatched_sizes=True,
    )

    train_examples = load_jsonl(TRAIN_DATA)
    dev_examples = load_jsonl(DEV_DATA)

    class TokenClsDataset(Dataset):
        def __init__(self, examples: List[Dict]) -> None:
            # Extract raw description from the formatted prompt
            self.items = []
            for ex in examples:
                # Parse the output JSON to get attributes with source spans
                try:
                    attrs = json.loads(ex["output"])
                except Exception:
                    continue
                # Extract just the description line from the prompt
                lines = ex["input"].split("\n")
                desc_line = next(
                    (l for l in lines if l.startswith("Description:")), None
                )
                if not desc_line:
                    continue
                desc = desc_line.replace("Description:", "").strip()
                self.items.append((desc, attrs))

        def __len__(self) -> int:
            return len(self.items)

        def __getitem__(self, idx: int) -> Dict:
            text, attrs = self.items[idx]
            encoded = tokenizer(
                text,
                max_length=max_input_len,
                truncation=True,
                padding=False,
                return_offsets_mapping=True,
            )
            labels = _build_bio_labels_from_example(text, attrs, tokenizer)
            # Trim or pad labels to match tokenized length
            labels = labels[:len(encoded["input_ids"])]
            while len(labels) < len(encoded["input_ids"]):
                labels.append(LABEL2ID["O"])
            encoded.pop("offset_mapping")
            encoded["labels"] = labels
            return encoded

    train_dataset = TokenClsDataset(train_examples)
    dev_dataset = TokenClsDataset(dev_examples)

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=lr,
        warmup_ratio=0.1,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        logging_steps=50,
        report_to="none",
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=dev_dataset,
        data_collator=DataCollatorForTokenClassification(tokenizer),
    )

    logger.info("Starting token classification training...")
    trainer.train()
    trainer.save_model(str(output_dir / "final"))
    tokenizer.save_pretrained(str(output_dir / "final"))
    logger.info("Model saved to %s", output_dir / "final")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Fine-tune extraction model")
    parser.add_argument(
        "--model-type", choices=["seq2seq", "causal", "token_cls"],
        default="seq2seq", help="Model architecture"
    )
    parser.add_argument(
        "--base-model", default="google/flan-t5-small",
        help="HuggingFace model name or local path"
    )
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=5e-4)
    parser.add_argument("--max-input-len", type=int, default=256)
    parser.add_argument("--max-output-len", type=int, default=512)
    args = parser.parse_args()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = OUTPUT_BASE / f"{args.model_type}-{timestamp}"
    output_dir.mkdir(parents=True, exist_ok=True)

    if not TRAIN_DATA.exists():
        logger.error(
            "Training data not found at %s. "
            "Run: python -m ml.data.build_training_data first.",
            TRAIN_DATA,
        )
        return

    kwargs = dict(
        base_model=args.base_model,
        output_dir=output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        max_input_len=args.max_input_len,
        max_output_len=args.max_output_len,
    )

    if args.model_type == "seq2seq":
        train_seq2seq(**kwargs)
    elif args.model_type == "causal":
        train_causal_lora(**kwargs)
    elif args.model_type == "token_cls":
        train_token_cls(**kwargs)

    # Write run config for reproducibility
    config_path = output_dir / "train_config.json"
    with open(config_path, "w") as f:
        json.dump(vars(args), f, indent=2)
    logger.info("Training config saved to %s", config_path)
    logger.info(
        "Set MODEL_PATH=%s and MODEL_TYPE=%s in your environment to use this model.",
        output_dir / "final", args.model_type,
    )


if __name__ == "__main__":
    main()
