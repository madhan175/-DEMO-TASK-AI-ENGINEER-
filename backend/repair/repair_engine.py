from typing import List, Dict, Any
from schemas.app_config import AppConfig
from llm.base_provider import BaseLLMProvider

class RepairEngine:
    def __init__(self, llm_provider: BaseLLMProvider):
        self.llm = llm_provider
        self.history = []

    async def repair(self, config: AppConfig, validation_errors: List[str]) -> AppConfig:
        if not validation_errors:
            return config
            
        repair_prompt = f"""
        The following application configuration has validation errors. 
        Please repair the configuration to fix these issues.
        
        Errors:
        {chr(10).join(validation_errors)}
        
        Current Config:
        {config.model_dump_json()}
        
        Return ONLY the repaired AppConfig JSON.
        """
        
        # In a real scenario, we might only send the affected segments to save tokens.
        # For this demo, we'll ask the LLM to fix the full config.
        try:
            repaired_json = await self.llm.generate_json(repair_prompt, AppConfig)
            repaired_config = AppConfig(**repaired_json)
            self.history.append({
                "original_errors": validation_errors,
                "repair_action": "LLM-assisted structural repair",
                "timestamp": "now"
            })
            return repaired_config
        except Exception as e:
            self.history.append({
                "original_errors": validation_errors,
                "error": str(e),
                "timestamp": "now"
            })
            return config
