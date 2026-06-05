from pydantic import BaseModel
from typing import List

class BusinessRule(BaseModel):
    description: str
    logic: str
    triggers: List[str]

class RulesSchema(BaseModel):
    rules: List[BusinessRule]
