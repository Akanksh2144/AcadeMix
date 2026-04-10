from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import models

async def get_current_academic_year(session: AsyncSession, college_id: str) -> str:
    """Helper to get the most recent or active academic year for a tenant."""
    # Look for an active calendar
    cal_r = await session.execute(
        select(models.AcademicCalendar).where(
            models.AcademicCalendar.college_id == college_id,
            models.AcademicCalendar.end_date >= date.today()
        ).order_by(models.AcademicCalendar.start_date.desc()).limit(1)
    )
    calendar = cal_r.scalars().first()
    if calendar:
        return calendar.academic_year
        
    # Fallback default if no calendar
    today = date.today()
    start_year = today.year if today.month >= 6 else today.year - 1
    return f"{start_year}-{start_year + 1}"

def grade_to_points(grade: str) -> float:
    """Convert letter grade to GPA points based on typical 10-point scale."""
    mapping = {
        "O": 10.0,
        "A+": 9.0,
        "A": 8.0,
        "B+": 7.0,
        "B": 6.0,
        "C": 5.0,
        "D": 4.0,
        "F": 0.0,
        "AB": 0.0,
        "SA": 0.0, # Shortage of Attendance
        "W": 0.0,  # Withdrawn
    }
    return mapping.get(grade.upper().strip(), 0.0)
