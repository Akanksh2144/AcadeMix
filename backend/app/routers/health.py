from datetime import datetime, timezone
from fastapi import APIRouter

from app.schemas import *
router = APIRouter()

@router.get("/")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@router.get("/test-sentry")
async def test_sentry():
    """Intentional crash to verify Sentry connection and PII scrubbing."""
    division_by_zero = 1 / 0
    return {"message": "If you see this, Sentry didn't catch the intentional crash!"}
