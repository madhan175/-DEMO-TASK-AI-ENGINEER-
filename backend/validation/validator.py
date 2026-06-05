import os
import sqlite3
import tempfile
from typing import Dict, List, Set

from schemas.app_config import AppConfig
from validation.error_types import (
    AffectedLayer,
    ErrorCategory,
    ValidationIssue,
    format_issue,
)
from validation.json_guard import normalize_name

VALID_SQL_TYPES = {"TEXT", "INTEGER", "REAL", "BLOB", "JSON", "BOOLEAN", "DATETIME"}
VALID_HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE"}
VALID_COMPONENT_TYPES = {
    "Header", "Table", "Form", "Chart", "Sidebar", "Card",
    "DataSummary", "TenantProfilePanel", "AccessPolicyTable", "Button", "Modal",
}
VALID_AUTH_ACTIONS = {"read", "write", "delete", "manage", "create", "update", "list"}


class Validator:
    def __init__(self):
        self.issues: List[ValidationIssue] = []

    def validate(self, config: AppConfig) -> Dict:
        self.issues = []

        self._validate_structure(config)
        self._validate_architecture(config)
        self._validate_database(config)
        self._validate_api(config)
        self._validate_ui(config)
        self._validate_auth(config)
        self._validate_rules(config)
        self._validate_cross_layer(config)
        self._validate_sql_dry_run(config)

        score = 100
        if self.issues:
            penalties = {
                ErrorCategory.INVALID_JSON: 25,
                ErrorCategory.MISSING_KEY: 15,
                ErrorCategory.HALLUCINATED_FIELD: 10,
                ErrorCategory.SCHEMA_MISMATCH: 12,
                ErrorCategory.LOGICAL_INCONSISTENCY: 8,
            }
            total_penalty = sum(penalties.get(i.category, 10) for i in self.issues)
            score = max(0, 100 - min(total_penalty, 100))

        categories: Dict[str, int] = {}
        for issue in self.issues:
            categories[issue.category.value] = categories.get(issue.category.value, 0) + 1

        return {
            "score": score,
            "errors": [format_issue(i) for i in self.issues],
            "issues": [i.to_dict() for i in self.issues],
            "categories": categories,
            "layers_affected": list({i.layer.value for i in self.issues}),
            "auto_fixable_count": sum(1 for i in self.issues if i.auto_fixable),
            "is_valid": len(self.issues) == 0,
        }

    def _add(
        self,
        category: ErrorCategory,
        layer: AffectedLayer,
        message: str,
        field_path: str | None = None,
        auto_fixable: bool = False,
    ):
        self.issues.append(
            ValidationIssue(
                category=category,
                layer=layer,
                message=message,
                field_path=field_path,
                auto_fixable=auto_fixable,
            )
        )

    def _validate_structure(self, config: AppConfig):
        if not config.project_name or not config.project_name.strip():
            self._add(ErrorCategory.MISSING_KEY, AffectedLayer.ROOT, "project_name is empty", "project_name")
        if not config.intent or not config.intent.strip():
            self._add(ErrorCategory.MISSING_KEY, AffectedLayer.ROOT, "intent is empty", "intent")

    def _validate_architecture(self, config: AppConfig):
        arch = config.architecture
        if not arch.entities:
            self._add(
                ErrorCategory.MISSING_KEY,
                AffectedLayer.ARCHITECTURE,
                "architecture.entities must contain at least one entity",
                "architecture.entities",
            )
        if not arch.description or not arch.description.strip():
            self._add(
                ErrorCategory.MISSING_KEY,
                AffectedLayer.ARCHITECTURE,
                "architecture.description is empty",
                "architecture.description",
            )

        entity_names = []
        for i, entity in enumerate(arch.entities):
            if not entity.name or not entity.name.strip():
                self._add(
                    ErrorCategory.MISSING_KEY,
                    AffectedLayer.ARCHITECTURE,
                    "Entity missing name",
                    f"architecture.entities[{i}].name",
                )
            else:
                entity_names.append(entity.name)
            if not entity.description or not entity.description.strip():
                self._add(
                    ErrorCategory.SCHEMA_MISMATCH,
                    AffectedLayer.ARCHITECTURE,
                    f"Entity '{entity.name or i}' has no description",
                    f"architecture.entities[{i}].description",
                )

        if len(entity_names) != len(set(entity_names)):
            self._add(
                ErrorCategory.LOGICAL_INCONSISTENCY,
                AffectedLayer.ARCHITECTURE,
                "Duplicate entity names in architecture",
                "architecture.entities",
            )

    def _validate_database(self, config: AppConfig):
        if not config.db.tables:
            self._add(
                ErrorCategory.MISSING_KEY,
                AffectedLayer.DB,
                "db.tables must contain at least one table",
                "db.tables",
            )
            return

        table_names: List[str] = []
        table_columns: Dict[str, Set[str]] = {}

        for t_idx, table in enumerate(config.db.tables):
            if not table.name:
                self._add(ErrorCategory.MISSING_KEY, AffectedLayer.DB, "Table missing name", f"db.tables[{t_idx}].name")
                continue

            if table.name in table_names:
                self._add(
                    ErrorCategory.LOGICAL_INCONSISTENCY,
                    AffectedLayer.DB,
                    f"Duplicate table name '{table.name}'",
                    f"db.tables[{t_idx}].name",
                    auto_fixable=True,
                )
            table_names.append(table.name)

            if not table.columns:
                self._add(
                    ErrorCategory.MISSING_KEY,
                    AffectedLayer.DB,
                    f"Table '{table.name}' has no columns",
                    f"db.tables[{t_idx}].columns",
                )
                continue

            col_names: List[str] = []
            pk_count = 0
            for c_idx, col in enumerate(table.columns):
                if not col.name:
                    self._add(
                        ErrorCategory.MISSING_KEY,
                        AffectedLayer.DB,
                        f"Column missing name in table '{table.name}'",
                        f"db.tables[{t_idx}].columns[{c_idx}].name",
                    )
                    continue

                if col.name in col_names:
                    self._add(
                        ErrorCategory.LOGICAL_INCONSISTENCY,
                        AffectedLayer.DB,
                        f"Duplicate column '{col.name}' in table '{table.name}'",
                        f"db.tables[{t_idx}].columns[{c_idx}].name",
                        auto_fixable=True,
                    )
                col_names.append(col.name)

                col_type = (col.type or "").upper()
                if col_type not in VALID_SQL_TYPES:
                    self._add(
                        ErrorCategory.SCHEMA_MISMATCH,
                        AffectedLayer.DB,
                        f"Invalid SQL type '{col.type}' on {table.name}.{col.name}",
                        f"db.tables[{t_idx}].columns[{c_idx}].type",
                    )

                if col.primary_key:
                    pk_count += 1

                if col.references:
                    self._validate_foreign_key(
                        col.references, table_names, table_columns, t_idx, c_idx, table.name, col.name
                    )

            table_columns[table.name] = set(col_names)

            if pk_count == 0:
                self._add(
                    ErrorCategory.LOGICAL_INCONSISTENCY,
                    AffectedLayer.DB,
                    f"Table '{table.name}' has no primary key",
                    f"db.tables[{t_idx}]",
                    auto_fixable=True,
                )
            elif pk_count > 1:
                self._add(
                    ErrorCategory.LOGICAL_INCONSISTENCY,
                    AffectedLayer.DB,
                    f"Table '{table.name}' has multiple primary keys",
                    f"db.tables[{t_idx}]",
                )

    def _validate_foreign_key(
        self,
        reference: str,
        table_names: List[str],
        table_columns: Dict[str, Set[str]],
        t_idx: int,
        c_idx: int,
        table_name: str,
        col_name: str,
    ):
        if "." not in reference:
            self._add(
                ErrorCategory.SCHEMA_MISMATCH,
                AffectedLayer.DB,
                f"Foreign key '{reference}' must use table.column format",
                f"db.tables[{t_idx}].columns[{c_idx}].references",
            )
            return

        ref_table, ref_col = reference.split(".", 1)
        if ref_table not in table_names:
            self._add(
                ErrorCategory.HALLUCINATED_FIELD,
                AffectedLayer.DB,
                f"Foreign key on {table_name}.{col_name} references unknown table '{ref_table}'",
                f"db.tables[{t_idx}].columns[{c_idx}].references",
                auto_fixable=True,
            )
            return

        if ref_col not in table_columns.get(ref_table, set()):
            self._add(
                ErrorCategory.HALLUCINATED_FIELD,
                AffectedLayer.DB,
                f"Foreign key on {table_name}.{col_name} references unknown column '{ref_col}'",
                f"db.tables[{t_idx}].columns[{c_idx}].references",
                auto_fixable=True,
            )

    def _validate_api(self, config: AppConfig):
        if not config.api.endpoints:
            self._add(
                ErrorCategory.MISSING_KEY,
                AffectedLayer.API,
                "api.endpoints must contain at least one endpoint",
                "api.endpoints",
            )
            return

        seen: Set[str] = set()
        for i, endpoint in enumerate(config.api.endpoints):
            method = (endpoint.method or "").upper()
            if method not in VALID_HTTP_METHODS:
                self._add(
                    ErrorCategory.SCHEMA_MISMATCH,
                    AffectedLayer.API,
                    f"Invalid HTTP method '{endpoint.method}'",
                    f"api.endpoints[{i}].method",
                )

            if not endpoint.path or not endpoint.path.startswith("/"):
                self._add(
                    ErrorCategory.SCHEMA_MISMATCH,
                    AffectedLayer.API,
                    f"API path must start with '/': '{endpoint.path}'",
                    f"api.endpoints[{i}].path",
                    auto_fixable=True,
                )

            if not endpoint.summary or not endpoint.summary.strip():
                self._add(
                    ErrorCategory.MISSING_KEY,
                    AffectedLayer.API,
                    f"Endpoint '{endpoint.path}' missing summary",
                    f"api.endpoints[{i}].summary",
                )

            key = f"{method}:{endpoint.path}"
            if key in seen:
                self._add(
                    ErrorCategory.LOGICAL_INCONSISTENCY,
                    AffectedLayer.API,
                    f"Duplicate endpoint {method} {endpoint.path}",
                    f"api.endpoints[{i}]",
                )
            seen.add(key)

    def _validate_ui(self, config: AppConfig):
        if not config.ui.pages:
            self._add(
                ErrorCategory.MISSING_KEY,
                AffectedLayer.UI,
                "ui.pages must contain at least one page",
                "ui.pages",
            )
            return

        routes: List[str] = []
        endpoint_paths = {e.path for e in config.api.endpoints}

        for p_idx, page in enumerate(config.ui.pages):
            if not page.name:
                self._add(ErrorCategory.MISSING_KEY, AffectedLayer.UI, "Page missing name", f"ui.pages[{p_idx}].name")
            if not page.route or not page.route.startswith("/"):
                self._add(
                    ErrorCategory.SCHEMA_MISMATCH,
                    AffectedLayer.UI,
                    f"Page route must start with '/': '{page.route}'",
                    f"ui.pages[{p_idx}].route",
                )
            if page.route in routes:
                self._add(
                    ErrorCategory.LOGICAL_INCONSISTENCY,
                    AffectedLayer.UI,
                    f"Duplicate page route '{page.route}'",
                    f"ui.pages[{p_idx}].route",
                )
            routes.append(page.route)

            if not page.components:
                self._add(
                    ErrorCategory.MISSING_KEY,
                    AffectedLayer.UI,
                    f"Page '{page.name}' has no components",
                    f"ui.pages[{p_idx}].components",
                )

            for c_idx, comp in enumerate(page.components):
                if comp.type not in VALID_COMPONENT_TYPES:
                    self._add(
                        ErrorCategory.HALLUCINATED_FIELD,
                        AffectedLayer.UI,
                        f"Unknown UI component type '{comp.type}' on page '{page.name}'",
                        f"ui.pages[{p_idx}].components[{c_idx}].type",
                    )

                data_source = comp.props.get("data_source") if comp.props else None
                if comp.type == "Table" and data_source and data_source not in endpoint_paths:
                    self._add(
                        ErrorCategory.SCHEMA_MISMATCH,
                        AffectedLayer.UI,
                        f"Table on '{page.name}' references missing API path '{data_source}'",
                        f"ui.pages[{p_idx}].components[{c_idx}].props.data_source",
                        auto_fixable=True,
                    )

    def _validate_auth(self, config: AppConfig):
        if not config.auth.roles:
            self._add(
                ErrorCategory.MISSING_KEY,
                AffectedLayer.AUTH,
                "auth.roles must contain at least one role",
                "auth.roles",
            )

        defined_roles = {r.name for r in config.auth.roles if r.name}
        known_resources = self._known_resources(config)

        for role_name, actions in config.auth.matrix.items():
            if role_name not in defined_roles:
                self._add(
                    ErrorCategory.LOGICAL_INCONSISTENCY,
                    AffectedLayer.AUTH,
                    f"Auth matrix references unknown role '{role_name}'",
                    f"auth.matrix.{role_name}",
                    auto_fixable=True,
                )
            for action in actions:
                if ":" in action:
                    act, resource = action.split(":", 1)
                    if act.lower() not in VALID_AUTH_ACTIONS:
                        self._add(
                            ErrorCategory.SCHEMA_MISMATCH,
                            AffectedLayer.AUTH,
                            f"Unknown auth action '{act}' for role '{role_name}'",
                            f"auth.matrix.{role_name}",
                        )
                    if not self._resource_exists(resource, known_resources):
                        self._add(
                            ErrorCategory.HALLUCINATED_FIELD,
                            AffectedLayer.AUTH,
                            f"Auth matrix references unknown resource '{resource}'",
                            f"auth.matrix.{role_name}",
                            auto_fixable=True,
                        )

        for r_idx, role in enumerate(config.auth.roles):
            if not role.name:
                self._add(ErrorCategory.MISSING_KEY, AffectedLayer.AUTH, "Role missing name", f"auth.roles[{r_idx}].name")
            for p_idx, perm in enumerate(role.permissions):
                if perm.action.lower() not in VALID_AUTH_ACTIONS:
                    self._add(
                        ErrorCategory.SCHEMA_MISMATCH,
                        AffectedLayer.AUTH,
                        f"Invalid permission action '{perm.action}' on role '{role.name}'",
                        f"auth.roles[{r_idx}].permissions[{p_idx}].action",
                    )
                if perm.resource and not self._resource_exists(perm.resource, known_resources):
                    self._add(
                        ErrorCategory.HALLUCINATED_FIELD,
                        AffectedLayer.AUTH,
                        f"Permission references unknown resource '{perm.resource}'",
                        f"auth.roles[{r_idx}].permissions[{p_idx}].resource",
                        auto_fixable=True,
                    )

    def _validate_rules(self, config: AppConfig):
        if not config.rules.rules:
            self._add(
                ErrorCategory.MISSING_KEY,
                AffectedLayer.RULES,
                "rules.rules must contain at least one business rule",
                "rules.rules",
            )
            return

        known = self._known_resources(config)
        for i, rule in enumerate(config.rules.rules):
            if not rule.description or not rule.description.strip():
                self._add(
                    ErrorCategory.MISSING_KEY,
                    AffectedLayer.RULES,
                    f"Business rule {i + 1} missing description",
                    f"rules.rules[{i}].description",
                )
            if not rule.logic or not rule.logic.strip():
                self._add(
                    ErrorCategory.MISSING_KEY,
                    AffectedLayer.RULES,
                    f"Business rule {i + 1} missing logic",
                    f"rules.rules[{i}].logic",
                )
            if not rule.triggers:
                self._add(
                    ErrorCategory.MISSING_KEY,
                    AffectedLayer.RULES,
                    f"Business rule {i + 1} has no triggers",
                    f"rules.rules[{i}].triggers",
                )

            text = f"{rule.description} {rule.logic}"
            for token in self._extract_entity_tokens(text):
                if not self._resource_exists(token, known):
                    self._add(
                        ErrorCategory.HALLUCINATED_FIELD,
                        AffectedLayer.RULES,
                        f"Business rule references unknown entity/table '{token}'",
                        f"rules.rules[{i}]",
                        auto_fixable=True,
                    )

    def _validate_cross_layer(self, config: AppConfig):
        entity_norm = {normalize_name(e.name) for e in config.architecture.entities if e.name}
        table_norm = {normalize_name(t.name) for t in config.db.tables if t.name}
        table_names = {t.name for t in config.db.tables if t.name}

        for entity in config.architecture.entities:
            if not entity.name:
                continue
            en = normalize_name(entity.name)
            if not any(en in tn or tn in en for tn in table_norm):
                self._add(
                    ErrorCategory.SCHEMA_MISMATCH,
                    AffectedLayer.CROSS_LAYER,
                    f"Architecture entity '{entity.name}' has no matching database table",
                    f"architecture.entities.{entity.name}",
                    auto_fixable=True,
                )

        for endpoint in config.api.endpoints:
            if not endpoint.path:
                continue
            if not self._path_references_table(endpoint.path, table_names):
                self._add(
                    ErrorCategory.SCHEMA_MISMATCH,
                    AffectedLayer.CROSS_LAYER,
                    f"API endpoint '{endpoint.path}' does not map to any database table",
                    f"api.endpoints.{endpoint.path}",
                    auto_fixable=True,
                )

        if entity_norm and table_norm and not (entity_norm & table_norm):
            self._add(
                ErrorCategory.LOGICAL_INCONSISTENCY,
                AffectedLayer.CROSS_LAYER,
                "No overlap between architecture entities and database tables",
                "architecture <-> db",
            )

    def _validate_sql_dry_run(self, config: AppConfig):
        if not config.db.tables:
            return

        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        try:
            conn = sqlite3.connect(path)
            cursor = conn.cursor()
            for table in config.db.tables:
                if not table.name or not table.columns:
                    continue
                columns = []
                for col in table.columns:
                    if not col.name:
                        continue
                    col_def = f"{col.name} {col.type}"
                    if col.primary_key:
                        col_def += " PRIMARY KEY"
                    if not col.nullable:
                        col_def += " NOT NULL"
                    if col.unique:
                        col_def += " UNIQUE"
                    columns.append(col_def)
                if not columns:
                    continue
                sql = f"CREATE TABLE {table.name} ({', '.join(columns)});"
                try:
                    cursor.execute(sql)
                except sqlite3.Error as exc:
                    self._add(
                        ErrorCategory.SCHEMA_MISMATCH,
                        AffectedLayer.DB,
                        f"SQLite DDL failed for '{table.name}': {exc}",
                        f"db.tables.{table.name}",
                    )
            conn.commit()
            conn.close()
        except sqlite3.Error as exc:
            self._add(
                ErrorCategory.SCHEMA_MISMATCH,
                AffectedLayer.DB,
                f"SQLite dry-run failed: {exc}",
                "db",
            )
        finally:
            if os.path.exists(path):
                os.remove(path)

    def _known_resources(self, config: AppConfig) -> Set[str]:
        resources = set()
        for table in config.db.tables:
            if table.name:
                resources.add(table.name)
                resources.add(normalize_name(table.name))
        for entity in config.architecture.entities:
            if entity.name:
                resources.add(entity.name)
                resources.add(normalize_name(entity.name))
        for endpoint in config.api.endpoints:
            if endpoint.path:
                resources.add(endpoint.path)
        return resources

    def _resource_exists(self, resource: str, known: Set[str]) -> bool:
        if resource in known:
            return True
        norm = normalize_name(resource)
        return norm in known or any(norm in k or k in norm for k in known if k)

    def _path_references_table(self, path: str, table_names: Set[str]) -> bool:
        path_lower = path.lower()
        for name in table_names:
            if name.lower() in path_lower or normalize_name(name) in normalize_name(path):
                return True
        return False

    def _extract_entity_tokens(self, text: str) -> List[str]:
        return [t for t in text.replace(".", " ").split() if t and t[0].isupper() and len(t) > 2]
