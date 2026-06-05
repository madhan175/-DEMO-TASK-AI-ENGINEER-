import asyncio
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

MAX_REPAIR_ROUNDS = 1
LLM_REPAIR_TIMEOUT = 30  # seconds per layer regeneration


class RepairEngine:
    def __init__(self, llm_provider: BaseLLMProvider):
        self.llm = llm_provider
        self.history: List[Dict[str, Any]] = []

    async def repair(
        self,
        config: AppConfig,
        validation_result: Dict[str, Any],
        validator=None,
    ) -> AppConfig:
        issues = self._issues_from_result(validation_result)
        if not issues:
            return config

        repaired = copy.deepcopy(config)
        deterministic_actions = self._apply_deterministic_fixes(repaired, issues)
        for action in deterministic_actions:
            self.history.append(action)

        if validator:
            new_val = validator.validate(repaired)
            if new_val["is_valid"]:
                return repaired
            issues = self._issues_from_result(new_val)

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

            current = await self.repair(current, last_result, validator=validator)
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

        # Auth: fix invalid permission actions and strip hallucinated permissions
        known = self._known_resources(config)
        valid_actions = {"read", "write", "delete", "manage", "create", "update", "list"}
        for role in config.auth.roles:
            before = len(role.permissions)
            for p in role.permissions:
                if p.action and p.action.lower() not in valid_actions:
                    p.action = "manage"  # fallback
            role.permissions = [
                p for p in role.permissions
                if self._resource_exists(p.resource, known)
            ]
            if len(role.permissions) < before:
                actions.append({
                    "repair_action": f"Removed hallucinated/invalid permissions from role '{role.name}'",
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
                if not col.references:
                    continue
                if "." not in col.references:
                    col.references = None
                    actions.append({
                        "repair_action": f"Cleared malformed FK on {table.name}.{col.name}",
                        "layer": "db",
                        "strategy": "deterministic",
                    })
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

        # ARCHITECTURE: strip entities that don't map to tables
        from validation.json_guard import normalize_name
        if config.architecture and config.architecture.entities:
            table_norm = {normalize_name(t.name) for t in config.db.tables if t.name}
            valid_entities = []
            for entity in config.architecture.entities:
                if not entity.name:
                    continue
                en = normalize_name(entity.name)
                if any(en in tn or tn in en for tn in table_norm):
                    valid_entities.append(entity)
                else:
                    actions.append({
                        "repair_action": f"Removed unmapped Architecture entity: '{entity.name}'",
                        "layer": "architecture",
                        "strategy": "deterministic",
                    })
            if valid_entities:
                config.architecture.entities = valid_entities
            else:
                from schemas.app_config import Entity
                config.architecture.entities = [Entity(name="System", description="Core system runtime")]

        # API: strip endpoints that don't map to tables (cross-layer fix)
        if config.api and config.api.endpoints:
            table_names = {t.name for t in config.db.tables if t.name}
            valid_endpoints = []
            for endpoint in config.api.endpoints:
                if not endpoint.path:
                    continue
                path_lower = endpoint.path.lower()
                from validation.json_guard import normalize_name
                mapped = False
                for name in table_names:
                    if name.lower() in path_lower or normalize_name(name) in normalize_name(endpoint.path):
                        mapped = True
                        break
                if mapped:
                    valid_endpoints.append(endpoint)
                else:
                    actions.append({
                        "repair_action": f"Removed unmapped API endpoint: '{endpoint.path}'",
                        "layer": "api",
                        "strategy": "deterministic",
                    })
            if valid_endpoints:
                config.api.endpoints = valid_endpoints
            else:
                from schemas.api import Endpoint
                config.api.endpoints = [Endpoint(method="GET", path="/health", summary="Healthcheck API", request_body=None, response_body=None)]

        # UI: remove broken data_source references and fix unknown component types
        endpoint_paths = {e.path for e in config.api.endpoints}
        valid_components = { "Header", "Table", "Form", "Chart", "Sidebar", "Card", "DataSummary", "TenantProfilePanel", "AccessPolicyTable", "Button", "Modal" }
        for page in config.ui.pages:
            for comp in page.components:
                if comp.type not in valid_components:
                    comp.type = "Card"  # fallback component type
                    actions.append({
                        "repair_action": f"Changed unknown component to 'Card' on page '{page.name}'",
                        "layer": "ui",
                        "strategy": "deterministic",
                    })
                if comp.type == "Table" and comp.props:
                    ds = comp.props.get("data_source")
                    if ds and ds not in endpoint_paths:
                        comp.props.pop("data_source", None)
                        actions.append({
                            "repair_action": f"Removed invalid data_source '{ds}' from page '{page.name}'",
                            "layer": "ui",
                            "strategy": "deterministic",
                        })

        # RULES: strip business rules referencing unknown entities
        if config.rules and config.rules.rules:
            known = self._known_resources(config)
            valid_rules = []
            for rule in config.rules.rules:
                text = f"{rule.description} {rule.logic}"
                tokens = [t for t in text.replace(".", " ").split() if t and t[0].isupper() and len(t) > 2]
                if all(self._resource_exists(token, known) for token in tokens):
                    valid_rules.append(rule)
                else:
                    actions.append({
                        "repair_action": f"Removed hallucinated business rule: '{getattr(rule, 'description', 'unknown')}'",
                        "layer": "rules",
                        "strategy": "deterministic",
                    })
            if valid_rules:
                config.rules.rules = valid_rules
            else:
                from schemas.business_rules import BusinessRule
                config.rules.rules = [BusinessRule(description="System operates normally", logic="Default state behavior", triggers=["system_start"])]



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
            repaired_json = await asyncio.wait_for(
                self.llm.generate_json(prompt, model),
                timeout=LLM_REPAIR_TIMEOUT,
            )
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
