"""
Seed mock data for the Student Dashboard tabs: 
faculty assignments (subjects), timetable, attendance, CIA marks, academic calendar, fee invoices.
Run: python seed_student_data.py
"""
import asyncio
import uuid
import random
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.future import select

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from database import AsyncSessionLocal
from app import models

random.seed(42)

def uid():
    return str(uuid.uuid4())

SUBJECTS = [
    {"code": "DS301", "name": "Data Structures", "credits": 4, "hours": 5},
    {"code": "DS302", "name": "Database Management Systems", "credits": 4, "hours": 4},
    {"code": "DS303", "name": "Computer Networks", "credits": 3, "hours": 3},
    {"code": "DS304", "name": "Operating Systems", "credits": 4, "hours": 4},
    {"code": "DS305", "name": "Discrete Mathematics", "credits": 3, "hours": 3},
    {"code": "DS306", "name": "Data Structures Lab", "credits": 2, "hours": 3, "is_lab": True},
]

DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
DAY_FULL = {"MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5}

PERIODS = [
    {"period": 1, "start": "09:00", "end": "09:50"},
    {"period": 2, "start": "09:50", "end": "10:40"},
    {"period": 3, "start": "11:00", "end": "11:50"},
    {"period": 4, "start": "11:50", "end": "12:40"},
    {"period": 5, "start": "13:30", "end": "14:20"},
    {"period": 6, "start": "14:20", "end": "15:10"},
]

async def main():
    async with AsyncSessionLocal() as session:
        # 1. Find the student user
        r = await session.execute(select(models.User).where(models.User.email == "student@gni.edu"))
        student = r.scalars().first()
        if not student:
            print("❌ Student user not found. Run seed_quick_logins.py first.")
            return
        
        college_id = str(student.college_id)
        student_id = str(student.id)
        print(f"✅ Student: {student.name} (id={student_id[:8]}..., college={college_id[:8]}...)")

        # Find a teacher user
        r = await session.execute(select(models.User).where(models.User.role == "teacher", models.User.college_id == college_id))
        teacher = r.scalars().first()
        if not teacher:
            teacher = models.User(
                name="Dr. Priya Reddy", email="teacher@gni.edu",
                password_hash="$2b$12$dummyhashforseeding", role="teacher",
                college_id=college_id,
                profile_data={"department": "DS", "batch": "2026"}
            )
            session.add(teacher)
            await session.flush()
            print(f"✅ Created teacher: {teacher.name}")
        teacher_id = str(teacher.id)

        # Find department
        r = await session.execute(select(models.Department).where(models.Department.college_id == college_id))
        depts = r.scalars().all()
        dept = depts[0] if depts else None
        dept_id = str(dept.id) if dept else uid()

        # ── 2. Faculty Assignments (Subjects) ────────────────────────────────
        print("\n📚 Seeding faculty assignments...")
        existing = await session.execute(
            select(models.FacultyAssignment).where(
                models.FacultyAssignment.college_id == college_id,
                models.FacultyAssignment.department == "DS",
                models.FacultyAssignment.batch == "2026"
            )
        )
        if not existing.scalars().first():
            for subj in SUBJECTS:
                session.add(models.FacultyAssignment(
                    id=uid(), college_id=college_id, teacher_id=teacher_id,
                    subject_code=subj["code"], subject_name=subj["name"],
                    department="DS", batch="2026", section="A",
                    semester=5, academic_year="2025-2026",
                    credits=subj["credits"], hours_per_week=subj["hours"],
                    is_lab=subj.get("is_lab", False)
                ))
            await session.flush()
            print(f"  → Created {len(SUBJECTS)} subject assignments")
        else:
            print("  → Already exist, skipping")

        # ── 3. Period Slots (Timetable) ──────────────────────────────────────
        print("\n📅 Seeding timetable...")
        existing_slots = await session.execute(
            select(models.PeriodSlot).where(
                models.PeriodSlot.college_id == college_id,
                models.PeriodSlot.department_id == dept_id
            )
        )
        all_slots = existing_slots.scalars().all()
        if not all_slots:
            slot_records = []
            for day_idx, day in enumerate(DAYS):
                for period in PERIODS:
                    subj = SUBJECTS[(day_idx * len(PERIODS) + period["period"] - 1) % len(SUBJECTS)]
                    slot = models.PeriodSlot(
                        id=uid(), college_id=college_id,
                        department_id=dept_id, batch="2026", section="A",
                        semester=5, academic_year="2025-2026",
                        day=day, period_no=period["period"],
                        start_time=period["start"], end_time=period["end"],
                        subject_code=subj["code"], subject_name=subj["name"],
                        faculty_id=teacher_id, slot_type="lab" if subj.get("is_lab") else "regular",
                    )
                    slot_records.append(slot)
                    session.add(slot)
            await session.flush()
            all_slots = slot_records
            print(f"  → Created {len(slot_records)} period slots")
        else:
            print(f"  → {len(all_slots)} slots already exist, skipping")

        # ── 4. Attendance Records ────────────────────────────────────────────
        print("\n✋ Seeding attendance...")
        existing_att = await session.execute(
            select(models.AttendanceRecord).where(models.AttendanceRecord.student_id == student_id).limit(1)
        )
        if not existing_att.scalars().first():
            slot_by_day = {}
            for s in all_slots:
                slot_by_day.setdefault(s.day, []).append(s)
            
            att_count = 0
            today = date.today()
            for day_offset in range(60):
                d = today - timedelta(days=day_offset)
                if d.weekday() >= 6:  # Sunday
                    continue
                day_code = DAYS[d.weekday()] if d.weekday() < 6 else None
                if not day_code or day_code not in slot_by_day:
                    continue
                for slot in slot_by_day[day_code]:
                    r_val = random.random()
                    status = "present" if r_val < 0.85 else ("absent" if r_val < 0.95 else "late")
                    session.add(models.AttendanceRecord(
                        id=uid(), college_id=college_id,
                        period_slot_id=str(slot.id), date=d,
                        faculty_id=teacher_id, student_id=student_id,
                        subject_code=slot.subject_code, status=status,
                    ))
                    att_count += 1
            await session.flush()
            print(f"  → Created {att_count} attendance records (~85% present)")
        else:
            print("  → Already exist, skipping")

        # ── 5. CIA Marks (via MarkSubmission + MarkSubmissionEntry) ───────────
        print("\n📝 Seeding CIA marks...")
        existing_cia = await session.execute(
            select(models.MarkSubmissionEntry).where(models.MarkSubmissionEntry.student_id == student_id).limit(1)
        )
        # Get faculty assignment IDs
        fa_r = await session.execute(
            select(models.FacultyAssignment).where(
                models.FacultyAssignment.college_id == college_id,
                models.FacultyAssignment.department == "DS",
                models.FacultyAssignment.batch == "2026"
            )
        )
        fa_map = {fa.subject_code: fa for fa in fa_r.scalars().all()}

        if not existing_cia.scalars().first():
            cia_count = 0
            for subj in SUBJECTS:
                if subj.get("is_lab"):
                    continue
                fa = fa_map.get(subj["code"])
                if not fa:
                    continue
                for exam_type in ["CIA-1", "CIA-2", "Assignment-1"]:
                    max_marks = 50 if "CIA" in exam_type else 20
                    scored = round(random.uniform(max_marks * 0.55, max_marks * 0.95), 1)
                    # Create MarkSubmission
                    sub = models.MarkSubmission(
                        id=uid(), college_id=college_id, faculty_id=teacher_id,
                        assignment_id=str(fa.id), subject_code=subj["code"],
                        exam_type=exam_type, max_marks=max_marks, semester=5,
                        status="approved",
                        submitted_at=datetime.now(timezone.utc),
                        published_at=datetime.now(timezone.utc),
                    )
                    session.add(sub)
                    await session.flush()
                    # Create entry for the student
                    session.add(models.MarkSubmissionEntry(
                        id=uid(), college_id=college_id,
                        submission_id=str(sub.id), student_id=student_id,
                        marks_obtained=scored, status="present"
                    ))
                    cia_count += 1
            await session.flush()
            print(f"  → Created {cia_count} CIA mark entries")
        else:
            print("  → Already exist, skipping")

        # ── 6. Academic Calendar ─────────────────────────────────────────────
        print("\n🗓️  Seeding academic calendar...")
        existing_cal = await session.execute(
            select(models.AcademicCalendar).where(models.AcademicCalendar.college_id == college_id).limit(1)
        )
        if not existing_cal.scalars().first():
            events = [
                {"name": "Republic Day", "date": "2026-01-26", "type": "holiday"},
                {"name": "CIA-1 Week", "date": "2026-01-20", "type": "exam"},
                {"name": "Sports Day", "date": "2026-02-15", "type": "event"},
                {"name": "CIA-2 Week", "date": "2026-03-09", "type": "exam"},
                {"name": "Holi", "date": "2026-03-17", "type": "holiday"},
                {"name": "Ugadi", "date": "2026-03-29", "type": "holiday"},
                {"name": "Good Friday", "date": "2026-04-03", "type": "holiday"},
                {"name": "Technical Symposium", "date": "2026-03-28", "type": "event"},
                {"name": "End Semester Exams Begin", "date": "2026-04-20", "type": "exam"},
            ]
            cal = models.AcademicCalendar(
                id=uid(), college_id=college_id,
                academic_year="2025-2026", semester=5,
                start_date=date(2025, 12, 1),
                end_date=date(2026, 5, 15),
                working_days=["MON", "TUE", "WED", "THU", "FRI", "SAT"],
                events=events,
            )
            session.add(cal)
            await session.flush()
            print(f"  → Created academic calendar with {len(events)} events")
        else:
            print("  → Already exists, skipping")

        # ── 7. Fee Invoices ──────────────────────────────────────────────────
        print("\n💰 Seeding fee invoices...")
        existing_fees = await session.execute(
            select(models.StudentFeeInvoice).where(models.StudentFeeInvoice.student_id == student_id).limit(1)
        )
        if not existing_fees.scalars().first():
            invoices = [
                {"type": "Tuition Fee - Sem 5", "amount": 45000, "due": "2025-12-15"},
                {"type": "Exam Fee - Sem 5", "amount": 2500, "due": "2026-04-01"},
                {"type": "Library Fee", "amount": 1500, "due": "2025-12-30"},
            ]
            for inv in invoices:
                session.add(models.StudentFeeInvoice(
                    id=uid(), college_id=college_id,
                    student_id=student_id,
                    fee_type=inv["type"], total_amount=inv["amount"],
                    academic_year="2025-2026",
                    due_date=datetime.strptime(inv["due"], "%Y-%m-%d").replace(tzinfo=timezone.utc),
                    description=f"{inv['type']} for Academic Year 2025-2026"
                ))
            await session.flush()
            print(f"  → Created {len(invoices)} fee invoices")
        else:
            print("  → Already exist, skipping")

        await session.commit()
        print("\n🎉 All student mock data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(main())
