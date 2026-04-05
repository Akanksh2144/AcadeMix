import asyncio

async def test():
    proc = await asyncio.create_subprocess_exec(
        "C:\\Python312\\python.EXE", "-c", "print('Hello World')",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    print("stdout:", repr(stdout))
    print("stderr:", repr(stderr))
    print("rc:", proc.returncode)

asyncio.run(test())
