import ast as _ast
import re as _re
import httpx
import tenacity
from fastapi import APIRouter, Depends, HTTPException, Request, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict
from app.core.security import get_current_user
from app.core.config import limiter, code_runner_url

from app.schemas import *
router = APIRouter()

# Global Connection Pool HTTP Client for extreme latency reduction
_http_client = httpx.AsyncClient(
    limits=httpx.Limits(max_keepalive_connections=100, max_connections=200),
    timeout=httpx.Timeout(65.0, connect=5.0)
)

class CodeExecuteRequest(BaseModel):
    language: str = Field(..., max_length=50)
    code: str = Field(..., max_length=50000)
    test_input: str = Field("", max_length=20000)

class CodeReviewRequest(BaseModel):
    language: str = Field(..., max_length=50)
    code: str = Field(..., max_length=50000)
    output: str = Field("", max_length=20000)
    error: str = Field("", max_length=20000)
    execution_time_ms: float = None
    memory_usage_mb: float = None

class CoachMessageRequest(BaseModel):
    messages: List[Dict[str, str]] = Field(..., max_items=50)
    language: str = Field(..., max_length=50)
    code: str = Field(..., max_length=50000)
    output: str = Field("", max_length=20000)
    error: str = Field("", max_length=20000)
    challenge_title: str = Field(None, max_length=500)
    challenge_description: str = Field(None, max_length=5000)

_BLOCKED_PATTERNS = {
    "python": [
        # File system
        r"\bimport\s+os\b", r"\bimport\s+subprocess\b", r"\bimport\s+shutil\b", r"\bimport\s+pathlib\b",
        r"\bopen\s*\(", r"\bos\.", r"\bsubprocess\.", r"\bshutil\.", r"\bpathlib\.",
        # Network
        r"\bimport\s+socket\b", r"\bimport\s+http\b", r"\bimport\s+urllib\b", r"\bimport\s+requests\b",
        r"\bsocket\.", r"\burllib\.", r"\brequests\.",
        # Code execution
        r"\b__import__\s*\(", r"\bexec\s*\(", r"\beval\s*\(", r"\bcompile\s*\(", 
        # Introspection/reflection
        r"\bglobals\s*\(", r"\blocals\s*\(", r"\bgetattr\s*\(", r"\bhasattr\s*\(",
        r"\btype\s*\(", r"\bvars\s*\(", r"\bdir\s*\(", r"\binspect\.",
        # Module introspection
        r"\b__dict__\b", r"\b__code__\b", r"\b__class__\b", r"\b__bases__\b",
    ],
    "javascript": [
        r"require\s*\(\s*['\"]child_process", r"require\s*\(\s*['\"]fs",
        r"require\s*\(\s*['\"]net", r"require\s*\(\s*['\"]http",
        r"\bprocess\.exit", r"\bprocess\.env",
        r"\bexecSync\b", r"\bspawnSync\b",
        r"\beval\s*\(", r"\bFunction\s*\(",
    ],
    "java": [
        r"Runtime\.getRuntime", r"ProcessBuilder", r"System\.exit", 
        r"java\.io\.File", r"java\.net\.", r"java\.nio\.file",
    ],
    "c": [
        r"#include\s*<unistd\.h>", r"#include\s*<sys/",
        r"\bsystem\s*\(", r"\bexecl?[vpe]*\s*\(", r"\bfork\s*\(", 
        r"\bpopen\s*\(", r"\bsocket\s*\(",
    ],
}
_BLOCKED_PATTERNS["cpp"] = _BLOCKED_PATTERNS["c"]

def _validate_code_ast(code: str, language: str):
    if language.lower() != "python": return
    try:
        tree = _ast.parse(code)
    except SyntaxError as e:
        raise HTTPException(status_code=400, detail=f"Syntax error: {e}")
        
    BLOCKED_IMPORTS = {"os", "subprocess", "shutil", "socket", "http", "urllib", "requests", "pathlib", "inspect", "__builtin__"}
    BLOCKED_CALLS = {"__import__", "exec", "eval", "compile", "globals", "locals", "getattr", "hasattr", "type", "vars", "dir", "open"}
    
    class CodeValidator(_ast.NodeVisitor):
        def __init__(self):
            self.violations = []
        def visit_Import(self, node):
            for alias in node.names:
                if alias.name.split(".")[0] in BLOCKED_IMPORTS:
                    self.violations.append(f"Blocked import: {alias.name}")
            self.generic_visit(node)
        def visit_ImportFrom(self, node):
            if node.module and node.module.split(".")[0] in BLOCKED_IMPORTS:
                self.violations.append(f"Blocked import: {node.module}")
            self.generic_visit(node)
        def visit_Call(self, node):
            func_name = getattr(node.func, "id", getattr(node.func, "attr", None))
            if func_name in BLOCKED_CALLS:
                self.violations.append(f"Blocked call: {func_name}()")
            self.generic_visit(node)
        def visit_Attribute(self, node):
            obj_name = getattr(node.value, "id", None)
            if obj_name in BLOCKED_IMPORTS:
                self.violations.append(f"Blocked access: {obj_name}.{node.attr}")
            if node.attr.startswith("__") and node.attr.endswith("__"):
                self.violations.append(f"Blocked dunder: {node.attr}")
            self.generic_visit(node)
            
    validator = CodeValidator()
    validator.visit(tree)
    if validator.violations:
        raise HTTPException(status_code=400, detail=f"Code blocked: {'; '.join(validator.violations[:3])}")

