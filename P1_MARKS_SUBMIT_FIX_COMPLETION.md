# P1: Fix "Marks Submit for HOD Approval Not Working" - COMPLETED ✅

## Issue Description
User reported: "create quiz, marks submit for hod approval not working" (Message 136)

The root cause was that HOD users (who are also faculty members) could not:
1. Fetch their faculty assignments
2. View existing marks entries
3. Save marks entries (draft)
4. Submit marks for approval

This was because the backend API endpoints were restricted to only `"teacher"` role.

## Root Cause Analysis

### Backend Authorization Issue
Four critical endpoints had role restrictions that excluded HOD:

1. **GET `/api/marks/my-assignments`** (Line 730)
   - Before: `require_role("teacher")`
   - Issue: HODs couldn't see their assigned subjects

2. **GET `/api/marks/entry/{assignment_id}/{exam_type}`** (Line 740)
   - Before: `require_role("teacher")`
   - Issue: HODs couldn't retrieve existing marks entries

3. **POST `/api/marks/entry`** (Line 747)
   - Before: `require_role("teacher")`
   - Issue: HODs couldn't save marks (draft or submit)

4. **POST `/api/marks/submit/{entry_id}`** (Line 775)
   - Before: `require_role("teacher")`
   - Issue: HODs couldn't submit marks for approval

## Changes Made

### Updated `/app/backend/server.py`

#### 1. Allow HOD to fetch their assignments (Line 730)
```python
# Before
@app.get("/api/marks/my-assignments")
async def my_assignments(user: dict = Depends(require_role("teacher"))):

# After
@app.get("/api/marks/my-assignments")
async def my_assignments(user: dict = Depends(require_role("teacher", "hod"))):
```

#### 2. Allow HOD to retrieve marks entries (Line 740)
```python
# Before
@app.get("/api/marks/entry/{assignment_id}/{exam_type}")
async def get_mark_entry(assignment_id: str, exam_type: str, user: dict = Depends(require_role("teacher"))):

# After
@app.get("/api/marks/entry/{assignment_id}/{exam_type}")
async def get_mark_entry(assignment_id: str, exam_type: str, user: dict = Depends(require_role("teacher", "hod"))):
```

#### 3. Allow HOD to save marks entries (Line 747)
```python
# Before
@app.post("/api/marks/entry")
async def save_mark_entry(req: MarkEntrySave, user: dict = Depends(require_role("teacher"))):

# After
@app.post("/api/marks/entry")
async def save_mark_entry(req: MarkEntrySave, user: dict = Depends(require_role("teacher", "hod"))):
```

#### 4. Allow HOD to submit marks (Line 775)
```python
# Before
@app.post("/api/marks/submit/{entry_id}")
async def submit_marks(entry_id: str, user: dict = Depends(require_role("teacher"))):

# After
@app.post("/api/marks/submit/{entry_id}")
async def submit_marks(entry_id: str, user: dict = Depends(require_role("teacher", "hod"))):
```

## How The Full Workflow Works Now

### For HODs who are also Faculty:

1. **Assignment Check**: HOD is assigned subjects in `faculty_assignments` collection with `teacher_id` = HOD's user ID

2. **Marks Entry Tab**: 
   - HOD navigates to "Marks Entry" tab in their dashboard
   - Sees their assigned subjects (fetched via `/api/marks/my-assignments`)

3. **Enter Marks**: 
   - Clicks "Enter Marks" button → navigates to MarksEntry page
   - Selects subject and exam type (Mid-1 or Mid-2)
   - Fetches students via `/api/marks/students` (already supported HOD)
   - Enters marks for each student

4. **Save Draft**: 
   - Clicks "Save Draft" → calls `/api/marks/entry` (now works for HOD)
   - Entry saved with status="draft"

5. **Submit for Approval**:
   - Clicks "Submit for Approval" → calls `/api/marks/submit/{entry_id}` (now works for HOD)
   - Entry status changes to "submitted"
   - **Important**: When HOD submits marks, they go to ANOTHER HOD or Admin for review (since the submitter can't approve their own work)

6. **Review Process**:
   - Another HOD (from same department) or Admin can approve/reject via `/api/marks/review/{entry_id}`
   - Entry status changes to "approved" or "rejected"

## Verification Tests

### Test 1: Fetch Assignments ✅
```bash
curl GET /api/marks/my-assignments
Authorization: Bearer <HOD_TOKEN>
Response: [{"id": "...", "subject_code": "22ET301", ...}, ...]
```

### Test 2: Save Marks Entry ✅
```bash
curl POST /api/marks/entry
Authorization: Bearer <HOD_TOKEN>
Body: { "assignment_id": "...", "exam_type": "mid1", "entries": [...] }
Response: { "id": "...", "status": "draft", ... }
```

### Test 3: Submit for Approval ✅
```bash
curl POST /api/marks/submit/<entry_id>
Authorization: Bearer <HOD_TOKEN>
Response: { "message": "Marks submitted for HOD approval" }
```

All three tests passed successfully!

## Notes

- The `/api/marks/students` endpoint already had "hod" in allowed roles (Line 735), so no change was needed
- HOD marks submissions will need approval from another HOD or Admin (business logic remains unchanged)
- Python linting passed - no syntax errors

## User Acceptance Testing Required

User should verify:
1. Login as HOD (HOD001 / hod123)
2. Go to Marks Entry tab
3. Click "Enter Marks" button
4. Select a subject and Mid-1
5. Enter marks for students
6. Click "Save Draft" - should succeed
7. Click "Submit for Approval" - should succeed
8. Verify submission appears in another HOD's or Admin's "Mark Reviews" section
