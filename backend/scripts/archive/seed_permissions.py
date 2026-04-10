import asyncio
from database import AdminSessionLocal
from sqlalchemy.future import select
from app import models
import uuid

async def seed_permissions():
    async with AdminSessionLocal() as session:
        # We need a college_id to seed roles under. For this project, GNITC is the default.
        result = await session.execute(select(models.College))
        colleges = result.scalars().all()
        if not colleges:
            print("No colleges found to seed roles under.")
            colleges = [models.College(id=str(uuid.uuid4()), name="GNITC", code="GNITC")]
            session.add(colleges[0])
            await session.flush()
            
        college_id = colleges[0].id

        target_roles = ["teacher", "hod", "exam_cell"]
        
        ROLE_PERMISSIONS = {
            "teacher": {"quizzes": ["create", "edit", "delete", "publish", "view"], "marks": ["create", "edit", "delete", "publish", "view"]},
            "hod": {"marks": ["create", "edit", "delete", "publish", "view"], "placements": ["create", "edit", "delete", "publish", "view"], "leaves": ["approve", "reject", "view"]},
            "exam_cell": {"marks": ["create", "edit", "delete", "publish", "view"]}
        }

        result = await session.execute(select(models.Role))
        existing_roles = list(result.scalars().all())
        existing_names = {r.name for r in existing_roles}
        
        updated = 0
        added = 0
        
        for role_name in target_roles:
            perms = ROLE_PERMISSIONS.get(role_name, {})
                
            if role_name in existing_names:
                role_obj = next(r for r in existing_roles if r.name == role_name)
                role_obj.permissions = perms
                role_obj.updated_at = __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
                updated += 1
            else:
                new_role = models.Role(
                    college_id=college_id,
                    name=role_name,
                    permissions=perms
                )
                session.add(new_role)
                added += 1
                
        await session.commit()
        print(f"Permissions seeded. Roles added: {added}. Roles updated: {updated}.")

if __name__ == "__main__":
    asyncio.run(seed_permissions())
