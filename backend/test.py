import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # First we need to login as Dr. M. I. Tariq Hussain
        r = await client.post('http://127.0.0.1:8000/api/auth/login', json={
            "college_id": "T010",
            "password": "teacher123"
        })
        print("Login status:", r.status_code)
        print("Login response:", r.json())
        
        token = r.json().get('access_token')
        if token:
            headers = {"Authorization": f"Bearer {token}"}
            # Also try getting the dashboard
            r2 = await client.get('http://127.0.0.1:8000/api/dashboard/hod', headers=headers)
            print("Dashboard status:", r2.status_code)
            print("Dashboard response:", r2.text)

if __name__ == "__main__":
    asyncio.run(main())
