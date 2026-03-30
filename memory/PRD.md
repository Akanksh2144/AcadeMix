# College Quiz Platform & Results Portal - PRD

## Original Problem Statement
Build a full-stack cross-platform College Quiz Platform & Results Portal with three roles: Students, Teachers/Faculty, and Admin/HOD. Key features include a robust quiz engine (MCQ, True/False, Short Answer, Coding), anti-cheat/proctoring, a semester results portal, combined analytics, and notifications.

## Tech Stack
- **Frontend**: React + TailwindCSS + Shadcn UI + Recharts + Monaco Editor
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Auth**: JWT (httpOnly cookies + Bearer token)
- **Design**: "Smooth, rounded" light aesthetic with DM Sans / Nunito fonts

## User Personas
- **Students**: Take quizzes, view results, track analytics, view semester results
- **Teachers**: Create quizzes, monitor live attempts, view analytics, manage results
- **Admins**: User management, system oversight, department analytics

## Core Requirements

### Authentication
- JWT-based login with college ID + password
- Role-based access (student, teacher, admin)
- Persistent session via localStorage

### Quiz Engine
- Question types: MCQ, True/False, Short Answer, **Coding** (with Monaco editor + backend execution)
- Timer, auto-submit on timeout
- Question navigation panel
- Code execution via `/api/code/execute` (Python, JavaScript, Java)

### Results Portal
- Semester results with SGPA/CGPA tracking
- Subject-wise grades and credit details
- Data seeded from real marksheet PDFs

### Analytics
- **Two tabs**: Quiz Analytics + Semester Analytics
- Quiz: Performance trend, subject averages, skills radar, question type accuracy
- Semester: SGPA/CGPA trend, semester bar chart, detailed subject tables

---

## What's Been Implemented

### Phase 1 - MVP (Complete)
- [x] React frontend with all page routing
- [x] "Smooth, rounded" design aesthetic
- [x] FastAPI + MongoDB backend
- [x] JWT Authentication (login, register, logout, session persistence)
- [x] Student Dashboard with stats, active quizzes, recent results
- [x] Teacher Dashboard with quiz management
- [x] Admin Dashboard with system overview
- [x] Quiz Attempt flow (MCQ, True/False, Short Answer)
- [x] Auto-grading engine
- [x] Semester Results page with real marksheet data
- [x] Leaderboard
- [x] Quiz Builder (teacher)
- [x] User Management (admin)

### Phase 2 - Recent Updates (Complete - March 30, 2026)
- [x] **Coding Quiz Support**: Monaco editor for coding questions, backend code execution (Python/JS/Java)
- [x] **Login Page Fixes**: Auto-capitalize College ID, fixed icon/text overlap (pl-12 padding)
- [x] **Analytics Tab Split**: Quiz Analytics and Semester Analytics separated into tabs
- [x] **Python Coding Challenge quiz**: 3 coding questions seeded (factorial, palindrome, fibonacci)
- [x] Code execution endpoint with 10s timeout, 10KB code limit
- [x] **Code Playground**: Standalone practice page with Monaco editor, language switching (Python/JS/Java), stdin input, output display, run history, 6 built-in challenges (Two Sum, Reverse String, FizzBuzz, Palindrome, Fibonacci, Binary Search), accessible from Student Dashboard

---

## Pending / Upcoming Tasks

### P0 - High Priority
- [ ] Anti-Cheat & Proctoring (tab-switch detection, fullscreen lock, webcam snapshots)

### P1 - Medium Priority
- [ ] Results Portal enhancements (PDF marksheet upload & parsing for teachers)
- [ ] Teacher Dashboard flows (Quiz Builder to backend, Live Monitor websockets)

### P2 - Lower Priority
- [ ] Notification System (FCM Push, SendGrid Email, In-app Socket.io)
- [ ] Admin ERP Sync Configuration
- [ ] Modularize backend (split server.py into routes/models)

---

## Key API Endpoints
- `POST /api/auth/login` - JWT login
- `GET /api/auth/me` - Current user
- `GET /api/quizzes` - List quizzes
- `POST /api/quizzes` - Create quiz (teacher/admin)
- `POST /api/quizzes/{id}/start` - Start quiz attempt
- `POST /api/attempts/{id}/answer` - Submit answer
- `POST /api/attempts/{id}/submit` - Submit quiz
- `POST /api/code/execute` - Execute code (Python/JS/Java)
- `GET /api/results/semester/{id}` - Semester results
- `GET /api/analytics/student/{id}` - Student analytics
- `GET /api/dashboard/student` - Student dashboard
- `GET /api/leaderboard` - Leaderboard

## DB Collections
- `users` - User accounts with roles
- `quizzes` - Quiz definitions with questions
- `quiz_attempts` - Student quiz attempts and results
- `semester_results` - Semester academic results
