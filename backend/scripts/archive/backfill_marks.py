import asyncio
from database import AdminSessionLocal
from sqlalchemy.future import select
from app import models

async def backfill_marks():
    async with AdminSessionLocal() as session:
        # Get all MarkEntry objects
        result = await session.execute(select(models.MarkEntry))
        entries = result.scalars().all()
        
        migrated = 0
        migrated_entries = 0
        
        for e in entries:
            data = e.extra_data or {}
            assignment_id = data.get("assignment_id")
            if not assignment_id:
                # Need to try to match assignment
                assign_r = await session.execute(
                    select(models.FacultyAssignment).where(
                        models.FacultyAssignment.teacher_id == e.faculty_id,
                        models.FacultyAssignment.subject_code == e.course_id,
                        models.FacultyAssignment.college_id == e.college_id
                    )
                )
                assign = assign_r.scalars().first()
                if assign:
                    assignment_id = assign.id
                else:
                    print(f"Skipping entry {e.id} - No assignment map found")
                    continue
                    
            component_id = data.get("component_id")
            
            sub_r = await session.execute(
                select(models.MarkSubmission).where(
                    models.MarkSubmission.assignment_id == assignment_id,
                    models.MarkSubmission.exam_type == e.exam_type,
                    models.MarkSubmission.component_id == component_id
                )
            )
            sub = sub_r.scalars().first()
            if not sub:
                sub = models.MarkSubmission(
                    college_id=e.college_id,
                    faculty_id=e.faculty_id,
                    assignment_id=assignment_id,
                    subject_code=e.course_id,
                    exam_type=e.exam_type,
                    component_id=component_id,
                    max_marks=e.max_marks,
                    semester=1, # Default fallback if assign object wasn't retrieved
                    status=data.get("status", "draft"),
                    reviewed_by=data.get("reviewed_by"),
                    review_remarks=data.get("review_remarks")
                )
                session.add(sub)
                await session.flush()
                migrated += 1
                
            entries_list = data.get("entries", [])
            
            ex_mse_r = await session.execute(
                select(models.MarkSubmissionEntry).where(
                    models.MarkSubmissionEntry.submission_id == sub.id
                )
            )
            ex_mse = {mse.student_id: mse for mse in ex_mse_r.scalars().all()}
            
            for se in entries_list:
                stud_id = se.get("student_id")
                if not stud_id:
                    continue
                marks_obtained = float(se.get("marks_obtained", 0))
                status = se.get("status", "present")
                
                if stud_id in ex_mse:
                    ex_mse[stud_id].marks_obtained = marks_obtained
                    ex_mse[stud_id].status = status
                else:
                    session.add(models.MarkSubmissionEntry(
                        submission_id=sub.id,
                        student_id=stud_id,
                        marks_obtained=marks_obtained,
                        status=status
                    ))
                    migrated_entries += 1
                    
        await session.commit()
        print(f"Migration complete: {migrated} Submissions, {migrated_entries} SubmissionEntries.")

if __name__ == "__main__":
    asyncio.run(backfill_marks())
