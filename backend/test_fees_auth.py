"""Login as student and hit /fees/due to see the exact error."""
import asyncio
import aiohttp

async def test_fees():
    async with aiohttp.ClientSession() as session:
        # 1. Login
        login_r = await session.post("http://localhost:8001/api/auth/login", json={
            "college_id": "22WJ8A6745",
            "password": "22WJ8A6745"
        })
        login_data = await login_r.json()
        if login_r.status != 200:
            print(f"Login failed: {login_r.status} {login_data}")
            return
        
        token = login_data.get("access_token")
        print(f"Login OK, token={token[:20]}...")
        
        # 2. Hit /fees/due
        fees_r = await session.get("http://localhost:8001/api/fees/due", headers={
            "Authorization": f"Bearer {token}"
        })
        print(f"Fees status: {fees_r.status}")
        fees_data = await fees_r.text()
        print(f"Fees response: {fees_data[:500]}")

asyncio.run(test_fees())
