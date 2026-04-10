"""
Exam Cell Router — thin HTTP layer delegating to ExamCellService.
"""

import html
from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from database import get_db
from app.core.security import require_role
from app.schemas.academic import CollegeSettingsUpdate
from app.schemas.evaluation import ExamScheduleCreate, EndtermEntry
from app.services.examcell_service import ExamCellService

router = APIRouter()


def get_examcell_service(session: AsyncSession = Depends(get_db)):
    return ExamCellService(session)


@router.get("/examcell/settings")
async def get_college_settings(
    user: dict = Depends(require_role("exam_cell", "admin")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    return {"settings": await svc.get_settings(user["college_id"])}


@router.put("/examcell/settings")
async def update_college_settings(
    req: CollegeSettingsUpdate,
    user: dict = Depends(require_role("exam_cell", "admin")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    settings = await svc.update_settings(user["college_id"], user["id"], req.model_dump()["settings"])
    return {"message": "Settings updated successfully", "settings": settings}


@router.post("/examcell/schedule")
async def create_exam_schedule(
    req: ExamScheduleCreate,
    user: dict = Depends(require_role("exam_cell", "admin")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    sched = await svc.create_schedule(user["college_id"], user["id"], req.model_dump())
    return sched


@router.get("/examcell/schedule")
async def get_exam_schedules(
    department_id: Optional[str] = None,
    batch: Optional[str] = None,
    semester: Optional[int] = None,
    user: dict = Depends(require_role("exam_cell", "admin")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    return await svc.get_schedules(user["college_id"], department_id, batch, semester)


@router.put("/examcell/schedule/{id}/publish")
async def toggle_exam_schedule_publish(
    id: str,
    published: bool = Query(..., description="Set to true to publish, false to unpublish"),
    user: dict = Depends(require_role("exam_cell", "admin")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    await svc.toggle_publish_schedule(user["college_id"], id, published)
    return {"message": f"Schedule {'published' if published else 'unpublished'}"}


@router.delete("/examcell/schedule/{id}")
async def delete_exam_schedule(
    id: str,
    user: dict = Depends(require_role("exam_cell", "admin")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    await svc.delete_schedule(user["college_id"], user["id"], id)
    return {"message": "Exam schedule deleted"}


@router.get("/student/exam-schedule")
async def get_student_exam_schedule(
    user: dict = Depends(require_role("student")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    return await svc.get_student_schedule(user)


@router.get("/examcell/dashboard-stats")
async def get_examcell_dashboard_stats(
    user: dict = Depends(require_role("exam_cell", "admin")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    return await svc.get_dashboard_stats(user["college_id"])


@router.get("/student/hall-ticket", response_class=HTMLResponse)
async def get_hall_ticket(
    semester: int,
    academic_year: str,
    user: dict = Depends(require_role("student")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    # Fetch all presentation data from the service layer
    _, regs, scheds, dept_str, _ = await svc.get_hall_ticket_data(user, semester, academic_year)
    
    sched_map = { s.subject_code: s for s in scheds }
    profile = user.get("profile_data") or {}
    
    photo_url = profile.get("photo_url")
    if photo_url:
        safe_photo_url = html.escape(photo_url)
        photo_html = f'<img src="{safe_photo_url}" alt="Student Photo" style="width:100px; height:120px; object-fit:cover; border: 1px solid #ccc;">'
    else:
        initials = "".join([n[0] for n in html.escape(user["name"]).split() if n])[:2].upper()
        photo_html = f'<div style="width:100px; height:120px; border: 1px solid #ccc; display:flex; align-items:center; justify-content:center; background:#eee; font-size:32px; font-weight:bold; color:#888;">{initials}</div>'

    safe_user_name = html.escape(user["name"])
    safe_dept_str = html.escape(dept_str)
    safe_college_id = html.escape(profile.get("college_id", user["id"]))
    safe_academic_year = html.escape(academic_year)

    rows = ""
    for r in regs:
        s = sched_map.get(r.subject_code)
        
        status_text = "Pending" if not s else "Published"
        dt = s.exam_date.strftime("%d-%b-%Y") if s and s.exam_date else "Pending Schedule"
        session_text = f"{html.escape(s.session)} ({html.escape(s.exam_time)})" if s else "Pending Schedule"
        hall = html.escape(s.document_url) if s and s.document_url else "Check Notice Board"
        subject_name = html.escape(s.subject_name) if s else "Subject TBA"
        
        color = "red" if not s else "green"
        
        rows += f"""
        <tr>
            <td style="padding:8px; border:1px solid #ddd;">{html.escape(r.subject_code)}</td>
            <td style="padding:8px; border:1px solid #ddd;">{subject_name}</td>
            <td style="padding:8px; border:1px solid #ddd; text-align:center;">{"Arrear" if r.is_arrear else "Regular"}</td>
            <td style="padding:8px; border:1px solid #ddd; text-align:center;">{html.escape(dt)}</td>
            <td style="padding:8px; border:1px solid #ddd; text-align:center;">{session_text}</td>
            <td style="padding:8px; border:1px solid #ddd; text-align:center;">{hall}</td>
            <td style="padding:8px; border:1px solid #ddd; text-align:center; color:{color}; font-weight:bold;">{html.escape(status_text)}</td>
        </tr>
        """
        
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Hall Ticket - {safe_user_name}</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }}
            .header h1 {{ margin: 0; font-size: 24px; text-transform: uppercase; }}
            .header p {{ margin: 5px 0 0 0; font-size: 16px; color: #666; }}
            .student-info {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
            .info-grid {{ display: grid; grid-template-columns: 120px 1fr; gap: 10px; }}
            .info-label {{ font-weight: bold; }}
            table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
            th {{ background: #f4f4f4; padding: 10px; border: 1px solid #ddd; text-align: center; }}
            .footer {{ display: flex; justify-content: space-between; margin-top: 50px; text-align: center; }}
            .signature-box {{ width: 200px; padding-top: 50px; border-top: 1px solid #333; }}
            @media print {{
                .no-print {{ display: none; }}
                body {{ padding: 0; }}
            }}
            .print-btn {{ display: block; margin: 20px auto; padding: 10px 20px; background: #007BFF; color: white; border: none; cursor: pointer; border-radius: 4px; font-size: 16px; }}
            .print-btn:hover {{ background: #0056b3; }}
        </style>
    </head>
    <body>
        <div class="no-print" style="text-align:center;">
            <button class="print-btn" onclick="window.print()">Print Hall Ticket</button>
        </div>
        
        <div class="header">
            <h1>Hall Ticket</h1>
            <p>End Semester Examination - {safe_academic_year}</p>
        </div>
        
        <div class="student-info">
            <div class="info-grid">
                <div class="info-label">Name:</div><div>{safe_user_name}</div>
                <div class="info-label">Reg No:</div><div>{safe_college_id}</div>
                <div class="info-label">Department:</div><div>{safe_dept_str}</div>
                <div class="info-label">Semester:</div><div>{semester}</div>
            </div>
            <div class="photo">
                {photo_html}
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Session</th>
                    <th>Hall / Room Allocation</th>
                    <th>Schedule Status</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
        
        <div class="footer">
            <div class="signature-box">Signature of Student</div>
            <div class="signature-box">Controller of Examinations</div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.post("/examcell/endterm")
async def save_endterm(
    req: EndtermEntry,
    user: dict = Depends(require_role("exam_cell", "admin")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    await svc.save_endterm_manual(user["college_id"], req.model_dump())
    return {"message": f"Endterm saved for {req.subject_code}"}


@router.get("/examcell/endterm")
async def list_endterm(
    user: dict = Depends(require_role("exam_cell", "admin")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    return await svc.fetch_endterm_manual_list()


@router.post("/examcell/publish/{entry_id}")
async def publish_results(
    entry_id: str,
    user: dict = Depends(require_role("exam_cell", "admin")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    return await svc.publish_marks(user["college_id"], user["id"], entry_id)

@router.post("/examcell/upload")
async def upload_examcell_file(
    file: UploadFile = File(...),
    user: dict = Depends(require_role("exam_cell", "admin")),
    svc: ExamCellService = Depends(get_examcell_service)
):
    return {"message": "File uploaded successfully", "filename": file.filename}
