import asyncio
import os
from fastapi import Request
from unittest.mock import MagicMock
from app.core.security import get_current_user
from database import AsyncSessionLocal
import jwt

os.environ["JWT_SECRET"] = "C[8#!(_I]q%_xi7ekI!gW4b1I+eD,LOx"

async def main():
    token = jwt.encode({"sub": "no-exist", "type": "access"}, "C[8#!(_I]q%_xi7ekI!gW4b1I+eD,LOx", algorithm="HS256")
    req = MagicMock(spec=Request)
    req.cookies.get.return_value = token
    req.headers.get.return_value = ""
    
    async with AsyncSessionLocal() as session:
        try:
            await get_current_user(req, session)
            print("WORKED")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
