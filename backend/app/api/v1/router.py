from fastapi import APIRouter

from app.routers import (
    auth, code_execution, health, leaves, attendance, cia, marks, parents, users, departments, 
    quizzes, timetable, teaching_records, registrations, hall_tickets, placements, alumni, expert, 
    principal, grievances, tasks, retired_faculty, sections, roles, assignments, calendars, 
    exam_cell_core, student_core, hod_core, faculty_core, admin_core, attempts, results, analytics, 
    leaderboard, dashboards, marks_extra, timetable_extra, announcements, challenges, industry, tpo, fees, webhooks
)
from app.routers import nodal_routes

api_router = APIRouter()

# Domain routes without extra prefix (mounted under /api globally).
# Notice 'tasks' was duplicated in previous config, kept single here.
api_router.include_router(industry.router, tags=["industry"])
api_router.include_router(challenges.router, tags=["challenges"])
api_router.include_router(announcements.router, tags=["announcements"])
api_router.include_router(timetable_extra.router, tags=["timetable_extra"])
api_router.include_router(marks_extra.router, tags=["marks_extra"])
api_router.include_router(dashboards.router, tags=["dashboards"])
api_router.include_router(leaderboard.router, tags=["leaderboard"])
api_router.include_router(analytics.router, tags=["analytics"])
api_router.include_router(results.router, tags=["results"])
api_router.include_router(attempts.router, tags=["attempts"])
api_router.include_router(tpo.router, tags=["tpo"])
api_router.include_router(fees.router, tags=["fees"])
api_router.include_router(tasks.router, tags=["tasks"])
api_router.include_router(admin_core.router, tags=["admin_core"])
api_router.include_router(faculty_core.router, tags=["faculty_core"])
api_router.include_router(hod_core.router, tags=["hod_core"])
api_router.include_router(student_core.router, tags=["student_core"])
api_router.include_router(exam_cell_core.router, tags=["exam_cell_core"])
api_router.include_router(calendars.router, tags=["calendars"])
api_router.include_router(assignments.router, tags=["assignments"])
api_router.include_router(roles.router, tags=["roles"])
api_router.include_router(sections.router, tags=["sections"])
api_router.include_router(retired_faculty.router, tags=["retired_faculty"])
api_router.include_router(grievances.router, tags=["grievances"])
api_router.include_router(principal.router, tags=["principal"])
api_router.include_router(expert.router, tags=["expert"])
api_router.include_router(alumni.router, tags=["alumni"])
api_router.include_router(placements.router, tags=["placements"])
api_router.include_router(hall_tickets.router, tags=["hall_tickets"])
api_router.include_router(registrations.router, tags=["registrations"])
api_router.include_router(teaching_records.router, tags=["teaching_records"])
api_router.include_router(timetable.router, tags=["timetable"])
api_router.include_router(quizzes.router, tags=["quizzes"])
api_router.include_router(departments.router, tags=["departments"])
api_router.include_router(users.router, tags=["users"])
api_router.include_router(parents.router, tags=["parents"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(leaves.router, tags=["leaves"])
api_router.include_router(attendance.router, tags=["attendance"])
api_router.include_router(cia.router, tags=["cia"])
api_router.include_router(marks.router, tags=["marks"])

# Sub-prefixes — these routers use relative paths, so we add auth/code here
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(code_execution.router, prefix="/code", tags=["code"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])

# Nodal Router (historical top-level route, now safely namespaced if possible, keeping legacy /api scope mostly)
api_router.include_router(nodal_routes.nodal_router, tags=["nodal_officer"])
