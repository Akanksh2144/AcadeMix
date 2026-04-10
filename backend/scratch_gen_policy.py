import asyncio
from database import AdminSessionLocal
from sqlalchemy import text

async def main():
    async with AdminSessionLocal() as s:
        # Find all policies named 'tenant_isolation'
        res = await s.execute(text("""
            SELECT c.relname
            FROM pg_policy p
            JOIN pg_class c ON p.polrelid = c.oid
            WHERE p.polname = 'tenant_isolation'
        """))
        tables = [row[0] for row in res.all()]
        print("TABLES WITH TENANT_ISOLATION POLICY:", len(tables), tables)

if __name__ == "__main__":
    asyncio.run(main())
