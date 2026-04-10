import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get("http://localhost:8000/api/health")
            print("STATUS CODE:", res.status_code)
        except Exception as e:
            print("ERROR connecting:", e)

if __name__ == "__main__":
    asyncio.run(main())
