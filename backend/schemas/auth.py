from pydantic import BaseModel
from typing import List, Dict

class Permission(BaseModel):
    action: str
    resource: str

class AuthRole(BaseModel):
    name: str
    permissions: List[Permission]

class AuthSchema(BaseModel):
    roles: List[AuthRole]
    matrix: Dict[str, List[str]] # Role -> List of Actions
