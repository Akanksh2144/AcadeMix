import asyncio
import os
import jwt
from fastapi import Request
from unittest.mock import MagicMock
from sqlalchemy.future import select

# Setup
os.environ["JWT_SECRET"] = os.environ.get("JWT_SECRET", "C[8#!(_I]q%_xi7ekI!gW4b1I+eD,LOx")

from database import AsyncSessionLocal
from app import models
from app.core.security import get_current_user, create_access_token

async def main():
    async with AsyncSessionLocal() as session:
        # Get first user
        result = await session.execute(select(models.User).limit(1))
        user = result.scalars().first()
        if not user:
            print("No users in DB!")
            return
            
        print(f"Found User: {user.email} (Role: {user.role}, College ID: {user.college_id})")
        token = create_access_token(user.id, user.role, user.college_id)
        
        req = MagicMock(spec=Request)
        req.cookies.get.return_value = token
        req.headers.get.return_value = ""
        
        print("Calling get_current_user...")
        try:
            user_out = await get_current_user(req, session)
            print("Successfully retrieved user:", user_out)
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"FAILED WITH {e.__class__.__name__}: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
