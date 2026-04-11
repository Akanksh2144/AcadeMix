"""
Parent Service — logic and aggregations for the Parent portal domain.
Encapsulates ward validations, academic trackers, attendance generation, and progress report HTML views.
"""

from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, text, or_
from datetime import datetime

from app import models
from app.core.exceptions import ResourceNotFoundError, AuthorizationError
from app.core.utils import get_current_academic_year, grade_to_points


class ParentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _verify_parent_link(self, college_id: str, parent_id: str, student_id: str) -> models.User:
        """Verifies if the parent is authorized to view this student and returns the student."""
        link_r = await self.db.execute(
            select(models.ParentStudentLink).where(
                models.ParentStudentLink.parent_id == parent_id,
                models.ParentStudentLink.student_id == student_id,
                models.ParentStudentLink.college_id == college_id,
                models.ParentStudentLink.is_deleted == False
            )
        )
        if not link_r.scalars().first():
            raise AuthorizationError("Unauthorized to access this student's data. Link not verified.")

        stud_r = await self.db.execute(select(models.User).where(models.User.id == student_id, models.User.college_id == college_id))
        student = stud_r.scalars().first()
        if not student:
            raise ResourceNotFoundError("Student", student_id)
            
        return student

    async def get_my_children(self, college_id: str, parent_id: str) -> List[Dict[str, Any]]:
        stmt = select(models.ParentStudentLink, models.User).join(
            models.User, models.User.id == models.ParentStudentLink.student_id
        ).where(
            models.ParentStudentLink.parent_id == parent_id,
            models.ParentStudentLink.is_deleted == False,
            models.User.is_deleted == False
        )
        results = (await self.db.execute(stmt)).all()

        return [{
            "student_id": u.id,
            "name": u.name,
            "email": u.email,
            "relationship": link.relationship,
            "is_primary": link.is_primary,
            "profile": u.profile_data
        } for link, u in results]

    async def get_academics(self, u_data: Dict[str, Any], student_id: str) -> Dict[str, Any]:
        student = await self._verify_parent_link(u_data["college_id"], u_data["id"], student_id)
        cid = student.college_id

        grades_r = await self.db.execute(
            select(models.SemesterGrade).where(
                models.SemesterGrade.student_id == student_id,
                models.SemesterGrade.college_id == cid,
                models.SemesterGrade.is_deleted == False
            ).order_by(models.SemesterGrade.semester)
        )
        grades = grades_r.scalars().all()

        regs_r = await self.db.execute(
            select(models.CourseRegistration).where(
                models.CourseRegistration.student_id == student_id,
                models.CourseRegistration.is_deleted == False
            ).order_by(models.CourseRegistration.semester.desc())
        )
        regs = regs_r.scalars().all()

        return {
            "student_name": student.name,
            "profile": student.profile_data,
            "semester_grades": [{
                "semester": g.semester, "academic_year": g.academic_year,
                "sgpa": g.sgpa, "cgpa": g.cgpa, "total_credits": g.total_credits,
                "earned_credits": g.earned_credits, "arrear_count": g.arrear_count
            } for g in grades],
            "current_registrations": [{
                "subject_code": r.subject_code, "subject_name": r.subject_name,
                "semester": r.semester, "academic_year": r.academic_year,
                "status": r.status
            } for r in regs]
        }

    async def get_attendance(self, u_data: Dict[str, Any], student_id: str) -> List[Dict[str, Any]]:
        await self._verify_parent_link(u_data["college_id"], u_data["id"], student_id)

        stmt = text("""
            SELECT
                subject_code,
                COUNT(*) FILTER (WHERE status = 'present' OR status = 'od') AS present_count,
                COUNT(*) AS total_count
            FROM attendance_records
            WHERE student_id = :student_id AND is_deleted = false
            GROUP BY subject_code
        """)
        result = await self.db.execute(stmt, {"student_id": student_id})
        rows = result.all()

        return [{
            "subject_code": r.subject_code,
            "present_count": r.present_count,
            "total_count": r.total_count,
            "percentage": round(r.present_count * 100.0 / r.total_count, 1) if r.total_count > 0 else 0
        } for r in rows]

    async def get_timetable(self, u_data: Dict[str, Any], student_id: str) -> List[Dict[str, Any]]:
        student = await self._verify_parent_link(u_data["college_id"], u_data["id"], student_id)
        pd = student.profile_data or {}
        department = pd.get("department")
        batch = pd.get("batch")
        section = pd.get("section")

        if not all([department, batch, section]):
            return []

        dept_r = await self.db.execute(
            select(models.Department).where(
                models.Department.college_id == student.college_id,
                or_(models.Department.code == department, models.Department.name == department)
            )
        )
        dept = dept_r.scalars().first()
        if not dept:
            return []

        current_academic_year = await get_current_academic_year(self.db, student.college_id)

        result = await self.db.execute(
            select(models.PeriodSlot).where(
                models.PeriodSlot.department_id == dept.id,
                models.PeriodSlot.batch == batch,
                models.PeriodSlot.section == section,
                models.PeriodSlot.academic_year == current_academic_year
            )
        )
        slots = result.scalars().all()

        faculty_ids = list(set([s.faculty_id for s in slots if s.faculty_id]))
        faculty_map = {}
        if faculty_ids:
            fac_r = await self.db.execute(select(models.User.id, models.User.name).where(models.User.id.in_(faculty_ids)))
            faculty_map = {f.id: f.name for f in fac_r.all()}

        return [{
            "id": s.id, "day": s.day, "period_no": s.period_no,
            "start_time": s.start_time, "end_time": s.end_time,
            "subject_code": s.subject_code, "subject_name": s.subject_name,
            "faculty_id": s.faculty_id, "faculty_name": faculty_map.get(s.faculty_id, "Unknown"),
            "slot_type": s.slot_type
        } for s in slots]

    async def get_subjects(self, u_data: Dict[str, Any], student_id: str) -> List[Dict[str, Any]]:
        student = await self._verify_parent_link(u_data["college_id"], u_data["id"], student_id)
        pd = student.profile_data or {}
        department = pd.get("department")
        batch = pd.get("batch")
        section = pd.get("section")

        if not all([department, batch, section]):
            return []

        dept_r = await self.db.execute(
            select(models.Department).where(
                models.Department.college_id == student.college_id,
                or_(models.Department.code == department, models.Department.name == department)
            )
        )
        dept = dept_r.scalars().first()
        if not dept:
            return []

        current_academic_year = await get_current_academic_year(self.db, student.college_id)

        result = await self.db.execute(
            select(
                models.PeriodSlot.subject_code,
                models.PeriodSlot.subject_name,
                models.PeriodSlot.faculty_id
            ).where(
                models.PeriodSlot.department_id == dept.id,
                models.PeriodSlot.batch == batch,
                models.PeriodSlot.section == section,
                models.PeriodSlot.academic_year == current_academic_year
            ).distinct(models.PeriodSlot.subject_code)
        )
        rows = result.all()

        faculty_ids = list(set([r.faculty_id for r in rows if r.faculty_id]))
        faculty_map = {}
        if faculty_ids:
            fac_r = await self.db.execute(select(models.User.id, models.User.name).where(models.User.id.in_(faculty_ids)))
            faculty_map = {f.id: f.name for f in fac_r.all()}

        return [{
            "subject_code": r.subject_code,
            "subject_name": r.subject_name,
            "faculty_name": faculty_map.get(r.faculty_id, "TBA")
        } for r in rows]

    async def get_exam_schedule(self, u_data: Dict[str, Any], student_id: str) -> List[models.ExamSchedule]:
        student = await self._verify_parent_link(u_data["college_id"], u_data["id"], student_id)
        pd = student.profile_data or {}
        department = pd.get("department")
        batch = pd.get("batch")

        if not department:
            return []

        dept_r = await self.db.execute(
            select(models.Department).where(
                models.Department.college_id == student.college_id,
                or_(models.Department.code == department, models.Department.name == department)
            )
        )
        dept = dept_r.scalars().first()
        if not dept:
            return []

        stmt = select(models.ExamSchedule).where(
            models.ExamSchedule.college_id == student.college_id,
            models.ExamSchedule.department_id == dept.id,
            models.ExamSchedule.is_published == True,
            models.ExamSchedule.is_deleted == False
        )
        if batch:
            stmt = stmt.where(models.ExamSchedule.batch == batch)
        result = await self.db.execute(stmt.order_by(models.ExamSchedule.exam_date))
        return result.scalars().all()

    async def get_leaves(self, u_data: Dict[str, Any], student_id: str) -> List[Dict[str, Any]]:
        student = await self._verify_parent_link(u_data["college_id"], u_data["id"], student_id)

        result = await self.db.execute(
            select(models.LeaveRequest).where(
                models.LeaveRequest.applicant_id == student_id,
                models.LeaveRequest.college_id == student.college_id
            ).order_by(models.LeaveRequest.created_at.desc())
        )
        leaves = result.scalars().all()

        return [{
            "id": l.id, "leave_type": l.leave_type,
            "from_date": l.from_date.isoformat(), "to_date": l.to_date.isoformat(),
            "reason": l.reason, "status": l.status,
            "reviewed_at": l.reviewed_at.isoformat() if l.reviewed_at else None,
            "review_remarks": l.review_remarks
        } for l in leaves]

    async def get_faculty_contacts(self, u_data: Dict[str, Any], student_id: str) -> List[Dict[str, Any]]:
        student = await self._verify_parent_link(u_data["college_id"], u_data["id"], student_id)
        pd = student.profile_data or {}
        department = pd.get("department")
        batch = pd.get("batch")
        section = pd.get("section")

        if not all([department, batch, section]):
            return []

        dept_r = await self.db.execute(
            select(models.Department).where(
                models.Department.college_id == student.college_id,
                or_(models.Department.code == department, models.Department.name == department)
            )
        )
        dept = dept_r.scalars().first()
        if not dept:
            return []

        current_academic_year = await get_current_academic_year(self.db, student.college_id)

        slots_r = await self.db.execute(
            select(models.PeriodSlot.faculty_id, models.PeriodSlot.subject_name).where(
                models.PeriodSlot.department_id == dept.id,
                models.PeriodSlot.batch == batch,
                models.PeriodSlot.section == section,
                models.PeriodSlot.academic_year == current_academic_year
            ).distinct(models.PeriodSlot.faculty_id)
        )
        rows = slots_r.all()

        faculty_ids = [r.faculty_id for r in rows if r.faculty_id]
        if not faculty_ids:
            return []

        fac_r = await self.db.execute(
            select(models.User).where(models.User.id.in_(faculty_ids))
        )
        faculty = fac_r.scalars().all()

        return [{
            "name": f.name,
            "email": f.email,
            "role": f.role,
            "department": department
        } for f in faculty]

    async def get_mentor(self, u_data: Dict[str, Any], student_id: str) -> Dict[str, Any]:
        student = await self._verify_parent_link(u_data["college_id"], u_data["id"], student_id)

        stmt = select(models.MentorAssignment).where(
            models.MentorAssignment.student_id == student_id,
            models.MentorAssignment.college_id == student.college_id,
            models.MentorAssignment.is_active == True,
            models.MentorAssignment.is_deleted == False
        )
        assignment = (await self.db.execute(stmt)).scalar_one_or_none()
        if not assignment:
            return {"mentor": None}

        mentor = await self.db.get(models.User, assignment.faculty_id)
        return {
            "mentor": {
                "name": mentor.name if mentor else "Unknown",
                "email": mentor.email if mentor else "",
                "department": (student.profile_data or {}).get("department", "")
            },
            "assigned_date": assignment.created_at.isoformat() if assignment.created_at else None
        }

    async def get_progress_report_html(self, u_data: Dict[str, Any], student_id: str) -> str:
        student = await self._verify_parent_link(u_data["college_id"], u_data["id"], student_id)
        cid = student.college_id
        pd = student.profile_data or {}

        college_r = await self.db.execute(select(models.College).where(models.College.id == cid))
        college = college_r.scalars().first()
        college_name = college.name if college else "Institution"

        att_r = await self.db.execute(text("""
            SELECT subject_code,
                   COUNT(*) FILTER (WHERE status = 'present' OR status = 'od') AS present_count,
                   COUNT(*) AS total_count
            FROM attendance_records
            WHERE student_id = :sid AND is_deleted = false
            GROUP BY subject_code
        """), {"sid": student_id})
        att_rows = att_r.all()

        att_html = ""
        total_present = 0
        total_classes = 0
        for a in att_rows:
            pct = round(a.present_count * 100.0 / a.total_count, 1) if a.total_count > 0 else 0
            color = "#22c55e" if pct >= 75 else "#ef4444"
            att_html += f"<tr><td>{a.subject_code}</td><td>{a.present_count}</td><td>{a.total_count}</td><td style='color:{color};font-weight:bold'>{pct}%</td></tr>"
            total_present += a.present_count
            total_classes += a.total_count
        overall_att = round(total_present * 100.0 / total_classes, 1) if total_classes > 0 else 0

        grades_r = await self.db.execute(
            select(models.SemesterGrade).where(
                models.SemesterGrade.student_id == student_id,
                models.SemesterGrade.college_id == cid,
                models.SemesterGrade.is_deleted == False
            ).order_by(models.SemesterGrade.semester)
        )
        grades = grades_r.scalars().all()
        
        from collections import defaultdict
        sem_grades = defaultdict(list)
        for g in grades:
            sem_grades[g.semester].append(g)
            
        grade_html = ""
        cumulative_points = 0
        cumulative_credits = 0
        
        for sem in sorted(sem_grades.keys()):
            sem_list = sem_grades[sem]
            sem_points = sum(grade_to_points(g.grade) * g.credits_earned for g in sem_list)
            sem_credits = sum(g.credits_earned for g in sem_list)
            arrears = sum(1 for g in sem_list if g.grade in ["U", "F"])
            sgpa = round(sem_points / sem_credits, 2) if sem_credits > 0 else 0
            
            cumulative_points += sem_points
            cumulative_credits += sem_credits
            cgpa = round(cumulative_points / cumulative_credits, 2) if cumulative_credits > 0 else 0
            
            grade_html += f"<tr><td>Semester {sem}</td><td>-</td><td>{sgpa}</td><td>{cgpa}</td><td>{sem_credits}</td><td>{arrears}</td></tr>"

        from sqlalchemy import String
        entries_stmt = select(models.MarkSubmission).where(
            models.MarkSubmission.college_id == cid,
            models.MarkSubmission.is_deleted == False
        ).where(models.MarkSubmission.extra_data.cast(String).ilike(f'%"{student_id}"%'))
        entries_r = await self.db.execute(entries_stmt)
        entries = entries_r.scalars().all()
        
        cia_subjects = {}
        for e in entries:
            if not e.extra_data or e.extra_data.get("status") != "approved": continue
            
            student_mark = next((float(bulk.get("marks", 0)) for bulk in e.extra_data.get("entries", []) if bulk.get("student_id") == student_id), None)
            
            if student_mark is not None:
                if e.course_id not in cia_subjects:
                    cia_subjects[e.course_id] = {"obtained": 0, "count": 0}
                cia_subjects[e.course_id]["obtained"] += student_mark
                cia_subjects[e.course_id]["count"] += 1
                
        cia_html = ""
        for subj, data in cia_subjects.items():
            cia_html += f"<tr><td>{subj}</td><td>{round(data['obtained'], 1)}</td><td>{data['count']} components</td></tr>"

        html = f"""<!DOCTYPE html>
        <html>
        <head>
        <title>Progress Report — {student.name}</title>
        <style>
        @media print {{ body {{ margin: 0; }} @page {{ size: A4; margin: 15mm; }} }}
        body {{ font-family: 'Segoe UI', sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px; }}
        .header {{ text-align: center; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }}
        .header h1 {{ font-size: 22px; color: #4f46e5; margin: 0; }}
        .header p {{ margin: 4px 0; color: #64748b; }}
        .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }}
        .info-grid span {{ font-size: 13px; }} .info-grid strong {{ color: #334155; }}
        h2 {{ font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 28px; color: #334155; }}
        table {{ width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }}
        th, td {{ border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }}
        th {{ background: #f1f5f9; font-weight: 600; color: #475569; }}
        .overall {{ font-size: 15px; font-weight: bold; color: {'#22c55e' if overall_att >= 75 else '#ef4444'}; }}
        .print-btn {{ display: block; margin: 20px auto; padding: 10px 32px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }}
        .print-btn:hover {{ background: #4338ca; }}
        @media print {{ .print-btn {{ display: none; }} }}
        .footer {{ text-align: center; font-size: 11px; color: #94a3b8; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }}
        </style>
        </head>
        <body>
        <div class="header">
        <h1>{college_name}</h1>
        <p>Student Progress Report</p>
        <p style="font-size:12px; color:#94a3b8">Generated on {datetime.now().strftime('%d %B %Y')}</p>
        </div>

        <div class="info-grid">
        <span><strong>Student Name:</strong> {student.name}</span>
        <span><strong>Roll No:</strong> {student.email}</span>
        <span><strong>Department:</strong> {pd.get('department', '-')}</span>
        <span><strong>Batch:</strong> {pd.get('batch', '-')}</span>
        <span><strong>Section:</strong> {pd.get('section', '-')}</span>
        <span><strong>Overall Attendance:</strong> <span class="overall">{overall_att}%</span></span>
        </div>

        <h2>📊 Subject-wise Attendance</h2>
        <table>
        <thead><tr><th>Subject</th><th>Present</th><th>Total</th><th>Percentage</th></tr></thead>
        <tbody>{att_html if att_html else '<tr><td colspan="4" style="text-align:center;color:#94a3b8">No attendance data</td></tr>'}</tbody>
        </table>

        <h2>🎓 Semester Grades</h2>
        <table>
        <thead><tr><th>Semester</th><th>Academic Year</th><th>SGPA</th><th>CGPA</th><th>Credits</th><th>Arrears</th></tr></thead>
        <tbody>{grade_html if grade_html else '<tr><td colspan="6" style="text-align:center;color:#94a3b8">No grade data</td></tr>'}</tbody>
        </table>

        <h2>📝 CIA Summary</h2>
        <table>
        <thead><tr><th>Subject</th><th>Total Marks Obtained</th><th>Components Evaluated</th></tr></thead>
        <tbody>{cia_html if cia_html else '<tr><td colspan="3" style="text-align:center;color:#94a3b8">No CIA data</td></tr>'}</tbody>
        </table>

        <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>

        <div class="footer">
        <p>{college_name} | AcadMix ERP System | This is a computer-generated document</p>
        </div>
        </body>
        </html>"""
        return html

    async def update_notification_prefs(self, parent_id: str, prefs: Dict[str, Any]) -> None:
        u = await self.db.get(models.User, parent_id)
        if not u:
            raise ResourceNotFoundError("User", parent_id)
        pd = u.profile_data or {}
        pd["notification_preferences"] = prefs
        u.profile_data = pd
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(u, "profile_data")
        await self.db.commit()

    async def _get_linked_student(self, college_id: str, parent_id: str) -> str:
        """Internal helper for endpoints that don't take a student_id parameter explicitly, returning the primary/first ward."""
        link_r = await self.db.execute(
            select(models.ParentStudentLink).where(
                models.ParentStudentLink.parent_id == parent_id,
                models.ParentStudentLink.college_id == college_id,
                models.ParentStudentLink.is_deleted == False
            ).order_by(models.ParentStudentLink.is_primary.desc())
        )
        link = link_r.scalars().first()
        if not link:
            raise AuthorizationError("No students linked to this parent")
        return link.student_id

    async def get_ward_info(self, u_data: Dict[str, Any]) -> Dict[str, Any]:
        student_id = await self._get_linked_student(u_data["college_id"], u_data["id"])
        student = (await self.db.execute(select(models.User).where(
            models.User.id == student_id,
            models.User.college_id == u_data["college_id"]
        ))).scalars().first()
        if not student:
            raise ResourceNotFoundError("Student", student_id)
        return {
            "id": student.id, "name": student.name, "email": student.email,
            "department": (student.profile_data or {}).get("department", "N/A"),
            "semester": (student.profile_data or {}).get("semester"),
            "batch": (student.profile_data or {}).get("batch"),
        }

    async def get_ward_attendance(self, u_data: Dict[str, Any]) -> Dict[str, Any]:
        student_id = await self._get_linked_student(u_data["college_id"], u_data["id"])
        total = await self.db.scalar(
            select(func.count(models.AttendanceRecord.id)).where(
                models.AttendanceRecord.student_id == student_id,
                models.AttendanceRecord.is_deleted == False
            )
        )
        present = await self.db.scalar(
            select(func.count(models.AttendanceRecord.id)).where(
                models.AttendanceRecord.student_id == student_id,
                models.AttendanceRecord.status == "present",
                models.AttendanceRecord.is_deleted == False
            )
        )
        return {
            "total_classes": total or 0,
            "present": present or 0,
            "percentage": round((present / total * 100) if total else 0, 2)
        }

    async def get_ward_scholarships(self, u_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        student_id = await self._get_linked_student(u_data["college_id"], u_data["id"])
        res = await self.db.execute(
            select(models.ScholarshipApplication, models.Scholarship.name, models.Scholarship.type)
            .join(models.Scholarship, models.Scholarship.id == models.ScholarshipApplication.scholarship_id)
            .where(models.ScholarshipApplication.student_id == student_id)
        )
        return [
            {"scholarship_name": r[1], "type": r[2], "status": r[0].status, "applied_at": r[0].applied_at}
            for r in res.fetchall()
        ]

    async def get_ward_placements(self, u_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        student_id = await self._get_linked_student(u_data["college_id"], u_data["id"])
        res = await self.db.execute(
            select(models.PlacementApplication, models.PlacementDrive.drive_type, models.PlacementDrive.status.label("drive_status"))
            .join(models.PlacementDrive, models.PlacementDrive.id == models.PlacementApplication.drive_id)
            .where(models.PlacementApplication.student_id == student_id)
        )
        return [
            {"drive_type": r[1], "drive_status": r[2], "application_status": r[0].status, "offer_details": r[0].offer_details}
            for r in res.fetchall()
        ]

    async def get_ward_grades(self, u_data: Dict[str, Any]) -> List[models.SemesterGrade]:
        student_id = await self._get_linked_student(u_data["college_id"], u_data["id"])
        res = await self.db.execute(
            select(models.SemesterGrade).where(models.SemesterGrade.student_id == student_id)
            .order_by(models.SemesterGrade.semester)
        )
        return res.scalars().all()
