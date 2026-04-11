from datetime import datetime, timezone
from fastapi import UploadFile
from app.core.exceptions import ResourceNotFoundError, InputValidationError, AuthorizationError, PayloadTooLargeError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional, Dict, Any
import csv
import io

from app import models
from app.models.core import UserProfile
from app.core.audit import log_audit

class MarksService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_students_for_assignment(self, department: str, batch: str, section: str, college_id: str) -> List[Dict[str, Any]]:
        result = await self.session.execute(
            select(models.User).outerjoin(UserProfile, models.User.id == UserProfile.user_id).where(
                models.User.college_id == college_id,
                models.User.role == "student",
                UserProfile.department == department,
                UserProfile.batch == batch,
                UserProfile.section == section,
            )
        )
        students = result.scalars().all()
        return [{"id": s.id, "name": s.name, "email": s.email, **(s.profile_data or {})} for s in students]

    async def get_entry(self, assignment_id: str, exam_type: str, component_id: Optional[str], user: dict) -> Dict[str, Any]:
        result = await self.session.execute(
            select(models.MarkSubmission).where(
                func.jsonb_extract_path_text(models.MarkSubmission.extra_data, 'assignment_id') == assignment_id,
                models.MarkSubmission.exam_type == exam_type,
                models.MarkSubmission.faculty_id == user["id"],
            )
        )
        entries = result.scalars().all()
        entry = None
        if component_id:
            for e in entries:
                if (e.extra_data or {}).get("component_id") == component_id:
                    entry = e
                    break
        else:
            entry = entries[0] if entries else None
            
        if not entry:
            return None
        return {"id": entry.id, "course_id": entry.course_id, "exam_type": entry.exam_type,
                "max_marks": entry.max_marks, "status": (entry.extra_data or {}).get("status", "draft"),
                "entries": (entry.extra_data or {}).get("entries", [])}

    async def save_entry(self, req, user: dict) -> Dict[str, Any]:
        entries_data = [e.dict() for e in req.entries]
        assign_r = await self.session.execute(
            select(models.FacultyAssignment).where(
                models.FacultyAssignment.id == req.assignment_id
            )
        )
        assignment = assign_r.scalars().first()
        if not assignment:
            raise ResourceNotFoundError("FacultyAssignment", req.assignment_id)
            
        existing_r = await self.session.execute(
            select(models.MarkSubmission).where(
                models.MarkSubmission.course_id == assignment.subject_code,
                models.MarkSubmission.exam_type == req.exam_type,
                models.MarkSubmission.faculty_id == user["id"],
            )
        )
        entries = existing_r.scalars().all()
        existing = None
        for e in entries:
            if (e.extra_data or {}).get("component_id") == req.component_id:
                existing = e
                break
                
        current_status = (existing.extra_data or {}).get("status", "draft")
        if current_status == "approved":
            if not req.revision_reason or not req.revision_reason.strip():
                raise InputValidationError("Revision reason is required to edit approved marks")
        if current_status == "submitted":
            raise InputValidationError("Cannot edit submitted marks. Wait for approval or rejection.")
            
        # Write to legacy MarkEntry
        if existing:
            existing.extra_data = {**(existing.extra_data or {}), "entries": entries_data,
                              "status": "draft", "max_marks": req.max_marks, "component_id": req.component_id}
            existing.max_marks = req.max_marks
            entry_id = existing.id
        else:
            row = models.MarkSubmission(
                student_id=None,
                course_id=assignment.subject_code,
                faculty_id=user["id"],
                exam_type=req.exam_type,
                max_marks=req.max_marks,
                college_id=user["college_id"],
                extra_data={"entries": entries_data, "assignment_id": req.assignment_id, "status": "draft", "component_id": req.component_id}
            )
            self.session.add(row)
            await self.session.flush()
            entry_id = row.id

        # Dual-Write: Normalized Schema (MarkSubmission)
        sub_r = await self.session.execute(
            select(models.MarkSubmission).where(
                models.MarkSubmission.assignment_id == req.assignment_id,
                models.MarkSubmission.exam_type == req.exam_type,
                models.MarkSubmission.component_id == req.component_id
            )
        )
        submission = sub_r.scalars().first()
        
        if not submission:
            submission = models.MarkSubmission(
                college_id=user["college_id"],
                faculty_id=user["id"],
                assignment_id=req.assignment_id,
                subject_code=assignment.subject_code,
                exam_type=req.exam_type,
                component_id=req.component_id,
                max_marks=req.max_marks,
                semester=assignment.semester,
                status="draft"
            )
            self.session.add(submission)
            await self.session.flush()
        else:
            submission.max_marks = req.max_marks
            submission.status = "draft"
            
        # Upsert MarkSubmissionEntries
        existing_entries_r = await self.session.execute(
            select(models.MarkSubmissionEntry).where(
                models.MarkSubmissionEntry.submission_id == submission.id
            )
        )
        existing_entries = {e.student_id: e for e in existing_entries_r.scalars().all()}
        
        for e in entries_data:
            student_id = e.get("student_id")
            if not student_id:
                continue
            status = e.get("status", "present")
            marks_obtained = float(e.get("marks_obtained", 0))
            if student_id in existing_entries:
                existing_entries[student_id].marks_obtained = marks_obtained
                existing_entries[student_id].status = status
            else:
                mse = models.MarkSubmissionEntry(
                    submission_id=submission.id,
                    student_id=student_id,
                    marks_obtained=marks_obtained,
                    status=status
                )
                self.session.add(mse)

        await log_audit(self.session, user["id"], "mark_entry", "update" if existing else "create", {"course_id": assignment.subject_code})
        await self.session.commit()
        return {"id": entry_id, "status": "draft", "entries": entries_data}

    async def submit_entry(self, entry_id: str, user: dict) -> Dict[str, str]:
        entry_r = await self.session.execute(
            select(models.MarkSubmission).where(
                models.MarkSubmission.id == entry_id,
                models.MarkSubmission.college_id == user["college_id"]
            )
        )
        entry = entry_r.scalars().first()
        if not entry:
             raise ResourceNotFoundError("MarkEntry", entry_id)
        if entry.faculty_id != user["id"]:
             raise AuthorizationError("Unauthorized mark entry")
             
        current_status = (entry.extra_data or {}).get("status", "draft")
        if current_status == "approved":
             raise InputValidationError("Already approved")
             
        entry.extra_data = {**(entry.extra_data or {}), "status": "submitted"}
        
        assignment_id = (entry.extra_data or {}).get("assignment_id")
        component_id = (entry.extra_data or {}).get("component_id")
        if assignment_id:
            sub_r = await self.session.execute(
                select(models.MarkSubmission).where(
                    models.MarkSubmission.assignment_id == assignment_id,
                    models.MarkSubmission.exam_type == entry.exam_type,
                    models.MarkSubmission.component_id == component_id
                )
            )
            sub = sub_r.scalars().first()
            if sub:
                sub.status = "submitted"
                sub.submitted_at = datetime.now(timezone.utc)
                
        await log_audit(self.session, user["id"], "mark_entry", "submit_for_review", {"entry_id": entry_id})
        await self.session.commit()
        return {"message": "Marks submitted for review"}

    async def review_entry(self, entry_id: str, req, user: dict) -> Dict[str, str]:
        entry_r = await self.session.execute(
            select(models.MarkSubmission).where(
                models.MarkSubmission.id == entry_id,
                models.MarkSubmission.college_id == user["college_id"]
            )
        )
        entry = entry_r.scalars().first()
        if not entry:
            raise ResourceNotFoundError("MarkEntry", entry_id)
            
        current_status = (entry.extra_data or {}).get("status", "draft")
        if current_status != "submitted":
            raise InputValidationError("Marks not submitted for review")
            
        entry.extra_data = {
            **(entry.extra_data or {}), 
            "status": req.status, 
            "review_remarks": req.remarks,
            "reviewed_by": user["id"],
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }
        
        assignment_id = (entry.extra_data or {}).get("assignment_id")
        component_id = (entry.extra_data or {}).get("component_id")
        if assignment_id:
            sub_r = await self.session.execute(
                select(models.MarkSubmission).where(
                    models.MarkSubmission.assignment_id == assignment_id,
                    models.MarkSubmission.exam_type == entry.exam_type,
                    models.MarkSubmission.component_id == component_id
                )
            )
            sub = sub_r.scalars().first()
            if sub:
                sub.status = req.status
                sub.reviewed_by = user["id"]
                sub.reviewed_at = datetime.now(timezone.utc)
                sub.review_remarks = req.remarks
                
        await log_audit(self.session, user["id"], "mark_entry", f"review_{req.status}", {"entry_id": entry_id})
        await self.session.commit()
        return {"message": f"Marks {req.status}"}

    async def get_approved_marks(self, college_id: str) -> List[Dict[str, Any]]:
        result = await self.session.execute(
            select(models.MarkSubmission).where(
                models.MarkSubmission.college_id == college_id
            ).order_by(models.MarkSubmission.created_at.desc())
        )
        entries = result.scalars().all()
        approved = [e for e in entries if (e.extra_data or {}).get("status") == "approved"]
        
        assigned_ids = list(set((e.extra_data or {}).get("assignment_id") for e in approved if (e.extra_data or {}).get("assignment_id")))
        assign_map = {}
        if assigned_ids:
            assign_r = await self.session.execute(select(models.FacultyAssignment).where(models.FacultyAssignment.id.in_(assigned_ids)))
            assign_map = {a.id: a for a in assign_r.scalars().all()}
            
        fac_ids = list(set(e.faculty_id for e in approved))
        fac_map = {}
        if fac_ids:
            fac_r = await self.session.execute(select(models.User).outerjoin(UserProfile, models.User.id == UserProfile.user_id).where(models.User.id.in_(fac_ids)))
            fac_map = {u.id: u for u in fac_r.scalars().all()}
            
        return [{
            "id": e.id, "subject_code": e.course_id, "exam_type": e.exam_type,
            "component_id": (e.extra_data or {}).get("component_id"),
            "faculty_name": fac_map.get(e.faculty_id).name if e.faculty_id in fac_map else "Unknown",
            "batch": assign_map.get((e.extra_data or {}).get("assignment_id")).batch if (e.extra_data or {}).get("assignment_id") in assign_map else "",
            "section": assign_map.get((e.extra_data or {}).get("assignment_id")).section if (e.extra_data or {}).get("assignment_id") in assign_map else "",
            "semester": assign_map.get((e.extra_data or {}).get("assignment_id")).semester if (e.extra_data or {}).get("assignment_id") in assign_map else "",
            "max_marks": e.max_marks, "reviewed_at": (e.extra_data or {}).get("reviewed_at")
        } for e in approved]

    async def upload_marks(self, file: UploadFile, semester: int, subject_code: str, exam_type: str, user: dict, max_marks: float) -> Dict[str, Any]:
        MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB threshold
        if file.size and file.size > MAX_FILE_SIZE:
            raise PayloadTooLargeError("File too large. Maximum allowed size is 5MB for CSV marks ingress.")
            
        content = await file.read(MAX_FILE_SIZE + 1)
        if len(content) > MAX_FILE_SIZE:
            raise PayloadTooLargeError("File too large. Maximum allowed size is 5MB for CSV marks ingress.")
            
        try:
            decoded = content.decode('utf-8')
        except UnicodeDecodeError:
            raise InputValidationError("Invalid file encoding")
            
        reader = csv.DictReader(io.StringIO(decoded))
        if not set(['roll_number', 'marks_obtained', 'status']).issubset(set(reader.fieldnames or [])):
            raise InputValidationError("Missing required columns: roll_number, marks_obtained, status")
            
        parsed_entries = []
        for row in reader:
            try:
                marks = float(row['marks_obtained']) if row['marks_obtained'] else 0.0
                parsed_entries.append({
                    "roll_number": row['roll_number'].strip(),
                    "marks_obtained": marks,
                    "status": row.get('status', 'present').lower()
                })
            except Exception as e:
                raise InputValidationError(f"Invalid data in row for student {row.get('roll_number')}: {str(e)}")
            
        if not parsed_entries:
            raise InputValidationError("No valid data found in CSV")
            
        existing_r = await self.session.execute(
            select(models.MarkSubmission).where(
                models.MarkSubmission.course_id == subject_code,
                models.MarkSubmission.exam_type == exam_type,
                models.MarkSubmission.faculty_id == user["id"],
                models.MarkSubmission.college_id == user["college_id"]
            )
        )
        existing = existing_r.scalars().first()
        
        if existing:
            current_status = (existing.extra_data or {}).get("status", "draft")
            if current_status in ["approved", "submitted"]:
                raise InputValidationError(f"Cannot overwrite marks in {current_status} status")
            existing.extra_data = {**(existing.extra_data or {}), "entries": parsed_entries, "status": "draft", "max_marks": max_marks}
            existing.max_marks = max_marks
        else:
            me = models.MarkSubmission(
                course_id=subject_code, faculty_id=user["id"], exam_type=exam_type,
                max_marks=max_marks, college_id=user["college_id"],
                extra_data={"entries": parsed_entries, "status": "draft"}
            )
            self.session.add(me)
            
        # Write to MarkSubmission / MarkSubmissionEntry
        assignment_r = await self.session.execute(
            select(models.FacultyAssignment).where(
                models.FacultyAssignment.teacher_id == user["id"],
                models.FacultyAssignment.subject_code == subject_code,
                models.FacultyAssignment.college_id == user["college_id"]
            )
        )
        assignment = assignment_r.scalars().first()
        
        if assignment:
            sub_r = await self.session.execute(
                select(models.MarkSubmission).where(
                    models.MarkSubmission.assignment_id == assignment.id,
                    models.MarkSubmission.exam_type == exam_type
                )
            )
            submission = sub_r.scalars().first()
            if not submission:
                submission = models.MarkSubmission(
                    college_id=user["college_id"],
                    faculty_id=user["id"],
                    assignment_id=assignment.id,
                    subject_code=subject_code,
                    exam_type=exam_type,
                    max_marks=max_marks,
                    semester=assignment.semester,
                    status="draft"
                )
                self.session.add(submission)
                await self.session.flush()
            else:
                submission.max_marks = max_marks
                submission.status = "draft"
                
            # Upsert Entries
            ex_mse_r = await self.session.execute(
                select(models.MarkSubmissionEntry).where(
                    models.MarkSubmissionEntry.submission_id == submission.id
                )
            )
            ex_mse = {e.student_id: e for e in ex_mse_r.scalars().all()}
            
            # Map roll_number correctly from JSONB profile
            roll_nos = [p["roll_number"].strip() for p in parsed_entries if p.get("roll_number")]
            users_r = await self.session.execute(
                select(models.User).outerjoin(UserProfile, models.User.id == UserProfile.user_id).where(
                    models.User.college_id == user["college_id"],
                    UserProfile.roll_number.in_(roll_nos)
                )
            )
            users_map = {u.profile_data.get('roll_number'): u.id for u in users_r.scalars().all() if u.profile_data and u.profile_data.get('roll_number')}
            
            for p in parsed_entries:
                roll = p["roll_number"]
                stud_id = users_map.get(roll)
                if not stud_id:
                    continue
                marks_obtained = p["marks_obtained"]
                status = p["status"]
                if stud_id in ex_mse:
                    ex_mse[stud_id].marks_obtained = marks_obtained
                    ex_mse[stud_id].status = status
                else:
                    self.session.add(models.MarkSubmissionEntry(
                        submission_id=submission.id,
                        student_id=stud_id,
                        marks_obtained=marks_obtained,
                        status=status
                    ))

        await self.session.commit()
        return {"message": f"Uploaded {len(parsed_entries)} entries successfully."}

    async def get_student_cia(self, student_id: str, college_id: str, semester: Optional[int] = None, academic_year: Optional[str] = None) -> List[Dict[str, Any]]:
        stmt = select(
            models.MarkSubmissionEntry, models.MarkSubmission
        ).join(
            models.MarkSubmission, models.MarkSubmissionEntry.submission_id == models.MarkSubmission.id
        ).where(
            models.MarkSubmissionEntry.student_id == student_id,
            models.MarkSubmission.college_id == college_id,
            models.MarkSubmission.status == "approved",
            models.MarkSubmission.is_deleted == False
        )
        if semester:
            stmt = stmt.where(models.MarkSubmission.semester == semester)
            
        result = await self.session.execute(stmt)
        rows = result.all()
        
        response = []
        for mse, sub in rows:
            response.append({
                "subject_code": sub.subject_code,
                "exam_type": sub.exam_type,
                "component_id": sub.component_id,
                "marks_obtained": mse.marks_obtained,
                "max_marks": sub.max_marks,
                "status": mse.status,
                "date_recorded": str(sub.published_at or sub.reviewed_at or sub.created_at)
            })
            
        return response

    async def get_status_report(self, user: dict, department: Optional[str] = None, academic_year: Optional[str] = None) -> List[Dict[str, Any]]:
        stmt = select(models.MarkSubmission, models.User).join(
            models.User, models.MarkSubmission.faculty_id == models.User.id
        ).where(
            models.MarkSubmission.college_id == user["college_id"]
        )
        if department:
            stmt = stmt.where(UserProfile.department == department)
            
        result = await self.session.execute(stmt.order_by(models.MarkSubmission.created_at.desc()))
        entries = result.all()
        
        return [{
            "id": e.id, "subject_code": e.course_id, "exam_type": e.exam_type,
            "faculty_name": u.name, "status": (e.extra_data or {}).get("status", "draft"),
            "max_marks": e.max_marks, "created_at": str(e.created_at)
        } for e, u in entries]
