import asyncio
import json
import time
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Add parent directory to path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

from services.generation_service import GenerationService

async def run_benchmark():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    service = GenerationService(storage_dir=os.path.join(script_dir, "results/projects"))
    manifest_path = os.path.join(script_dir, "manifest.json")
    
    if not os.path.exists(manifest_path):
        print(f"Error: Manifest not found at {manifest_path}")
        return

    with open(manifest_path, 'r') as f:
        manifest = json.load(f)

    all_tests = manifest["standard_prompts"] + manifest["edge_cases"]
    results = []
    
    print(f"🚀 Starting Benchmark: {len(all_tests)} test cases...")
    print("-" * 50)

    for test in all_tests:
        print(f"Testing [{test['id']}] {test['name']}...")
        start_time = time.time()
        project_id = f"bench_{test['id']}"
        
        try:
            # Run the full pipeline
            await service.run_full_pipeline(project_id, test['prompt'])
            
            end_time = time.time()
            latency = end_time - start_time
            
            # Fetch final status
            status = service.pipeline_statuses.get(project_id)
            config = service.projects.get(project_id)
            
            # Basic metrics
            repair_stage = status.stages[8] if len(status.stages) > 8 else None
            repairs_needed = 1 if repair_stage and repair_stage.status == "success" and "repair_log" in (repair_stage.output or {}) else 0
            
            validation_stage = status.stages[7] if len(status.stages) > 7 else None
            is_valid = validation_stage.status == "success" if validation_stage else False
            
            results.append({
                "id": test["id"],
                "name": test["name"],
                "success": status.progress == 100 and is_valid,
                "latency_sec": round(latency, 2),
                "repairs_triggered": repairs_needed,
                "entities_count": len(config.architecture.entities) if config else 0,
                "tables_count": len(config.db.tables) if config else 0,
                "endpoints_count": len(config.api.endpoints) if config else 0
            })
            
            print(f"✅ Completed in {round(latency, 2)}s (Valid: {is_valid}, Repairs: {repairs_needed})")
            
            # Add a small cooldown to avoid rapid fire rate limits
            if test != all_tests[-1]:
                print(f"Breathe... (15s cooldown to reset quota)")
                await asyncio.sleep(15)
                
        except Exception as e:
            print(f"❌ Failed: {str(e)}")
            results.append({
                "id": test["id"],
                "name": test["name"],
                "success": False,
                "error": str(e)
            })

    # Summary Generation
    report = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": len(all_tests),
        "success_rate": f"{(sum(1 for r in results if r.get('success')) / len(results)) * 100}%",
        "avg_latency": f"{round(sum(r.get('latency_sec', 0) for r in results) / len(results), 2)}s",
        "total_repairs": sum(r.get('repairs_triggered', 0) for r in results),
        "detailed_results": results
    }

    report_path = os.path.join(script_dir, "results/report.json")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=4)

    print("-" * 50)
    print(f"📊 Benchmark Complete! Report saved to {report_path}")
    print(f"Summary: {report['success_rate']} Success Rate | {report['avg_latency']} Avg Latency")

if __name__ == "__main__":
    asyncio.run(run_benchmark())
