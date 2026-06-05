from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class UIComponent(BaseModel):
    type: str # Header, Table, Form, Chart, Sidebar, Card
    props: Dict[str, Any]
    content: Optional[str] = None

class UIPage(BaseModel):
    name: str
    route: str
    components: List[UIComponent]

class UISchema(BaseModel):
    pages: List[UIPage]
