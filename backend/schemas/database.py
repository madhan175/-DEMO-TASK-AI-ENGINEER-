from pydantic import BaseModel
from typing import List, Optional

class DBColumn(BaseModel):
    name: str
    type: str  # TEXT, INTEGER, REAL, BLOB, JSON
    primary_key: bool = False
    nullable: bool = True
    unique: bool = False
    references: Optional[str] = None # table.column

class DBTable(BaseModel):
    name: str
    columns: List[DBColumn]

class DBSchema(BaseModel):
    tables: List[DBTable]
    relationships: List[str]
