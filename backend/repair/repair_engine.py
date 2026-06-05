import copy
from typing import Any, Dict, List, Optional, Type

from pydantic import BaseModel

from schemas.app_config import AppConfig, ArchitectureSchema
from schemas.database import DBSchema, DBColumn, DBTable
from schemas.api import APISchema
from schemas.ui import UISchema
from schemas.auth import AuthSchema, AuthRole, Permission
from schemas.business_rules import RulesSchema
from llm.base_provider import BaseLLMProvider
from validation.error_types import (
    AffectedLayer,
    ErrorCategory,
    ValidationIssue,
    layers_needing_repair,
)
from validation.json_guard import ALLOWED_ROOT_KEYS, normalize_name


LAYER_MODELS: Dict[AffectedLayer, Type[BaseModel]] = {
    AffectedLayer.ARCHITECTURE: ArchitectureSchema,
    AffectedLayer.DB: DBSchema,
    AffectedLayer.API: APISchema,
    AffectedLayer.UI: UISchema,
    AffectedLayer.AUTH: AuthSchema,
    AffectedLayer.RULES: RulesSchema,
}

MAX_REPAIR_ROUNDS = 3


class RepairEngine:
    def __init__(self, llm_provider: BaseLLMProvider):
        self.llm = llm_provider
        self.history: List[Dict[str, Any]] = []

    async def repair(
        self,
        config: AppConfig,
        validation_result: Dict[str, Any],
    ) -> AppConfig:
        issues = self._issues_from_result(validation_result)
        if not issues:
            return config

        repaired = copy.deepcopy(config)
        deterministic_actions = self._apply_deterministic_fixes(repaired, issues)
        for action in deterministic_actions:
            self.history.append(action)

        remaining_layers = layers_needing_repair(issues)
        for layer in remaining_layers:
            layer_issues = [i for i in issues if i.layer in (layer, AffectedLayer.CROSS_LAYER)]
            if not layer_issues:
                continue
            if layer not in LAYER_MODELS:
                continue

            segment = await self._regenerate_layer(repaired, layer, layer_issues)
            if segment is not None:
                self._apply_layer(repaired, layer, segment)

        return repaired

    async def repair_until_valid(
        self,
        config: AppConfig,
        validator,
    ) -> tuple[AppConfig, Dict[str, Any]]:
        """Run deterministic + targeted LLM repair in a loop (not full blind retry)."""
        current = config
        last_result = validator.validate(current)

        for round_num in range(1, MAX_REPAIR_ROUNDS + 1):
            if last_result["is_valid"]:
                break

            self.history.append({
                "round": round_num,
                "errors_before": last_result["errors"],
                "layers_affected": last_result.get("layers_affected", []),
            })

            current = await self.repair(current, last_result)
            last_result = validator.validate(current)

            self.history.append({
                "round": round_num,
                "errors_after": last_result["errors"],
                "score_after": last_result["score"],
                "is_valid": last_result["is_valid"],
            })

            if last_result["is_valid"]:
                break

        return current, last_result

    def _issues_from_result(self, validation_result: Dict[str, Any]) -> List[ValidationIssue]:
        raw = validation_result.get("issues", [])
        issues = []
        for item in raw:
            issues.append(
                ValidationIssue(
                    category=ErrorCategory(item["category"]),
                    layer=AffectedLayer(item["layer"]),
                    message=item["message"],
                    field_path=item.get("field_path"),
                    auto_fixable=item.get("auto_fixable", False),
                )
            )
        if not issues and validation_result.get("errors"):
            for msg in validation_result["errors"]:
                issues.append(
                    ValidationIssue(
                        category=ErrorCategory.LOGICAL_INCONSISTENCY,
                        layer=AffectedLayer.CROSS_LAYER,
                        message=msg,
                    )
                )
        return issues

    def _apply_deterministic_fixes(
        self,
        config: AppConfig,
        issues: List[ValidationIssue],
    ) -> List[Dict[str, Any]]:
        actions: List[Dict[str, Any]] = []

        # Auth matrix: drop unknown roles OR create stub roles
        defined_roles = {r.name for r in config.auth.roles}
        for role_name in list(config.auth.matrix.keys()):
            if role_name not in defined_roles:
                config.auth.roles.append(AuthRole(name=role_name, permissions=[]))
                actions.append({
                    "repair_action": f"Created stub role '{role_name}' for matrix entry",
                    "layer": "auth",
                    "strategy": "deterministic",
                })

        # Auth: strip permissions referencing unknown resources (keep role)
        known = self._known_resources(config)
        for role in config.auth.roles:
            before = len(role.permissions)
            role.permissions = [
                p for p in role.permissions
                if self._resource_exists(p.resource, known)
            ]
            if len(role.permissions) < before:
                actions.append({
                    "repair_action": f"Removed hallucinated permissions from role '{role.name}'",
                    "layer": "auth",
                    "strategy": "deterministic",
                })

        # DB: ensure primary key on tables missing one
        for table in config.db.tables:
            if table.columns and not any(c.primary_key for c in table.columns):
                table.columns[0].primary_key = True
                actions.append({
                    "repair_action": f"Assigned primary key to '{table.columns[0].name}' on table '{table.name}'",
                    "layer": "db",
                    "strategy": "deterministic",
                })

        # DB: fix invalid FK references by clearing them
        table_columns = {t.name: {c.name for c in t.columns} for t in config.db.tables}
        table_names = list(table_columns.keys())
        for table in config.db.tables:
            for col in table.columns:
                if not col.references or "." not in col.references:
                    continue
                ref_table, ref_col = col.references.split(".", 1)
                if ref_table not in table_names or ref_col not in table_columns.get(ref_table, set()):
                    col.references = None
                    actions.append({
                        "repair_action": f"Cleared invalid FK on {table.name}.{col.name}",
                        "layer": "db",
                        "strategy": "deterministic",
                    })

        # API: prefix paths missing leading slash
        for endpoint in config.api.endpoints:
            if endpoint.path and not endpoint.path.startswith("/"):
                endpoint.path = f"/{endpoint.path}"
                actions.append({
                    "repair_action": f"Fixed API path to '{endpoint.path}'",
                    "layer": "api",
                    "strategy": "deterministic",
                })

        # UI: remove broken data_source references
        endpoint_paths = {e.path for e in config.api.endpoints}
        for page in config.ui.pages:
            for comp in page.components:
                if comp.type == "Table" and comp.props:
                    ds = comp.props.get("data_source")
                    if ds and ds not in endpoint_paths:
                        comp.props.pop("data_source", None)
                        actions.append({
                            "repair_action": f"Removed invalid data_source '{ds}' from page '{page.name}'",
                            "layer": "ui",
                            "strategy": "deterministic",
                        })

        return actions

    async def _regenerate_layer(
        self,
        config: AppConfig,
        layer: AffectedLayer,
        issues: List[ValidationIssue],
    ) -> Optional[BaseModel]:
        model = LAYER_MODELS[layer]
        current_segment = self._get_layer_data(config, layer)
        error_lines = "\n".join(f"- [{i.category}] {i.message}" for i in issues)

        context = {
            "project_name": config.project_name,
            "intent": config.intent,
            "architecture": config.architecture.model_dump(),
            "db": config.db.model_dump(),
            "api": config.api.model_dump(),
        }

        prompt = f"""
        DELTA REPAIR — regenerate ONLY the '{layer.value}' segment of an AppConfig.
        Do NOT change unrelated layers. Fix the listed validation errors precisely.

        Validation errors to fix:
        {error_lines}

        Project context:
        - Name: {config.project_name}
        - Intent: {config.intent}

        Reference architecture (do not regenerate unless errors are in architecture):
        {context['architecture']}

        Reference database (for API/UI/Auth/Rules alignment):
        {context['db']}

        Reference API (for UI alignment):
        {context['api']}

        Current broken '{layer.value}' segment:
        {current_segment}

        Return ONLY valid JSON for the {layer.value} layer matching the required schema.
        Remove hallucinated fields. Include all required keys. Ensure cross-layer consistency.
        """

        try:
            repaired_json = await self.llm.generate_json(prompt, model)
            segment = model.model_validate(repaired_json)
            self.history.append({
                "repair_action": f"LLM delta-regenerated '{layer.value}' layer",
                "layer": layer.value,
                "strategy": "targeted_llm",
                "errors_addressed": [i.message for i in issues],
            })
            return segment
        except Exception as exc:
            self.history.append({
                "repair_action": f"Failed to regenerate '{layer.value}' layer",
                "layer": layer.value,
                "strategy": "targeted_llm",
                "error": str(exc),
            })
            return None

    def _get_layer_data(self, config: AppConfig, layer: AffectedLayer) -> Dict:
        mapping = {
            AffectedLayer.ARCHITECTURE: config.architecture,
            AffectedLayer.DB: config.db,
            AffectedLayer.API: config.api,
            AffectedLayer.UI: config.ui,
            AffectedLayer.AUTH: config.auth,
            AffectedLayer.RULES: config.rules,
        }
        return mapping[layer].model_dump()

    def _apply_layer(self, config: AppConfig, layer: AffectedLayer, segment: BaseModel):
        if layer == AffectedLayer.ARCHITECTURE:
            config.architecture = segment  # type: ignore
        elif layer == AffectedLayer.DB:
            config.db = segment  # type: ignore
        elif layer == AffectedLayer.API:
            config.api = segment  # type: ignore
        elif layer == AffectedLayer.UI:
            config.ui = segment  # type: ignore
        elif layer == AffectedLayer.AUTH:
            config.auth = segment  # type: ignore
        elif layer == AffectedLayer.RULES:
            config.rules = segment  # type: ignore

    def _known_resources(self, config: AppConfig) -> set:
        resources = set()
        for table in config.db.tables:
            if table.name:
                resources.add(table.name)
                resources.add(normalize_name(table.name))
        for entity in config.architecture.entities:
            if entity.name:
                resources.add(entity.name)
                resources.add(normalize_name(entity.name))
        return resources

    def _resource_exists(self, resource: str, known: set) -> bool:
        if not resource:
            return True
        if resource in known:
            return True
        norm = normalize_name(resource)
        return norm in known or any(norm in k or k in norm for k in known if k)
