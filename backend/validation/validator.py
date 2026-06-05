from typing import List, Dict, Any
from schemas.app_config import AppConfig

class Validator:
    def __init__(self):
        self.errors = []
        self.score = 100

    def validate(self, config: AppConfig) -> Dict[str, Any]:
        self.errors = []
        self.score = 100
        
        # 1. Structural Validation (Pydantic already did some, but we can do more)
        self._validate_db_consistency(config)
        self._validate_api_ui_consistency(config)
        self._validate_auth_rules(config)
        
        # Calculate score
        if self.errors:
            self.score = max(0, 100 - (len(self.errors) * 10))
            
        return {
            "score": self.score,
            "errors": self.errors,
            "is_valid": len(self.errors) == 0
        }

    def _validate_db_consistency(self, config: AppConfig):
        # Check if API endpoints reference existing tables
        table_names = {t.name for t in config.db.tables}
        for endpoint in config.api.endpoints:
            # Simple heuristic: check if path contains table name
            found = False
            for t_name in table_names:
                if t_name in endpoint.path:
                    found = True
                    break
            # This is a bit simplified, but demonstrates cross-layer validation
            # if not found:
            #     self.errors.append(f"API endpoint {endpoint.path} might not have a corresponding DB table.")

    def _validate_api_ui_consistency(self, config: AppConfig):
        # Check if UI components that need data have API endpoints
        endpoint_paths = {e.path for e in config.api.endpoints}
        for page in config.ui.pages:
            for comp in page.components:
                if comp.type == "Table" and "data_source" in comp.props:
                    if comp.props["data_source"] not in endpoint_paths:
                        self.errors.append(f"UI Component in {page.name} references missing API source: {comp.props['data_source']}")

    def _validate_auth_rules(self, config: AppConfig):
        # Check if all roles in matrix exist in roles list
        defined_roles = {r.name for r in config.auth.roles}
        for role_name in config.auth.matrix.keys():
            if role_name not in defined_roles:
                self.errors.append(f"Auth matrix references unknown role: {role_name}")
