from app.core.limiter import limiter
from app.core.config import settings
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import httpx
import tenacity

from database import get_db
from app.core.security import get_current_user
from app.core.security import require_role
from app import models
import app.schemas as server_schemas
from app.schemas import *

# Global Connection Pool HTTP Client for extreme latency reduction
_http_client = httpx.AsyncClient(
    limits=httpx.Limits(max_keepalive_connections=100, max_connections=200),
    timeout=httpx.Timeout(65.0, connect=5.0)
)

TIMEOUT_CONFIG = {
    "python": 15.0,
    "javascript": 15.0,
    "c": 65.0,
    "cpp": 65.0,
    "java": 50.0,
    "sql": 15.0,
}

router = APIRouter()

@router.get("/challenges")
async def get_challenges(page: int = 1, limit: int = 20, difficulty: str = "", topic: str = "", session: AsyncSession = Depends(get_db)):
    stmt = select(models.CodingChallenge)
    if difficulty:
        stmt = stmt.where(models.CodingChallenge.difficulty == difficulty)
    
    result = await session.execute(stmt)
    all_challenges = result.scalars().all()
    if topic:
        all_challenges = [c for c in all_challenges if topic in (c.topics or [])]
        
    start = (page - 1) * limit
    page_data = all_challenges[start : start + limit]
    
    return {
        "data": [{"id": c.id, "title": c.title, "description": c.description, "difficulty": c.difficulty, "topics": c.topics, "language_support": c.language_support} for c in page_data],
        "total": len(all_challenges),
        "page": page,
        "limit": limit
    }


@router.get("/challenges/stats")
async def get_challenge_stats(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    stmt = select(models.CodingChallenge).join(
        models.ChallengeProgress,
        models.CodingChallenge.id == models.ChallengeProgress.challenge_id
    ).where(
        models.ChallengeProgress.student_id == user["id"],
        models.ChallengeProgress.status == "completed"
    )
    cr = await session.execute(stmt)
    solved_challenges = cr.scalars().all()
    
    easy = medium = hard = 0
    topics_count = {}
    
    for c in solved_challenges:
        d = getattr(c, "difficulty", "easy").lower()
        if d == "easy": easy += 1
        elif d == "medium": medium += 1
        elif d == "hard": hard += 1
        for t in (c.topics or []):
            topics_count[t] = topics_count.get(t, 0) + 1
            
    return {"total_solved": len(solved_challenges), "difficulty": {"Easy": easy, "Medium": medium, "Hard": hard}, "topics": topics_count}


@router.post("/challenges/submit")
@limiter.limit("30/minute")
async def submit_challenge(request: Request, req: ChallengeSubmit, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    cr = await session.execute(select(models.CodingChallenge).where(models.CodingChallenge.id == req.challenge_id))
    challenge = cr.scalars().first()
    
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
        
    init_sql_script = ""
    # Inject the SQL datasets for DataLemur style tests
    if req.language.lower() == "sql" and challenge.init_code:
        init_sql_script = challenge.init_code.get("sql", "")
        
    lang_timeout = TIMEOUT_CONFIG.get(req.language.lower(), 60.0)

    @tenacity.retry(
        stop=tenacity.stop_after_attempt(3),
        wait=tenacity.wait_exponential(multiplier=1, min=1, max=10),
        retry=tenacity.retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
        reraise=True
    )
    async def _do_request():
        return await _http_client.post(
            f"{settings.CODE_RUNNER_URL}/run",
            json={"language": req.language, "code": req.code, "test_input": init_sql_script},
            timeout=lang_timeout
        )

    try:
        resp = await _do_request()
        
        if resp.status_code == 200:
            result = resp.json()
            exit_code = result.get("exit_code", -1)
            
            is_success = (exit_code == 0)
            
            if is_success:
                pr = await session.execute(select(models.ChallengeProgress).where(models.ChallengeProgress.student_id == user["id"], models.ChallengeProgress.challenge_id == req.challenge_id))
                prog = pr.scalars().first()
                if not prog:
                    prog = models.ChallengeProgress(
                        college_id=user.get("college_id"),
                        student_id=user["id"], 
                        challenge_id=req.challenge_id, 
                        status="completed", 
                        language_used=req.language
                    )
                    session.add(prog)
                else:
                    prog.status = "completed"
                await session.commit()
                
            return {"output": result.get("output", ""), "error": result.get("error", ""),
                    "exit_code": exit_code, "success": is_success}
        return {"error": "Code runner service error", "exit_code": -1, "success": False}
    except Exception as e:
        return {"error": str(e), "exit_code": -1, "success": False}
