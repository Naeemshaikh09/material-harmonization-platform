"""
SLM inference layer — Phase 2/3.
Wraps the fine-tuned small language model.

In Phase 1, this module is a stub that returns all UNKNOWN.
The rules extractor in extractor.py is the working baseline.

When a model is configured (MODEL_PATH env var is set and the file exists),
this module loads it and runs inference. Otherwise it returns empty results
and the service runs in rules-only mode.

Supported model types (set MODEL_TYPE env var):
  - "seq2seq"     : T5-style generative model (default)
  - "token_cls"   : Token classification encoder (BERT/DeBERTa style)
  - "causal"      : Causal LM with LoRA (Phi, Qwen, SmolLM style)

All model types return the same AttributeResult dict.
"""

from __future__ import annotations
import json
import logging
import os
from typing import Dict, Optional

try:
    from .schemas import AttributeResult
except ImportError:
    from schemas import AttributeResult

logger = logging.getLogger(__name__)

MODEL_PATH = os.environ.get("MODEL_PATH", "")
MODEL_TYPE = os.environ.get("MODEL_TYPE", "seq2seq")
SLM_VERSION = os.environ.get("MODEL_VERSION", "slm-v1")

_model = None
_tokenizer = None
_model_loaded = False


def _try_load_model() -> bool:
    """
    Attempt to load the model. Returns True if successful.
    Fails gracefully — service continues with rules-only mode.
    """
    global _model, _tokenizer, _model_loaded

    if not MODEL_PATH or not os.path.exists(MODEL_PATH):
        logger.info(
            "MODEL_PATH not set or does not exist ('%s'). "
            "Running in rules-only mode.",
            MODEL_PATH,
        )
        return False

    try:
        if MODEL_TYPE == "token_cls":
            _load_token_cls_model()
        elif MODEL_TYPE == "causal":
            _load_causal_model()
        else:
            _load_seq2seq_model()

        _model_loaded = True
        logger.info("Model loaded from %s (type=%s)", MODEL_PATH, MODEL_TYPE)
        return True

    except ImportError:
        logger.warning(
            "transformers not installed. Running in rules-only mode. "
            "Install with: pip install transformers torch"
        )
        return False
    except Exception as e:
        logger.warning("Failed to load model: %s. Running in rules-only mode.", e)
        return False


def _load_seq2seq_model() -> None:
    """Load a T5-style seq2seq model (e.g. fine-tuned flan-t5-small)."""
    global _model, _tokenizer
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM  # type: ignore
    _tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    _model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_PATH)
    _model.eval()


def _load_token_cls_model() -> None:
    """Load a token classification model (e.g. fine-tuned deberta-v3-small)."""
    global _model, _tokenizer
    from transformers import AutoTokenizer, AutoModelForTokenClassification  # type: ignore
    _tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    _model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
    _model.eval()


def _load_causal_model() -> None:
    """Load a causal LM with PEFT/LoRA (e.g. Qwen2.5, SmolLM2, Phi-3-mini)."""
    global _model, _tokenizer
    from transformers import AutoTokenizer, AutoModelForCausalLM  # type: ignore
    _tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)

    # Try loading with PEFT if available (LoRA adapters)
    try:
        from peft import PeftModel  # type: ignore
        base_model_name = os.environ.get("BASE_MODEL_NAME", "")
        if base_model_name:
            from transformers import AutoModelForCausalLM  # type: ignore
            base = AutoModelForCausalLM.from_pretrained(base_model_name)
            _model = PeftModel.from_pretrained(base, MODEL_PATH)
        else:
            _model = AutoModelForCausalLM.from_pretrained(MODEL_PATH)
    except ImportError:
        _model = AutoModelForCausalLM.from_pretrained(MODEL_PATH)

    _model.eval()


def is_model_available() -> bool:
    return _model_loaded


def _build_prompt(text: str, class_hint: Optional[str] = None) -> str:
    """
    Build the extraction prompt for causal / seq2seq models.
    Format matches the training data format built in ml/data/.
    """
    hint_str = f" The item class is {class_hint}." if class_hint else ""
    return (
        f"Extract material attributes from this industrial item description.{hint_str}\n"
        f"Description: {text}\n"
        f"Output JSON with keys: type, primary_size, length, thickness, material, "
        f"secondary_material, pressure, temperature, flow, electrical, mechanical_loading, "
        f"stiffness_hardness, connection, actuation, standard, protection, measurement, "
        f"coating, manufacturer_part, uom.\n"
        f"Each key has: value (string or null), unit (string or null), "
        f"confidence (0-1), source_span (string or null).\n"
        f"JSON:"
    )


