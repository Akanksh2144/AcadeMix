import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv(r'C:\AcadMix\backend\.env')
engine = create_async_engine(os.environ.get('DATABASE_URL'), connect_args={'statement_cache_size': 0})

async def seed():
    async with AsyncSession(engine) as session:
        # Just update EXP001 without deleting QuestionPapers
        await session.execute(text("UPDATE public.users SET role='expert', name='Dr. S. K. Sharma', password_hash='$2b$12$Z0b0wE8t8P0D1H2l.b0N5OFJk/W9.vJ1/Vp/A.s7Q3Lq1b8Z2/U2i' WHERE id='EXP001'"))
        await session.commit()
        print("Updated EXP001 role")

asyncio.run(seed())
