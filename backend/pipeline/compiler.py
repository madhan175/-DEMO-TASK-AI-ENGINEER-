import asyncio
import json
from typing import List, Dict, Any, Optional
from schemas.app_config import AppConfig, PipelineStatus, PipelineStage, ArchitectureSchema, Entity
from llm.base_provider import BaseLLMProvider
from schemas.database import DBSchema
from schemas.api import APISchema
from schemas.ui import UISchema
from schemas.auth import AuthSchema
from schemas.business_rules import RulesSchema

class AppCompiler:
    def __init__(self, llm_provider: BaseLLMProvider):
        self.llm = llm_provider
        self.status = PipelineStatus(
            stages=[
                PipelineStage(name="Intent Extraction", status="waiting"),
                PipelineStage(name="System Design", status="waiting"),
                PipelineStage(name="Database Generation", status="waiting"),
                PipelineStage(name="API Generation", status="waiting"),
                PipelineStage(name="UI Generation", status="waiting"),
                PipelineStage(name="Auth Generation", status="waiting"),
                PipelineStage(name="Business Rules Generation", status="waiting"),
                PipelineStage(name="Validation", status="waiting"),
                PipelineStage(name="Repair", status="waiting"),
                PipelineStage(name="Execution", status="waiting")
            ],
            current_stage="Intent Extraction",
            progress=0
        )
        self.assumptions = []

    async def update_status(self, stage_idx: int, status: str, output: Any = None, error: str = None):
        if stage_idx >= len(self.status.stages): return
        self.status.stages[stage_idx].status = status
        if output: self.status.stages[stage_idx].output = output
        if error: self.status.stages[stage_idx].errors.append(error)
        self.status.progress = int(((stage_idx + 1) / len(self.status.stages)) * 100)
        self.status.current_stage = self.status.stages[stage_idx].name

    async def compile(self, prompt: str) -> AppConfig:
        # Reset intermediate states
        self.assumptions = []
        self.intent = prompt
        self.architecture = None
        self.db = None
        self.api = None
        self.ui = None
        self.auth = None
        self.rules = None
        
        # Stage 0: Intent Extraction & Assumptions
        await self.update_status(0, "running")
        intent_prompt = f"""
        ACT AS AN EXPERT SYSTEMS ANALYST.
        Analyze these requirements and extract:
        1. A creative, unique 'project_name' (e.g., 'NexusPay', 'AgroFlow', 'HealthSync').
        2. The core 'intent': A detailed summary of what the app does, its unique value prop, and core workflow.
        3. A list of technical 'assumptions' to fill in gaps.
        
        CRITICAL: BE SPECIFIC. Do not give generic summaries.
        Requirements: {prompt}
        """
        intent_schema = {
            "type": "object", 
            "properties": {
                "project_name": {"type": "string"},
                "intent": {"type": "string"}, 
                "assumptions": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["project_name", "intent", "assumptions"]
        }
        intent_data = await self.llm.generate_json(intent_prompt, intent_schema)
        self.project_name = intent_data.get("project_name", "AI Generated App")
        self.intent = intent_data.get("intent", prompt)
        self.assumptions = intent_data.get("assumptions", [])
        await self.update_status(0, "success", output=intent_data)

        # Stage 1: System Design (Architecture)
        await self.update_status(1, "running")
        design_prompt = f"""
        ACT AS A SENIOR SOLUTION ARCHITECT.
        Based on the detailed intent: {self.intent}
        
        Generate a unique, high-fidelity system architecture. 
        Identify at least 5-8 specific domain entities (not just 'User' or 'Admin', but things like 'InventoryLedger', 'TransactionEscrow', 'SensorSnapshot').
        Provide a technical 'description' of the system flow, explaining how data moves between these entities in a robust, scalable way.
        
        Assumptions to consider: {self.assumptions}
        """
        self.architecture = ArchitectureSchema(**await self.llm.generate_json(design_prompt, ArchitectureSchema))
        await self.update_status(1, "success", output=self.architecture)

        # Stage 2: Database Generation
        await self.update_status(2, "running")
        db_prompt = f"""
        Design a normalized SQLite database schema for the following architecture:
        {self.architecture.model_dump_json()}
        
        Ensure columns have correct types (TEXT, INTEGER, REAL, JSON, etc.) and primary/foreign keys are specified.
        Use JSON type for storing complex objects or unstructured data where appropriate.
        """
        self.db = DBSchema(**await self.llm.generate_json(db_prompt, DBSchema))
        await self.update_status(2, "success", output=self.db)

        # Stage 3: API Generation
        await self.update_status(3, "running")
        api_prompt = f"""
        Generate a set of RESTful API endpoints required to support the entities in:
        {self.architecture.model_dump_json()}
        
        Ensure paths are consistent with the database schema:
        {self.db.model_dump_json()}
        
        Use JSON objects for request_body and response_body where complex data structures are needed.
        """
        self.api = APISchema(**await self.llm.generate_json(api_prompt, APISchema))
        await self.update_status(3, "success", output=self.api)

        # Stage 4: UI Generation
        await self.update_status(4, "running")
        ui_prompt = f"""
        Design a modern user interface structure for this application.
        Define pages, routes, and key components (Tables, Forms, Charts, etc.) for each page.
        
        Context:
        - API Endpoints: {self.api.model_dump_json()}
        - Entities: {self.architecture.entities}
        
        Components should use 'props' (Dict) for configuration settings, including JSON-style nested data.
        """
        self.ui = UISchema(**await self.llm.generate_json(ui_prompt, UISchema))
        await self.update_status(4, "success", output=self.ui)

        # Stage 5: Auth Generation
        await self.update_status(5, "running")
        auth_prompt = f"""
        Define the authentication and authorization model.
        Specify roles (e.g., Admin, User) and a permission matrix for resource access.
        
        System Flow: {self.architecture.description}
        """
        self.auth = AuthSchema(**await self.llm.generate_json(auth_prompt, AuthSchema))
        await self.update_status(5, "success", output=self.auth)

        # Stage 6: Business Rules Generation
        await self.update_status(6, "running")
        rules_prompt = f"""
        Generate critical business rules and logic triggers for this application.
        Focus on data integrity, state transitions, and validation logic.
        
        Architecture: {self.architecture.model_dump_json()}
        """
        self.rules = RulesSchema(**await self.llm.generate_json(rules_prompt, RulesSchema))
        await self.update_status(6, "success", output=self.rules)

        return self.get_current_config()

    def get_current_config(self) -> AppConfig:
        return AppConfig(
            project_name=getattr(self, 'project_name', "New Project"),
            intent=getattr(self, 'intent', ""),
            architecture=self.architecture or ArchitectureSchema(entities=[], description="Processing..."),
            db=self.db or DBSchema(tables=[], relationships=[]),
            api=self.api or APISchema(endpoints=[]),
            ui=self.ui or UISchema(pages=[]),
            auth=self.auth or AuthSchema(roles=[], matrix={}),
            rules=self.rules or RulesSchema(rules=[])
        )
