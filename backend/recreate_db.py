import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from database import Base
import app.models

async def create_tables():
    engine = create_async_engine(
        settings.DATABASE_URL,
        connect_args={"server_settings": {"statement_timeout": "10000"}, "statement_cache_size": 0}
    )
    async with engine.begin() as conn:
        print("Creating all tables from Base.metadata...")
        await conn.run_sync(Base.metadata.create_all)
    print("Done!")

if __name__ == "__main__":
    asyncio.run(create_tables())
