import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        res = await client.post("http://127.0.0.1:8000/api/code/review", json={
            "language": "python",
            "code": "print('hello')",
            "output": "",
            "error": "",
            "execution_time_ms": 100
        })
        print(res.status_code)
        print(res.text)

asyncio.run(test())
