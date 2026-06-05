import os
import json
import asyncio
from google import genai
from typing import Any, Dict, Optional
from llm.base_provider import BaseLLMProvider

class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("Google API Key not found")
        self.client = genai.Client(api_key=self.api_key)
        self.model_name = model_name or os.getenv("GEMINI_MODEL") or "gemini-3.1-flash-lite"

    def _clean_schema(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively strip Gemini-unsupported JSON Schema keys."""
        if not isinstance(schema, dict):
            return schema

        unsupported = {"additionalProperties", "default"}
        new_schema = {k: v for k, v in schema.items() if k not in unsupported}
        for k, v in new_schema.items():
            if isinstance(v, dict):
                new_schema[k] = self._clean_schema(v)
            elif isinstance(v, list):
                new_schema[k] = [self._clean_schema(i) if isinstance(i, dict) else i for i in v]
        return new_schema

    async def generate_json(self, prompt: str, schema: Any, system_instruction: Optional[str] = None) -> Dict[str, Any]:
        # Using the new google-genai SDK
        config = {
            'response_mime_type': 'application/json',
        }
        
        # Strip additionalProperties which is not supported in Developer API mode
        if hasattr(schema, 'model_json_schema'):
            raw_schema = schema.model_json_schema()
            config['response_schema'] = self._clean_schema(raw_schema)
        elif isinstance(schema, dict):
            config['response_schema'] = self._clean_schema(schema)
            
        max_retries = 5
        retry_delay = 15
        
        for attempt in range(max_retries):
            try:
                response = await asyncio.wait_for(
                    self.client.aio.models.generate_content(
                        model=self.model_name,
                        contents=prompt,
                        config=config
                    ),
                    timeout=60,
                )
                
                if not response.text:
                    raise ValueError("Empty response from Gemini")
                    
                return json.loads(response.text)
            except asyncio.TimeoutError:
                if attempt < max_retries - 1:
                    print(f"Gemini API timeout, retrying... (Attempt {attempt+1})")
                    await asyncio.sleep(5)
                    continue
                raise ValueError("Gemini API timed out after all retries")
            except Exception as e:
                # Handle Rate Limit (429)
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    if attempt < max_retries - 1:
                        # Try to parse the suggested retry delay from the error
                        import re
                        delay_match = re.search(r'retry in (\d+)', str(e))
                        wait_time = int(delay_match.group(1)) + 5 if delay_match else retry_delay * (2 ** attempt)
                        wait_time = min(wait_time, 65)  # Cap at 65s
                        print(f"Rate limit hit (429), retrying in {wait_time}s... (Attempt {attempt+1}/{max_retries})")
                        await asyncio.sleep(wait_time)
                        continue

                # Fallback for "Developer API mode" schema errors or other issues
                if any(
                    marker in str(e)
                    for marker in ("additionalProperties", "response_schema", "Default value")
                ):
                    print(f"Schema error detected, falling back to raw prompt: {e}")
                    schema_str = str(schema.model_json_schema() if hasattr(schema, 'model_json_schema') else schema)
                    fallback_prompt = f"{prompt}\n\nIMPORTANT: Output MUST be valid JSON matching this schema: {schema_str}\nReturn ONLY the JSON object, no markdown."

                    fallback_res = await self.client.aio.models.generate_content(
                        model=self.model_name,
                        contents=fallback_prompt
                    )
                    try:
                        # Strip potential markdown blocks
                        text = fallback_res.text.strip()
                        if text.startswith("```json"):
                            text = text.split("```json")[-1].split("```")[0].strip()
                        elif text.startswith("```"):
                            text = text.split("```")[-1].split("```")[0].strip()
                        return json.loads(text)
                    except Exception:
                        raise ValueError(f"Fallback generation also failed: {e}")

                raise ValueError(f"Gemini Generation Error: {e}")
