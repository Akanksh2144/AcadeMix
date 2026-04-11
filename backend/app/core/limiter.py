import redis.asyncio as pyredis
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

redis_url = settings.REDIS_URL
redis_client = pyredis.from_url(redis_url) if redis_url else None
limiter = Limiter(key_func=get_remote_address, storage_uri=redis_url) if redis_url else Limiter(key_func=get_remote_address)
