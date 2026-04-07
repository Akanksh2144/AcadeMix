import asyncio
from database import SessionLocal, engine
import models
from server import pwd_context
from sqlalchemy.future import select

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
        
    async with SessionLocal() as session:
        # College ID from GNITC
        college_id = "GNITC"
        
        # 1. Ensure College & InstitutionProfile exists (assumed they do)
        
        # 2. Check if Company exists or create it
        res = await session.execute(select(models.Company).filter_by(college_id=college_id, name="TechCorp Solutions"))
        company = res.scalars().first()
        if not company:
            company = models.Company(
                college_id=college_id,
                name="TechCorp Solutions",
                sector="Software Development"
            )
            session.add(company)
            await session.commit()
            print("Created Company: TechCorp Solutions")
        else:
            print("Company TechCorp already exists.")
            
        # 3. Create Industry User Profile
        user_res = await session.execute(select(models.User).filter_by(id="IND001"))
        user = user_res.scalars().first()
        
        if not user:
            user = models.User(
                id="IND001",
                college_id=college_id,
                name="Aisha Sharma (TechCorp)",
                email="aisha@techcorp.com",
                role="industry",
                password_hash=pwd_context.hash("industry123"),
                profile_data={
                    "company_id": company.id,
                    "company_name": "TechCorp Solutions",
                    "designation": "University Relations Manager",
                    "industry_sector": "Software Development",
                    "phone": "9876543210"
                }
            )
            session.add(user)
            await session.commit()
            print("Created User IND001 (Industry Role)")
        else:
            print("User IND001 already exists.")
            
            # just make sure profile_data defines company_id
            if 'company_id' not in (user.profile_data or {}):
                user.profile_data = {
                    "company_id": company.id,
                    "company_name": "TechCorp Solutions",
                    "designation": "University Relations Manager",
                    "industry_sector": "Software Development",
                    "phone": "9876543210"
                }
                session.add(user)
                await session.commit()
                print("Updated IND001 with company logic.")

        # 4. Create an IndustryProject
        proj_res = await session.execute(select(models.IndustryProject).filter_by(company_id=company.id))
        proj = proj_res.scalars().first()
        if not proj:
            proj = models.IndustryProject(
                college_id=college_id,
                company_id=company.id,
                proposed_by=user.id,
                title="AI Resume Parser Intern",
                description="Build a robust AI resume parser using NLP to extract skills and match them to job descriptions.",
                domain="Artificial Intelligence",
                max_students=3,
                stipend_if_any=10000.0,
                duration_weeks=12,
                status="approved"
            )
            session.add(proj)
            await session.commit()
            print("Created seed Industry Project")
            
        print("\nSeed completion status: SUCCESS")

if __name__ == "__main__":
    asyncio.run(main())
