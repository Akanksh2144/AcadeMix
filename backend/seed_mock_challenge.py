import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

from app.core.config import settings
from app.models import CodingChallenge

async def seed_challenges():
    engine = create_async_engine(
        settings.DATABASE_URL,
        connect_args={"server_settings": {"statement_timeout": "10000"}, "statement_cache_size": 0}
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("Looking for existing challenges...")
        cr = await db.execute(select(CodingChallenge))
        existing = cr.scalars().all()
        if len(existing) >= 3:
            print(f"{len(existing)} challenges already exist. Skipping seed.")
            return

        print("Seeding 3 mock challenges...")

        db.add(CodingChallenge(
            title="Two Sum",
            description="<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.</p>\n<p>You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.</p>",
            difficulty="Easy",
            topics=["Array", "Hash Table"],
            language_support=["python", "javascript", "java", "c", "cpp"],
        ))

        db.add(CodingChallenge(
            title="Valid Palindrome",
            description="<p>A phrase is a <strong>palindrome</strong> if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.</p>\n<p>Given a string s, return true if it is a palindrome, or false otherwise.</p>",
            difficulty="Easy",
            topics=["Two Pointers", "String"],
            language_support=["python", "javascript", "java", "c", "cpp"],
        ))
        
        db.add(CodingChallenge(
            title="Reverse String",
            description="<p>Write a function that reverses a string. The input string is given as an array of characters s.</p>",
            difficulty="Easy",
            topics=["Two Pointers", "String"],
            language_support=["python", "javascript", "java", "c", "cpp"],
        ))

        await db.commit()
        print("Successfully seeded 3 mock challenges!")

if __name__ == "__main__":
    asyncio.run(seed_challenges())
