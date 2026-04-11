import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def check():
    engine = create_async_engine(
        settings.DATABASE_URL,
        connect_args={"server_settings": {"statement_timeout": "10000"}, "statement_cache_size": 0}
    )
    async with engine.connect() as conn:
        for t in ["coding_challenges", "quiz_attempts", "user_permissions", "users", "colleges"]:
            try:
                res = await conn.execute(text(f"SELECT COUNT(*) FROM {t}"))
                count = res.scalar()
                print(f"Table '{t}' has {count} rows.")
            except Exception as e:
                print(f"Table '{t}' ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(check())
