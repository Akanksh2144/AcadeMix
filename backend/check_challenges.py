import asyncio
import asyncpg
import json
from urllib.parse import urlparse

# settings.DATABASE_URL
db_url = "postgresql+asyncpg://postgres:postgres@localhost/acadmix_test"

async def dump_challenges():
    print("Connecting to DB:", db_url)
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost/acadmix_test")
    rows = await conn.fetch('SELECT id, title, difficulty, is_deleted FROM coding_challenges')
    print("Found rows:", len(rows))
    for r in rows:
        print(dict(r))
    await conn.close()

if __name__ == "__main__":
    asyncio.run(dump_challenges())
