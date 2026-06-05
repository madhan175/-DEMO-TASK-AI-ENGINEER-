import json
import os
from typing import List, Dict, Any, Optional
from pipeline.compiler import AppCompiler
from validation.validator import Validator
from repair.repair_engine import RepairEngine
from runtime.executor import RuntimeExecutor
from schemas.app_config import AppConfig, PipelineStatus
from llm.gemini_provider import GeminiProvider
from llm.ollama_provider import OllamaProvider
import asyncio

class GenerationService:
    def __init__(self, storage_dir: str = "database/projects"):
        self.validator = Validator()
        self.executor = RuntimeExecutor()
        self.pipeline_statuses = {} # project_id -> PipelineStatus
        self.projects = {} # Cache
        self.active_compilers = {} # project_id -> AppCompiler
        self.storage_dir = storage_dir
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir)

    def get_llm(self, provider_name: str):
        if provider_name.lower() == "ollama":
            return OllamaProvider()
        return GeminiProvider()

    async def run_full_pipeline(self, project_id: str, prompt: str, model_provider: str = "gemini"):
        llm = self.get_llm(model_provider)
        compiler = AppCompiler(llm)
        repair_engine = RepairEngine(llm)
        
        self.active_compilers[project_id] = compiler
        self.pipeline_statuses[project_id] = compiler.status
        
        try:
            # 1. Compile
            config = await compiler.compile(prompt)
            self.projects[project_id] = config
            self.pipeline_statuses[project_id] = compiler.status
            
            # Remove from active compilers once complete
            if project_id in self.active_compilers:
                del self.active_compilers[project_id]
            await compiler.update_status(7, "running")
            val_results = self.validator.validate(config)
            await compiler.update_status(
                7,
                "success" if val_results["is_valid"] else "failed",
                output=val_results,
            )

            # 3. Targeted repair (deterministic fixes + per-layer LLM delta, not full blind retry)
            if not val_results["is_valid"]:
                await compiler.update_status(8, "running")
                repair_engine.history = []
                config, val_results = await repair_engine.repair_until_valid(config, self.validator)
                await compiler.update_status(
                    8,
                    "success" if val_results["is_valid"] else "failed",
                    output={
                        "repair_log": repair_engine.history,
                        "remaining_errors": val_results.get("errors", []),
                        "final_score": val_results.get("score", 0),
                        "categories_fixed": val_results.get("categories", {}),
                    },
                )
                # Re-validate after repair for stage 7 output snapshot
                await compiler.update_status(7, "success" if val_results["is_valid"] else "failed", output=val_results)
            else:
                await compiler.update_status(8, "success", output={"message": "No repair needed", "repair_log": []})

            # 4. Execution
            await compiler.update_status(9, "running")
            exec_results = self.executor.execute(config)
            await compiler.update_status(9, "success" if exec_results["status"] == "success" else "failed", output=exec_results)
            
            # Save to JSON for persistence
            self.projects[project_id] = config
            with open(os.path.join(self.storage_dir, f"{project_id}.json"), "w") as f:
                f.write(config.model_dump_json())
                
            self.pipeline_statuses[project_id] = compiler.status
            
        except Exception as e:
            # Find the first stage that is either 'waiting' or 'running' to mark as failed
            current_idx = 0
            for i, s in enumerate(compiler.status.stages):
                if s.status in ["running", "waiting"]:
                    current_idx = i
                    break
            
            error_msg = f"Pipeline Error: {str(e)}"
            await compiler.update_status(current_idx, "failed", error=error_msg)
            self.pipeline_statuses[project_id] = compiler.status
            print(f"ERROR for project {project_id} at stage {current_idx}: {e}")

    def get_project(self, project_id: str) -> Optional[AppConfig]:
        if project_id in self.projects:
            return self.projects[project_id]
        
        if project_id in self.active_compilers:
            return self.active_compilers[project_id].get_current_config()
        
        file_path = os.path.join(self.storage_dir, f"{project_id}.json")
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                config = AppConfig(**json.load(f))
                self.projects[project_id] = config
                return config
        return None
