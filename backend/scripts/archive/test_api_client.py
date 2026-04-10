import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from database import AsyncSessionLocal
from app import models
from sqlalchemy.future import select

async def main():
    async with AsyncSessionLocal() as session:
        r = await session.execute(select(models.User).limit(1))
        user = r.scalars().first()
        token = create_access_token(user.id, user.role, user.college_id)
        
        client = TestClient(app)
        res = client.post(
            "/api/code/execute", 
            json={"language": "python", "code": "def main(): print('Hello, World!')\nmain()"},
            headers={"Authorization": f"Bearer {token}"}
        )
        print("Execute:", res.status_code, res.text)

if __name__ == "__main__":
    asyncio.run(main())