def _validate_code(code: str, language: str):
    patterns = _BLOCKED_PATTERNS.get(language, [])
    for pattern in patterns:
        match = _re.search(pattern, code)
        if match:
            raise HTTPException(status_code=400, detail=f"Blocked: '{match.group()}' is not allowed.")
    _validate_code_ast(code, language)

TIMEOUT_CONFIG = {
    "python": 15.0,
    "javascript": 15.0,
    "c": 65.0,
    "cpp": 65.0,
    "java": 50.0,
    "sql": 15.0,
}

@router.post("/execute")
@limiter.limit("30/minute")
async def execute_code(request: Request, req: CodeExecuteRequest, user: dict = Depends(get_current_user)):
    _validate_code(req.code, req.language.lower())
    lang_timeout = TIMEOUT_CONFIG.get(req.language.lower(), 65.0)

    @tenacity.retry(
        stop=tenacity.stop_after_attempt(3),
        wait=tenacity.wait_exponential(multiplier=1, min=1, max=10),
        retry=tenacity.retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
        reraise=True
    )
    async def _do_request():
        resp = await _http_client.post(
            f"{code_runner_url}/run",
            json={"language": req.language, "code": req.code, "test_input": req.test_input},
            timeout=lang_timeout
        )
        if resp.status_code == 400:
            raise HTTPException(status_code=400, detail=resp.json().get("detail", "Error"))
        if resp.status_code in [502, 503, 504]:
            raise httpx.RequestError("Code runner gateway timeout")
        if resp.status_code != 200:
            raise HTTPException(status_code=503, detail="Code runner service unavailable")
        return resp.json()

    try:
        return await _do_request()
    except HTTPException:
        raise
    except Exception as e:
        return {"output": "", "error": str(e)[:500], "exit_code": -1}

from app.services.ai_service import generate_code_review, generate_coach_stream
from app.utils.ast_parser import strip_comments_advanced
from arq import create_pool
from arq.connections import RedisSettings
from arq.jobs import Job, JobStatus
import os

# Singleton ARQ Redis Pool
_arq_pool = None

async def get_arq_pool():
    global _arq_pool
    if _arq_pool is None:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        _arq_pool = await create_pool(RedisSettings.from_dsn(redis_url))
    return _arq_pool

@router.post("/review")
@limiter.limit("10/minute")
async def request_code_review(request: Request, req: CodeReviewRequest, user: dict = Depends(get_current_user)):
    _validate_code(req.code, req.language.lower())
    
    # 1. MATHEMATICAL AST PARSING (ANTI-INJECTION)
    scrubbed_code = strip_comments_advanced(req.code, req.language)
    
    # 2. ENQUEUE JOB LOCALLY OR VIA REDIS (ARQ PURE ASYNC)
    job_payload = {
        "code": scrubbed_code,
        "language": req.language,
        "output": req.output,
        "error": req.error,
        "execution_time_ms": req.execution_time_ms,
        "memory_usage_mb": req.memory_usage_mb
    }
    
    try:
        pool = await get_arq_pool()
        job = await pool.enqueue_job("process_ai_review_task", job_payload)
        return {"task_id": job.job_id, "status": "processing", "message": "Code submitted to ARQ queue"}
    except Exception as e:
        print(f"ARQ Redis connection failed: {e}")
        # Graceful fallback: Execute synchronously if ARQ isn't active
        fallback_json = await generate_code_review(**job_payload)
        return {"task_id": "sync-fallback", "status": "completed", "review": fallback_json}

@router.get("/review_status/{task_id}")
async def get_review_status(task_id: str, request: Request, user: dict = Depends(get_current_user)):
    if task_id == "sync-fallback":
        return {"status": "processing"} # The client already has the data if sync didn't fail
        
    try:
        pool = await get_arq_pool()
        job = Job(task_id, pool)
        status = await job.status()
        
        if status == JobStatus.not_found:
            raise HTTPException(status_code=404, detail="Task not found in ARQ queue.")
            
        if status == JobStatus.complete:
            info = await job.info()
            return info.result # Returns the dictionary from arq_worker.py
            
        return {"status": "processing"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Async Broker Disconnected")

@router.post("/coach")
@limiter.limit("20/minute")
async def request_code_coach(request: Request, req: CoachMessageRequest, user: dict = Depends(get_current_user)):
    _validate_code(req.code, req.language.lower())
    
    # Optional logic to enforce context size: we take last 6 messages
    recent_messages = req.messages[-6:]
    
    return StreamingResponse(
        generate_coach_stream(
            messages=recent_messages,
            current_code=req.code,
            language=req.language,
            output=req.output,
            error=req.error,
            challenge_title=req.challenge_title,
            challenge_description=req.challenge_description
        ),
        media_type="text/plain"
    )
