import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Supabase Transaction Pooler (port 6543) — optimized connection settings:
# - pool_size=5: maintain 5 warm connections (avoids cold-start penalty)
# - max_overflow=10: allow burst up to 15 total
# - pool_timeout=30: fail fast instead of waiting minutes
# - pool_pre_ping=True: test connections before use (avoids stale-connection errors)
# - pool_recycle=300: recycle connections every 5 min (Supabase drops idle connections after ~10 min)
# - connect_args statement_cache_size=0: required for pgBouncer transaction mode
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=300,
    pool_pre_ping=True,
    connect_args={
        "statement_cache_size": 0,
        "timeout": 20,           # asyncpg connection timeout (seconds)
        "command_timeout": 30,   # per-query timeout
    }
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
