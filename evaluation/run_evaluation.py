import asyncio
import json
import time
import csv
from backend.services.generation_service import GenerationService

async def run_evaluation():
    service = GenerationService()
    
    with open("evaluation/prompts/normal_prompts.json") as f:
        normal = json.load(f)
    with open("evaluation/prompts/edge_cases.json") as f:
        edge = json.load(f)
        
    all_prompts = normal + edge
    results = []
    
    print(f"Starting evaluation of {len(all_prompts)} prompts...")
    
    for item in all_prompts:
        project_id = f"eval_{item['id']}"
        start_time = time.time()
        
        print(f"Running prompt {item['id']}: {item['prompt'][:50]}...")
        
        await service.run_full_pipeline(project_id, item['prompt'])
        
        end_time = time.time()
        latency = end_time - start_time
        
        status = service.pipeline_statuses.get(project_id)
        final_success = all(s.status == "success" for s in status.stages)
        
        results.append({
            "id": item['id'],
            "prompt": item['prompt'],
            "success": final_success,
            "latency": latency,
            "repairs": len(status.stages[8].output.get("repair_log", [])) if final_success and status.stages[8].output else 0,
            "score": status.stages[7].output.get("score", 0) if status.stages[7].output else 0
        })
        
    # Save results
    with open("evaluation/results/metrics.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
        
    print("Evaluation complete. Results saved to evaluation/results/metrics.csv")

if __name__ == "__main__":
    asyncio.run(run_evaluation())
