from pydantic import BaseModel, Field
from typing import List, Optional, Any
from schemas.database import DBSchema
from schemas.api import APISchema
from schemas.ui import UISchema
from schemas.auth import AuthSchema
from schemas.business_rules import RulesSchema

class Entity(BaseModel):
    name: str
    description: str

class ArchitectureSchema(BaseModel):
    entities: List[Entity]
    description: str

class AppConfig(BaseModel):
    project_name: str
    intent: str
    architecture: ArchitectureSchema
    db: DBSchema
    api: APISchema
    ui: UISchema
    auth: AuthSchema
    rules: RulesSchema
    json_dump: Optional[str] = None

class PipelineStage(BaseModel):
    name: str
    status: str # waiting, running, success, failed
    output: Optional[Any] = None
    errors: List[str] = []

class PipelineStatus(BaseModel):
    stages: List[PipelineStage]
    current_stage: str
    progress: int
