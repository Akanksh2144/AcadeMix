import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # First login as Tariq
        r = await client.post('https://academix-backend.vercel.app/api/auth/login', json={
            "college_id": "T010",
            "password": "teacher123"
        })
        print("Login status:", r.status_code)
        if r.status_code != 200:
            print("Login failed:", r.text)
            return
            
        token = r.json().get('access_token')
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test hod dashboard
        r2 = await client.get('https://academix-backend.vercel.app/api/dashboard/hod', headers=headers)
        print("HOD Dash:", r2.status_code)
        print(r2.text)

if __name__ == "__main__":
    # Note: vercel backend is usually at the vercel url, but wait I don't know the vercel URL.
    pass
