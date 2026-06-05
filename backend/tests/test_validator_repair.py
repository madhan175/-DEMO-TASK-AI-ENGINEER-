"""Unit tests for the validation + repair engine (no LLM calls)."""

import copy

from schemas.app_config import AppConfig, ArchitectureSchema, Entity
from schemas.database import DBSchema, DBTable, DBColumn
from schemas.api import APISchema, APIEndpoint
from schemas.ui import UISchema, UIPage, UIComponent
from schemas.auth import AuthSchema, AuthRole, Permission
from schemas.business_rules import RulesSchema, BusinessRule
from validation.validator import Validator
from validation.json_guard import parse_json_text, detect_root_key_issues
from repair.repair_engine import RepairEngine


def _sample_config() -> AppConfig:
    return AppConfig(
        project_name="TestApp",
        intent="A test CRM application",
        architecture=ArchitectureSchema(
            entities=[Entity(name="Contact", description="Customer contact record")],
            description="CRM data flow",
        ),
        db=DBSchema(
            tables=[
                DBTable(
                    name="Contact",
                    columns=[
                        DBColumn(name="id", type="INTEGER", primary_key=True, nullable=False),
                        DBColumn(name="tenant_id", type="INTEGER", references="Tenant.id"),
                    ],
                )
            ],
            relationships=[],
        ),
        api=APISchema(
            endpoints=[
                APIEndpoint(method="GET", path="/contacts", summary="List contacts"),
            ]
        ),
        ui=UISchema(
            pages=[
                UIPage(
                    name="Contacts",
                    route="/contacts",
                    components=[UIComponent(type="Table", props={"data_source": "/missing"})],
                )
            ]
        ),
        auth=AuthSchema(
            roles=[AuthRole(name="Admin", permissions=[Permission(action="read", resource="GhostEntity")])],
            matrix={"GhostRole": ["read:GhostEntity"]},
        ),
        rules=RulesSchema(
            rules=[
                BusinessRule(
                    description="Validate Contact integrity",
                    logic="Contact must have tenant_id",
                    triggers=["ContactCreate"],
                )
            ]
        ),
    )


def test_parse_invalid_json():
    _, issues = parse_json_text("{ not valid json")
    assert len(issues) == 1
    assert issues[0].category.value == "invalid_json"


def test_detect_missing_and_hallucinated_root_keys():
    issues = detect_root_key_issues({"project_name": "X", "fake_field": True})
    categories = {i.category.value for i in issues}
    assert "missing_key" in categories
    assert "hallucinated_field" in categories


def test_validator_detects_cross_layer_issues():
    config = _sample_config()
    result = Validator().validate(config)
    assert result["is_valid"] is False
    assert result["score"] < 100
    assert len(result["issues"]) > 0
    categories = result["categories"]
    assert categories.get("hallucinated_field", 0) > 0 or categories.get("schema_mismatch", 0) > 0


def test_deterministic_repair_fixes_auth_and_ui():
    config = _sample_config()
    validator = Validator()
    val_results = validator.validate(config)

    engine = RepairEngine(llm_provider=None)  # type: ignore — deterministic only
    repaired = copy.deepcopy(config)
    actions = engine._apply_deterministic_fixes(repaired, engine._issues_from_result(val_results))

    assert len(actions) > 0
    role_names = {r.name for r in repaired.auth.roles}
    assert "GhostRole" in role_names
    assert repaired.api.endpoints[0].path.startswith("/")

    table_comp = repaired.ui.pages[0].components[0]
    assert "data_source" not in table_comp.props
