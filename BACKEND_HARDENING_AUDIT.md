# AcadeMix Backend Hardening Audit & Roadmap

This document outlines the findings of the comprehensive backend audit, tracking what has been resolved and the roadmap for remaining hardening tasks as we prepare for the college-wide pilot.

## 🟢 Resolved Items (Completed)

| Issue | Resolution |
| :--- | :--- |
| **Code Execution Timeout** | Raised backend `httpx` timeout to 60s. Code-runner handles per-phase timeouts internally. |
| **C++ Compilation Timeouts** | Scaled Fly.io code-runner machines to 1GB RAM. Switched C/C++ compiler flag to `-O0` for fast compilation. Elevated compilation limits to 60s CPU time. |
| **Java Silent Hangs** | Added `-XX:TieredStopAtLevel=1`, `-Xmx512m`, `-Xms64m`, `-Xss512k` to bypass JIT compilation overhead and keep JVM within resource limits. |

## 🟡 Phase 1: Critical Security (In Progress)
*These must be completed immediately prior to pilot.*

- [ ] **Connection Pool Scaling:** Upgrade Supabase connection pool config (`database.py`) to `pool_size=20`, `max_overflow=30`, `pool_timeout=10`, `pool_recycle=600`.
- [ ] **Data Validation:** Implement Pydantic `Field` bounds checking for all major models in `server.py` (e.g., `QuizCreate.duration_mins`, `MarkEntrySave.max_marks`).
- [ ] **Rate Limiting:** Protect code-runner from abuse by applying `@limiter.limit("30/minute")` to `/api/code/execute` and reducing answer submissions to `60/minute`.

## 🟠 Phase 2: Important Hardening (Pre-Rollout)
*To be completed after Phase 1 and before the full college rollout.*

- [ ] **Audit Logging:** Implement an `AuditLog` table and trace all state-changing mutations (mark edits, quiz publishing/deletions, role changes) by teachers and admins.
- [ ] **RBAC Enforcement:** Wire up the existing `require_permission(module, action)` middleware to replace legacy broad `require_role()` checks on sensitive actions (e.g., enforcing exam cell vs department boundaries).
- [ ] **Database Indexes:** Add critical indexes for frequent queries, specifically resolving N+1 patterns:
  - `questions.quiz_id`
  - `quiz_attempts.quiz_id` + `student_id`
  - `quiz_answers.attempt_id`
  - `mark_entries.student_id`

## ⚪ Phase 3: Post-Pilot Polish
*To be evaluated based on pilot performance and scaling needs.*

- [ ] **Migrate Challenges:** Move `_challenges_store` from in-memory lists to a formal PostgreSQL `CodingChallenge` table with starter code and test cases.
- [ ] **Profile Data Refactor:** Extract frequently queried fields (`college_id`, `department`, `batch`, `section`) from the `User.profile_data` JSONB column into explicit indexed columns.
- [ ] **N+1 Query Elimination:** Implement `selectinload()` for endpoints mapping heavy nested relations (like Quiz -> Questions).
- [ ] **AST Python Validation:** Upgrade `_validate_code()` logic in the runner from regex-based blocks to strict Python Abstract Syntax Tree (AST) parsing.
