import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.post('http://127.0.0.1:8000/api/auth/login', json={
            "college_id": "T010",
            "password": "teacher123"
        })
        token = r.json().get('access_token')
        if token:
            headers = {"Authorization": f"Bearer {token}"}
            r2 = await client.get('http://127.0.0.1:8000/api/dashboard/teacher', headers=headers)
            print("Status:", r2.status_code)
            print("Response:", r2.text)

if __name__ == "__main__":
    asyncio.run(main())
