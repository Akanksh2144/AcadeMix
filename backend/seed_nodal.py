import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from passlib.context import CryptContext
from database import engine, AsyncSessionLocal
import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_nodal():
    async with AsyncSessionLocal() as session:
        # Create or update Nodal Officer
        result = await session.execute(select(models.User).where(models.User.id == "NODAL001"))
        nodal = result.scalars().first()
        
        if not nodal:
            nodal = models.User(
                id="NODAL001",
                email="nodal@dhte.gov",
                name="Sanjay Administrator",
                role="nodal_officer",
                college_id=None,
                password_hash=pwd_context.hash("nodal123")
            )
            session.add(nodal)
        else:
            nodal.college_id = None
            nodal.role = "nodal_officer"
        
        await session.commit()
        print("Nodal Officer 'NODAL001' configured.")
        
        # Get all colleges
        col_res = await session.execute(select(models.College))
        colleges = col_res.scalars().all()
        
        # Clear existing jurisdictions for NODAL001
        j_res = await session.execute(select(models.NodalOfficerJurisdiction).where(models.NodalOfficerJurisdiction.nodal_officer_id == "NODAL001"))
        existing_js = j_res.scalars().all()
        for j in existing_js:
            await session.delete(j)
        await session.commit()
        
        # Add jurisdictional mapping for all existing colleges
        new_js = []
        for c in colleges:
            new_js.append(models.NodalOfficerJurisdiction(
                nodal_officer_id="NODAL001",
                college_id=c.id,
                assigned_by=None,
                is_active=True
            ))
            
        if new_js:
            session.add_all(new_js)
            await session.commit()
            print(f"Mapped NODAL001 to {len(new_js)} colleges.")
        else:
            print("No colleges found to map.")

if __name__ == "__main__":
    asyncio.run(seed_nodal())

