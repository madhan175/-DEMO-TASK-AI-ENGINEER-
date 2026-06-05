from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class APIEndpoint(BaseModel):
    method: str # GET, POST, PUT, DELETE
    path: str
    summary: str
    request_body: Optional[Dict[str, Any]] = None
    response_body: Optional[Dict[str, Any]] = None
    auth_required: bool = True
    validation_rules: List[str] = []

class APISchema(BaseModel):
    endpoints: List[APIEndpoint]
