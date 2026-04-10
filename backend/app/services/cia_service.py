from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional, Dict, Any

from app import models
from app.core.audit import log_audit

class CIAService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_template(self, req, user: dict) -> models.CIATemplate:
        comp_sum = sum(c.get("max_marks", 0) for c in req.components)
        if comp_sum != req.total_marks:
            raise HTTPException(status_code=400, detail=f"Component max_marks sum ({comp_sum}) must equal total_marks ({req.total_marks})")

        tmpl = models.CIATemplate(
            college_id=user["college_id"],
            name=req.name,
            description=req.description,
            total_marks=req.total_marks,
            components=req.components,
        )
        self.session.add(tmpl)
        await log_audit(self.session, user["id"], "cia_template", "create", {"name": req.name})
        await self.session.commit()
        await self.session.refresh(tmpl)
        return tmpl

    async def list_templates(self, college_id: str) -> List[models.CIATemplate]:
        result = await self.session.execute(
            select(models.CIATemplate).where(models.CIATemplate.college_id == college_id)
        )
        return result.scalars().all()

    async def update_template(self, template_id: str, req, college_id: str) -> bool:
        result = await self.session.execute(
            select(models.CIATemplate).where(
                models.CIATemplate.id == template_id,
                models.CIATemplate.college_id == college_id
            )
        )
        tmpl = result.scalars().first()
        if not tmpl:
            raise HTTPException(status_code=404, detail="Template not found")

        if req.name is not None: tmpl.name = req.name
        if req.description is not None: tmpl.description = req.description
        if req.total_marks is not None: tmpl.total_marks = req.total_marks
        if req.components is not None:
            comp_sum = sum(c.get("max_marks", 0) for c in req.components)
            if comp_sum != (req.total_marks or tmpl.total_marks):
                raise HTTPException(status_code=400, detail=f"Component max_marks sum ({comp_sum}) must equal total_marks")
            tmpl.components = req.components

        await self.session.commit()
        return True

    async def delete_template(self, template_id: str, college_id: str) -> bool:
        result = await self.session.execute(
            select(models.CIATemplate).where(
                models.CIATemplate.id == template_id,
                models.CIATemplate.college_id == college_id
            )
        )
        tmpl = result.scalars().first()
        if not tmpl:
            raise HTTPException(status_code=404, detail="Template not found")
        
        ref_r = await self.session.execute(
            select(models.SubjectCIAConfig).where(models.SubjectCIAConfig.template_id == template_id)
        )
        if ref_r.scalars().first():
            raise HTTPException(status_code=400, detail="Template is in use by a subject config. Remove config first.")
            
        tmpl.is_deleted = True
        await self.session.commit()
        return True

    async def create_config(self, req, user: dict) -> models.SubjectCIAConfig:
        tmpl_r = await self.session.execute(
            select(models.CIATemplate).where(
                models.CIATemplate.id == req.template_id,
                models.CIATemplate.college_id == user["college_id"]
            )
        )
        if not tmpl_r.scalars().first():
            raise HTTPException(status_code=404, detail="CIA template not found")

        dup_r = await self.session.execute(
            select(models.SubjectCIAConfig).where(
                models.SubjectCIAConfig.college_id == user["college_id"],
                models.SubjectCIAConfig.subject_code == req.subject_code,
                models.SubjectCIAConfig.academic_year == req.academic_year,
                models.SubjectCIAConfig.semester == req.semester,
            )
        )
        if dup_r.scalars().first():
            raise HTTPException(status_code=400, detail="CIA config already exists for this subject/year/semester")

        cfg = models.SubjectCIAConfig(
            college_id=user["college_id"],
            subject_code=req.subject_code,
            subject_name=req.subject_name,
            academic_year=req.academic_year,
            semester=req.semester,
            template_id=req.template_id,
        )
        self.session.add(cfg)
        await self.session.commit()
        await self.session.refresh(cfg)
        return cfg

    async def list_configs(self, college_id: str, academic_year: Optional[str] = None, semester: Optional[int] = None) -> List[models.SubjectCIAConfig]:
        stmt = select(models.SubjectCIAConfig).where(
            models.SubjectCIAConfig.college_id == college_id
        )
        if academic_year:
            stmt = stmt.where(models.SubjectCIAConfig.academic_year == academic_year)
        if semester:
            stmt = stmt.where(models.SubjectCIAConfig.semester == semester)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def toggle_consolidation(self, config_id: str, enabled: bool, user: dict) -> Dict[str, str]:
        result = await self.session.execute(
            select(models.SubjectCIAConfig).where(
                models.SubjectCIAConfig.id == config_id,
                models.SubjectCIAConfig.college_id == user["college_id"]
            )
        )
        cfg = result.scalars().first()
        if not cfg:
            raise HTTPException(status_code=404, detail="CIA config not found")
            
        cfg.is_consolidation_enabled = enabled
        await log_audit(self.session, user["id"], "cia_config", "toggle_consolidation",
                        {"config_id": config_id, "enabled": enabled})
        await self.session.commit()
        return {"message": f"Consolidation {'enabled' if enabled else 'disabled'}", "subject": cfg.subject_code}

    async def get_subject_template(self, subject_code: str, college_id: str, academic_year: str, semester: Optional[int] = None) -> Dict[str, Any]:
        stmt = select(models.SubjectCIAConfig, models.CIATemplate).join(
            models.CIATemplate, models.SubjectCIAConfig.template_id == models.CIATemplate.id
        ).where(
            models.SubjectCIAConfig.college_id == college_id,
            models.SubjectCIAConfig.subject_code == subject_code,
            models.SubjectCIAConfig.academic_year == academic_year,
        )
        if semester:
            stmt = stmt.where(models.SubjectCIAConfig.semester == semester)
            
        result = await self.session.execute(stmt)
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="No CIA template configured for this subject")
            
        cfg, tmpl = row
        return {
            "subject_code": cfg.subject_code, "subject_name": cfg.subject_name,
            "academic_year": cfg.academic_year, "semester": cfg.semester,
            "is_consolidation_enabled": cfg.is_consolidation_enabled,
            "template": {"id": tmpl.id, "name": tmpl.name, "total_marks": tmpl.total_marks, "components": tmpl.components}
        }

    async def get_faculty_dashboard(self, user: dict) -> List[Dict[str, Any]]:
        assigns_r = await self.session.execute(
            select(models.FacultyAssignment).where(
                models.FacultyAssignment.teacher_id == user["id"]
            )
        )
        assigns = assigns_r.scalars().all()
        if not assigns:
            return []

        subject_codes = list(set(a.subject_code for a in assigns))
        configs_r = await self.session.execute(
            select(models.SubjectCIAConfig, models.CIATemplate).join(
                models.CIATemplate, models.SubjectCIAConfig.template_id == models.CIATemplate.id
            ).where(
                models.SubjectCIAConfig.college_id == user["college_id"],
                models.SubjectCIAConfig.subject_code.in_(subject_codes)
            )
        )
        config_map = {cfg.subject_code: (cfg, tmpl) for cfg, tmpl in configs_r.all()}

        marks_r = await self.session.execute(
            select(models.MarkEntry).where(
                models.MarkEntry.faculty_id == user["id"],
                models.MarkEntry.course_id.in_(subject_codes)
            )
        )
        marks_map = {(me.course_id, me.exam_type): me for me in marks_r.scalars().all()}

        result = []
        for assign in assigns:
            subject_data = {
                "assignment_id": assign.id,
                "subject_code": assign.subject_code,
                "subject_name": assign.subject_name,
                "department": assign.department,
                "batch": assign.batch,
                "section": assign.section,
                "semester": assign.semester,
                "has_cia_template": assign.subject_code in config_map,
            }

            if assign.subject_code in config_map:
                cfg, tmpl = config_map[assign.subject_code]
                components_with_status = []
                for comp in (tmpl.components or []):
                    comp_type = comp.get("type", "unknown")
                    entry = marks_map.get((assign.subject_code, comp_type))
                    
                    entry_status = "not_started"
                    entry_id = None
                    student_count = 0
                    if entry:
                        entry_status = (entry.extra_data or {}).get("status", "draft")
                        entry_id = entry.id
                        student_count = len((entry.extra_data or {}).get("entries", []))

                    components_with_status.append({
                        "type": comp_type,
                        "name": comp.get("name", comp_type),
                        "max_marks": comp.get("max_marks", 0),
                        "count": comp.get("count"),
                        "best_of": comp.get("best_of"),
                        "slabs": comp.get("slabs"),
                        "entry_status": entry_status,
                        "entry_id": entry_id,
                        "student_count": student_count,
                    })

                subject_data["template"] = {"id": tmpl.id, "name": tmpl.name, "total_marks": tmpl.total_marks}
                subject_data["components"] = components_with_status
                subject_data["is_consolidation_enabled"] = cfg.is_consolidation_enabled
            else:
                subject_data["template"] = None
                subject_data["components"] = []
                subject_data["is_consolidation_enabled"] = False

            result.append(subject_data)

        return result
        
    async def get_cia_config_coverage(self, semester: int, academic_year: str, user: dict) -> Dict[str, Any]:
        subjects_r = await self.session.execute(
            select(models.FacultyAssignment.subject_code).where(
                models.FacultyAssignment.college_id == user["college_id"],
                models.FacultyAssignment.semester == semester,
                models.FacultyAssignment.academic_year == academic_year,
                models.FacultyAssignment.is_deleted == False
            ).distinct()
        )
        total_subjects = set(subjects_r.scalars().all())
        
        configs_r = await self.session.execute(
            select(models.SubjectCIAConfig.subject_code).where(
                models.SubjectCIAConfig.college_id == user["college_id"],
                models.SubjectCIAConfig.semester == semester,
                models.SubjectCIAConfig.academic_year == academic_year,
                models.SubjectCIAConfig.subject_code.in_(total_subjects)
            )
        )
        configured_subjects = set(configs_r.scalars().all())
        
        return {
            "total_subjects": len(total_subjects),
            "configured_subjects": len(configured_subjects),
            "missing_subjects": list(total_subjects - configured_subjects),
            "coverage_percentage": round((len(configured_subjects)/max(len(total_subjects), 1)) * 100, 1)
        }
