import json
import httpx
from typing import Any, Dict, Optional
from llm.base_provider import BaseLLMProvider

class OllamaProvider(BaseLLMProvider):
    def __init__(self, model_name: str = "llama3"):
        self.model_name = model_name
        self.api_url = "http://localhost:11434/api/generate"

    async def generate_json(self, prompt: str, schema: Any, system_instruction: Optional[str] = None) -> Dict[str, Any]:
        full_prompt = prompt
        if system_instruction:
            full_prompt = f"{system_instruction}\n\n{prompt}"
            
        full_prompt += f"\n\nOutput MUST be valid JSON matching this schema: {json.dumps(schema.schema() if hasattr(schema, 'schema') else str(schema))}"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.api_url,
                json={
                    "model": self.model_name,
                    "prompt": full_prompt,
                    "stream": False,
                    "format": "json"
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise ValueError(f"Ollama API error: {response.text}")
                
            result = response.json()
            try:
                return json.loads(result["response"])
            except Exception as e:
                raise ValueError(f"Failed to parse Ollama response as JSON: {e}\nResponse: {result['response']}")
