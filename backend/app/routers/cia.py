from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from database import get_db
from app.core.security import get_current_user
from app.core.security import require_role
from app.services.cia_service import CIAService
import app.schemas as server_schemas
from app.schemas import *

router = APIRouter()

def get_cia_service(session: AsyncSession = Depends(get_db)):
    return CIAService(session)

@router.post("/admin/cia-templates")
async def create_cia_template(
    req: server_schemas.CIATemplateCreate, 
    user: dict = Depends(require_role("admin")), 
    svc: CIAService = Depends(get_cia_service)
):
    tmpl = await svc.create_template(req, user)
    return {"id": tmpl.id, "name": tmpl.name, "total_marks": tmpl.total_marks, "message": "Template created"}

@router.get("/admin/cia-templates")
async def list_cia_templates(
    user: dict = Depends(require_role("admin")), 
    svc: CIAService = Depends(get_cia_service)
):
    tmpls = await svc.list_templates(user["college_id"])
    return [{"id": t.id, "name": t.name, "description": t.description,
             "total_marks": t.total_marks, "components": t.components,
             "created_at": t.created_at.isoformat() if t.created_at else None}
            for t in tmpls]

@router.put("/admin/cia-templates/{template_id}")
async def update_cia_template(
    template_id: str, 
    req: server_schemas.CIATemplateUpdate, 
    user: dict = Depends(require_role("admin")), 
    svc: CIAService = Depends(get_cia_service)
):
    await svc.update_template(template_id, req, user["college_id"])
    return {"message": "Template updated"}

@router.delete("/admin/cia-templates/{template_id}")
async def delete_cia_template(
    template_id: str, 
    user: dict = Depends(require_role("admin")), 
    svc: CIAService = Depends(get_cia_service)
):
    await svc.delete_template(template_id, user["college_id"])
    return {"message": "Template deleted"}

@router.post("/admin/cia-config")
async def create_cia_config(
    req: server_schemas.SubjectCIAConfigCreate, 
    user: dict = Depends(require_role("admin")), 
    svc: CIAService = Depends(get_cia_service)
):
    cfg = await svc.create_config(req, user)
    return {"id": cfg.id, "message": "CIA config created"}

@router.get("/admin/cia-config")
async def list_cia_configs(
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
    user: dict = Depends(require_role("admin")),
    svc: CIAService = Depends(get_cia_service)
):
    cfgs = await svc.list_configs(user["college_id"], academic_year, semester)
    return [
        {"id": c.id, "subject_code": c.subject_code, "subject_name": c.subject_name,
         "academic_year": c.academic_year, "semester": c.semester,
         "template_id": c.template_id, "is_consolidation_enabled": c.is_consolidation_enabled}
        for c in cfgs
    ]

@router.put("/admin/cia-config/{config_id}/enable-consolidation")
async def toggle_cia_consolidation(
    config_id: str,
    enabled: bool = True,
    user: dict = Depends(require_role("admin")),
    svc: CIAService = Depends(get_cia_service)
):
    return await svc.toggle_consolidation(config_id, enabled, user)

@router.get("/subjects/{subject_code}/cia-template")
async def get_subject_cia_template(
    subject_code: str,
    academic_year: str = "2024-25",
    semester: Optional[int] = None,
    user: dict = Depends(get_current_user),
    svc: CIAService = Depends(get_cia_service)
):
    return await svc.get_subject_template(subject_code, user["college_id"], academic_year, semester)

@router.get("/faculty/cia-dashboard")
async def get_faculty_cia_dashboard(
    user: dict = Depends(require_role("teacher", "faculty", "hod")),
    svc: CIAService = Depends(get_cia_service)
):
    return await svc.get_faculty_dashboard(user)

@router.get("/admin/cia-config-coverage")
async def get_cia_config_coverage(
    semester: int, 
    academic_year: str, 
    user: dict = Depends(require_role("admin")),
    svc: CIAService = Depends(get_cia_service)
):
    return await svc.get_cia_config_coverage(semester, academic_year, user)
