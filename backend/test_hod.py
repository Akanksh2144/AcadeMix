"""Test HOD dashboard endpoint."""
import asyncio, aiohttp

async def test():
    async with aiohttp.ClientSession() as session:
        r = await session.post("http://localhost:8001/api/auth/login", json={"college_id": "HOD001", "password": "hod123"})
        data = await r.json()
        if r.status != 200:
            print(f"Login failed: {r.status} {data}")
            return
        token = data["access_token"]
        print(f"Login OK")

        r2 = await session.get("http://localhost:8001/api/dashboard/hod", headers={"Authorization": f"Bearer {token}"})
        print(f"Dashboard status: {r2.status}")
        body = await r2.text()
        print(f"Response: {body[:500]}")

asyncio.run(test())
