import asyncio
import httpx
import time
import os

code_runner_url = os.environ.get("CODE_RUNNER_URL", "https://acadmix-code-runner.fly.dev")

async def test_reused():
    print(f"Pinging {code_runner_url}...")
    async with httpx.AsyncClient() as client:
        # Warmup loop
        for i in range(2):
            t0 = time.time()
            resp = await client.post(
                f"{code_runner_url}/run",
                json={"language": "python", "code": "print('hello, world!')", "test_input": ""},
                timeout=10
            )
            t1 = time.time()
            print(f"Reused connection try {i+1}: {(t1-t0)*1000:.2f} ms | Status: {resp.status_code}")

async def test_fresh():
    for i in range(2):
        t0 = time.time()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{code_runner_url}/run",
                json={"language": "python", "code": "print('hello, world!')", "test_input": ""},
                timeout=10
            )
        t1 = time.time()
        print(f"Fresh connection try {i+1}: {(t1-t0)*1000:.2f} ms | Status: {resp.status_code}")

if __name__ == "__main__":
    asyncio.run(test_reused())
    asyncio.run(test_fresh())
