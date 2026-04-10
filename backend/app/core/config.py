import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.security import redis_url

if redis_url:
    limiter = Limiter(key_func=get_remote_address, storage_uri=redis_url)
else:
    limiter = Limiter(key_func=get_remote_address)

code_runner_url = os.environ.get("CODE_RUNNER_URL", "https://acadmix-code-runner.fly.dev")
