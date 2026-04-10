import os
from arq import Worker
from app.services.ai_service import generate_code_review

async def process_ai_review_task(ctx, req_json: dict):
    """
    ARQ Task to process Code Review payloads.
    Uses pure AsyncIO for lightweight GPU orchestration.
    """
    try:
        review_json = await generate_code_review(
            code=req_json.get("code"),
            language=req_json.get("language"),
            output=req_json.get("output"),
            error=req_json.get("error"),
            execution_time_ms=req_json.get("execution_time_ms"),
            memory_usage_mb=req_json.get("memory_usage_mb")
        )
        return {"status": "completed", "review": review_json}
    except Exception as e:
        # Returning graceful failure on fatal so the frontend polling API gets it
        return {"status": "failed", "error": str(e)}

class WorkerSettings:
    functions = [process_ai_review_task]
    
    redis_settings = "redis://localhost:6379"  # Bound to local dev container config
    if os.environ.get("REDIS_URL"):
        from arq.connections import RedisSettings
        redis_settings = RedisSettings.from_dsn(os.environ.get("REDIS_URL"))

    # CPO-Level Hung LLM Protection
    job_timeout = 30  # Max 30 seconds for LiteLLM inference
    max_tries = 2     # Allow one retry if LiteLLM hits rate limit or random hang 
    
    # Pre-flight hook
    async def on_startup(ctx):
        print("ARQ Async Worker Node spinning up...")
        
    async def on_shutdown(ctx):
        print("ARQ Async Worker Node shutting down gracefully...")
