import asyncio
import traceback
from fastapi import Request
from unittest.mock import MagicMock
from database import AsyncSessionLocal
from app.core.security import get_current_user

async def main():
    async with AsyncSessionLocal() as session:
        req = MagicMock(spec=Request)
        req.cookies.get.return_value = "dummy"
        req.headers.get.return_value = "Bearer INVALID"
        try:
            await get_current_user(req, session)
        except Exception as e:
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
