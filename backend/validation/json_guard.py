import json
import re
from typing import Any, Dict, List, Optional, Tuple, Type

from pydantic import BaseModel, ValidationError

from validation.error_types import AffectedLayer, ErrorCategory, ValidationIssue


REQUIRED_ROOT_KEYS = {
    "project_name",
    "intent",
    "architecture",
    "db",
    "api",
    "ui",
    "auth",
    "rules",
}

ALLOWED_ROOT_KEYS = REQUIRED_ROOT_KEYS | {"json_dump"}


def parse_json_text(raw: str) -> Tuple[Optional[Any], List[ValidationIssue]]:
    """Parse raw LLM text; detect invalid JSON and markdown wrappers."""
    issues: List[ValidationIssue] = []
    text = (raw or "").strip()

    if not text:
        issues.append(
            ValidationIssue(
                category=ErrorCategory.INVALID_JSON,
                layer=AffectedLayer.ROOT,
                message="Empty response — expected JSON object",
                auto_fixable=False,
            )
        )
        return None, issues

    if text.startswith("```"):
        text = _strip_markdown_fence(text)

    try:
        return json.loads(text), issues
    except json.JSONDecodeError as exc:
        issues.append(
            ValidationIssue(
                category=ErrorCategory.INVALID_JSON,
                layer=AffectedLayer.ROOT,
                message=f"Malformed JSON at line {exc.lineno}, column {exc.colno}: {exc.msg}",
                field_path=f"line {exc.lineno}",
                auto_fixable=False,
            )
        )
        return None, issues


def validate_model(data: Any, model: Type[BaseModel], layer: AffectedLayer) -> Tuple[Optional[BaseModel], List[ValidationIssue]]:
    """Validate parsed dict against a Pydantic model; map errors to categories."""
    issues: List[ValidationIssue] = []

    if not isinstance(data, dict):
        issues.append(
            ValidationIssue(
                category=ErrorCategory.INVALID_JSON,
                layer=layer,
                message=f"Expected JSON object for {layer.value}, got {type(data).__name__}",
                auto_fixable=False,
            )
        )
        return None, issues

    try:
        return model.model_validate(data), issues
    except ValidationError as exc:
        for err in exc.errors():
            loc = ".".join(str(part) for part in err.get("loc", ()))
            err_type = err.get("type", "")
            category = _map_pydantic_error(err_type)
            issues.append(
                ValidationIssue(
                    category=category,
                    layer=layer,
                    message=err.get("msg", "Validation failed"),
                    field_path=loc or None,
                    auto_fixable=category == ErrorCategory.MISSING_KEY,
                )
            )
        return None, issues


def detect_root_key_issues(data: Dict[str, Any]) -> List[ValidationIssue]:
    """Flag missing required keys and hallucinated top-level fields."""
    issues: List[ValidationIssue] = []

    for key in REQUIRED_ROOT_KEYS:
        if key not in data:
            issues.append(
                ValidationIssue(
                    category=ErrorCategory.MISSING_KEY,
                    layer=AffectedLayer.ROOT,
                    message=f"Required key '{key}' is missing",
                    field_path=key,
                    auto_fixable=False,
                )
            )

    for key in data:
        if key not in ALLOWED_ROOT_KEYS:
            issues.append(
                ValidationIssue(
                    category=ErrorCategory.HALLUCINATED_FIELD,
                    layer=AffectedLayer.ROOT,
                    message=f"Unknown top-level field '{key}' is not part of AppConfig",
                    field_path=key,
                    auto_fixable=True,
                )
            )

    return issues


def strip_hallucinated_keys(data: Dict[str, Any], allowed: set[str]) -> Dict[str, Any]:
    return {k: v for k, v in data.items() if k in allowed}


def _strip_markdown_fence(text: str) -> str:
    if text.startswith("```json"):
        text = text.split("```json", 1)[-1]
    elif text.startswith("```"):
        text = text.split("```", 1)[-1]
    return text.split("```")[0].strip()


def _map_pydantic_error(err_type: str) -> ErrorCategory:
    if err_type in {"missing", "missing_field"}:
        return ErrorCategory.MISSING_KEY
    if err_type in {"extra_forbidden", "extra"}:
        return ErrorCategory.HALLUCINATED_FIELD
    if err_type in {"value_error", "type_error", "string_type", "list_type", "dict_type"}:
        return ErrorCategory.SCHEMA_MISMATCH
    return ErrorCategory.SCHEMA_MISMATCH


def normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())