def _parse_model_output(raw_output: str) -> Dict[str, AttributeResult]:
    """
    Parse the JSON output from the model into AttributeResult objects.
    Handles malformed output gracefully — bad attributes become UNKNOWN.
    """
    result: Dict[str, AttributeResult] = {}

    # Strip markdown code fences if present
    raw_output = raw_output.strip()
    if raw_output.startswith("```"):
        lines = raw_output.split("\n")
        raw_output = "\n".join(lines[1:-1]) if len(lines) > 2 else ""

    try:
        parsed = json.loads(raw_output)
    except json.JSONDecodeError:
        # Try to extract JSON object with regex fallback
        import re
        match = re.search(r"\{.*\}", raw_output, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
            except json.JSONDecodeError:
                return {}
        else:
            return {}

    for attr_name, attr_data in parsed.items():
        if not isinstance(attr_data, dict):
            continue
        try:
            value = attr_data.get("value")
            unit = attr_data.get("unit")
            confidence = float(attr_data.get("confidence", 0.0))
            source_span = attr_data.get("source_span")

            # Model outputs state KNOWN if value is not null, otherwise UNKNOWN
            state = "KNOWN" if value is not None else "UNKNOWN"

            result[attr_name] = AttributeResult(
                value=str(value) if value is not None else None,
                unit=str(unit) if unit is not None else None,
                state=state,
                confidence=confidence,
                source_span=str(source_span) if source_span is not None else None,
            )
        except Exception:
            # Malformed attribute — skip, rules will cover it
            continue

    return result


def _run_seq2seq(text: str, class_hint: Optional[str]) -> Dict[str, AttributeResult]:
    import torch  # type: ignore
    prompt = _build_prompt(text, class_hint)
    inputs = _tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
    with torch.no_grad():
        outputs = _model.generate(
            **inputs,
            max_new_tokens=512,
            num_beams=2,
            early_stopping=True,
        )
    raw = _tokenizer.decode(outputs[0], skip_special_tokens=True)
    return _parse_model_output(raw)


def _run_causal(text: str, class_hint: Optional[str]) -> Dict[str, AttributeResult]:
    import torch  # type: ignore
    prompt = _build_prompt(text, class_hint)
    inputs = _tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
    with torch.no_grad():
        outputs = _model.generate(
            **inputs,
            max_new_tokens=512,
            do_sample=False,
            temperature=1.0,
            pad_token_id=_tokenizer.eos_token_id,
        )
    # Causal LM returns prompt + completion
    full = _tokenizer.decode(outputs[0], skip_special_tokens=True)
    raw = full[len(prompt):].strip()
    return _parse_model_output(raw)


def _run_token_cls(text: str, class_hint: Optional[str]) -> Dict[str, AttributeResult]:
    """
    Token classification: maps BIO tags to attribute spans.
    Tag format: B-ATTR_NAME, I-ATTR_NAME, O
    e.g. B-primary_size, I-primary_size, B-material, etc.
    """
    import torch  # type: ignore
    inputs = _tokenizer(
        text, return_tensors="pt", max_length=256,
        truncation=True, return_offsets_mapping=True,
    )
    offset_mapping = inputs.pop("offset_mapping")[0].tolist()

    with torch.no_grad():
        logits = _model(**inputs).logits

    predictions = logits.argmax(dim=-1)[0].tolist()
    id2label = _model.config.id2label

    spans: Dict[str, list] = {}
    current_attr = None
    current_span_start = None

    for idx, (pred_id, (char_start, char_end)) in enumerate(zip(predictions, offset_mapping)):
        if char_start == char_end:  # special token
            current_attr = None
            continue
        label = id2label.get(pred_id, "O")
        if label.startswith("B-"):
            attr = label[2:]
            current_attr = attr
            current_span_start = char_start
            spans.setdefault(attr, [])
            spans[attr].append({"start": char_start, "end": char_end})
        elif label.startswith("I-") and current_attr == label[2:]:
            if spans.get(current_attr):
                spans[current_attr][-1]["end"] = char_end
        else:
            current_attr = None

    result: Dict[str, AttributeResult] = {}
    for attr, span_list in spans.items():
        if span_list:
            span = span_list[0]
            span_text = text[span["start"]:span["end"]].strip()
            result[attr] = AttributeResult(
                value=span_text,
                unit=None,
                state="KNOWN",
                confidence=0.85,  # token cls doesn't give per-token confidence easily
                source_span=span_text,
            )

    return result


def extract_with_model(
    text: str, class_hint: Optional[str] = None
) -> Dict[str, AttributeResult]:
    """
    Run inference with the SLM.
    Returns empty dict if no model is loaded (rules-only mode).
    """
    if not _model_loaded:
        return {}

    try:
        if MODEL_TYPE == "token_cls":
            return _run_token_cls(text, class_hint)
        elif MODEL_TYPE == "causal":
            return _run_causal(text, class_hint)
        else:
            return _run_seq2seq(text, class_hint)
    except Exception as e:
        logger.warning("Model inference failed: %s. Falling back to rules only.", e)
        return {}


# Load model at import time (non-blocking — falls back to rules if unavailable)
_try_load_model()
