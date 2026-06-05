from dataclasses import dataclass, asdict
from enum import Enum
from typing import Any, Dict, List, Optional


class ErrorCategory(str, Enum):
    INVALID_JSON = "invalid_json"
    MISSING_KEY = "missing_key"
    HALLUCINATED_FIELD = "hallucinated_field"
    SCHEMA_MISMATCH = "schema_mismatch"
    LOGICAL_INCONSISTENCY = "logical_inconsistency"


class AffectedLayer(str, Enum):
    ROOT = "root"
    ARCHITECTURE = "architecture"
    DB = "db"
    API = "api"
    UI = "ui"
    AUTH = "auth"
    RULES = "rules"
    CROSS_LAYER = "cross_layer"


@dataclass
class ValidationIssue:
    category: ErrorCategory
    layer: AffectedLayer
    message: str
    field_path: Optional[str] = None
    auto_fixable: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "category": self.category.value,
            "layer": self.layer.value,
            "message": self.message,
            "field_path": self.field_path,
            "auto_fixable": self.auto_fixable,
        }


def issues_for_layer(issues: List[ValidationIssue], layer: AffectedLayer) -> List[ValidationIssue]:
    return [i for i in issues if i.layer == layer]


def layers_needing_repair(issues: List[ValidationIssue]) -> List[AffectedLayer]:
    order = [
        AffectedLayer.ARCHITECTURE,
        AffectedLayer.DB,
        AffectedLayer.API,
        AffectedLayer.UI,
        AffectedLayer.AUTH,
        AffectedLayer.RULES,
        AffectedLayer.ROOT,
        AffectedLayer.CROSS_LAYER,
    ]
    affected = {i.layer for i in issues}
    return [layer for layer in order if layer in affected]


def format_issue(issue: ValidationIssue) -> str:
    prefix = f"[{issue.category.value}]"
    if issue.field_path:
        return f"{prefix} {issue.field_path}: {issue.message}"
    return f"{prefix} {issue.message}"
