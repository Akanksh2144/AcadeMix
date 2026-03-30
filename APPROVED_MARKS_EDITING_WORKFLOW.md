# Approved Marks Editing & Revision Workflow ✅

## Requirement
After HOD approves marks:
1. **View approved marks** in marks entry (read-only initially)
2. **Edit with reason** → Require revision reason before allowing edits
3. **Re-submit for approval** → Edited marks must be re-approved by HOD
4. **Final results** → Only approved marks should reflect in end results

## Implementation

### Frontend Changes (`/app/frontend/src/pages/MarksEntry.js`)

#### 1. Added State for Revision Tracking (Lines 11-12)
```javascript
const [isEditingApproved, setIsEditingApproved] = useState(false);
const [revisionReason, setRevisionReason] = useState('');
```

#### 2. Updated Editable Logic (Line 118)
```javascript
// Before: Only draft/new/rejected are editable
const isEditable = status === 'new' || status === 'draft' || status === 'rejected';

// After: Also editable when in "editing approved" mode
const isEditable = status === 'new' || status === 'draft' || status === 'rejected' || isEditingApproved;
```

#### 3. Added Function to Enable Editing (Lines 128-136)
```javascript
const handleEnableEditApproved = () => {
  const reason = prompt('Enter reason for editing approved marks:');
  if (!reason || reason.trim() === '') {
    alert('Reason is required to edit approved marks');
    return;
  }
  setRevisionReason(reason.trim());
  setIsEditingApproved(true);
};
```

#### 4. Updated Save Function (Lines 82-105)
**Includes revision reason when editing approved marks:**
```javascript
const payload = {
  assignment_id: selectedAssignment.id, 
  exam_type: examType,
  semester: selectedAssignment.semester, 
  max_marks: maxMarks, 
  entries
};

// If editing approved marks, include revision reason
if (isEditingApproved && revisionReason) {
  payload.revision_reason = revisionReason;
}

await marksAPI.saveEntry(payload);
setStatus('draft');
alert(isEditingApproved ? 'Revised marks saved as draft. Submit for re-approval.' : 'Marks saved as draft');
```

#### 5. Updated Submit Function (Lines 107-126)
**Resets editing state after re-submission:**
```javascript
await marksAPI.submit(entryId);
setStatus('submitted');
setIsEditingApproved(false);
setRevisionReason('');
alert('Marks submitted for HOD approval');
```

#### 6. Enhanced UI (Lines 315-383)
**Shows appropriate UI based on status:**

##### When Approved (Not Editing):
```javascript
<div className="mt-6 p-4 bg-emerald-50 rounded-2xl flex items-center justify-between">
  <div className="flex items-center gap-3">
    <CheckCircle size={20} weight="duotone" className="text-emerald-500" />
    <p className="text-sm font-medium text-emerald-700">
      Marks approved by HOD. These will reflect in final results.
    </p>
  </div>
  <button onClick={handleEnableEditApproved} className="btn-secondary">
    <PencilLine size={16} weight="duotone" /> Edit Approved Marks
  </button>
</div>
```

##### When Editing Approved:
- Shows revision reason: "📝 Revision: [reason]"
- Status badge shows: "Editing Approved"
- Save button: Available
- Submit button: Changes to "Re-submit for Approval"

---

### Backend Changes (`/app/backend/server.py`)

#### 1. Updated Model (Lines 168-174)
**Added optional revision_reason field:**
```python
class MarkEntrySave(BaseModel):
    assignment_id: str
    exam_type: str  # mid1 or mid2
    semester: int
    max_marks: float = 30
    entries: List[MarkEntryItem]
    revision_reason: Optional[str] = None  # NEW
```

#### 2. Updated save_mark_entry Endpoint (Lines 746-810)
**Complete revision workflow:**

##### Editing Approved Marks:
```python
if current_status == "approved":
    if not req.revision_reason or not req.revision_reason.strip():
        raise HTTPException(status_code=400, detail="Revision reason is required to edit approved marks")
    
    # Create revision history entry
    revision_history = existing.get("revision_history", [])
    revision_history.append({
        "revised_at": datetime.now(timezone.utc),
        "revised_by": user["id"],
        "reviser_name": user["name"],
        "reason": req.revision_reason,
        "previous_status": "approved"
    })
    
    # Update with new entries and change status back to draft
    await db.mark_entries.update_one({"_id": existing["_id"]}, {"$set": {
        "entries": entries_data, 
        "max_marks": req.max_marks,
        "status": "draft",
        "revision_history": revision_history,
        "updated_at": datetime.now(timezone.utc)
    }})
```

##### Key Changes:
- **Requires revision_reason** for approved marks edits
- **Stores revision history** with timestamp, user, and reason
- **Changes status to "draft"** (requires re-approval)
- **Prevents editing submitted** (non-approved) marks

---

## Complete Workflow

### Normal Flow (First Time):
```
Draft → Save → Submit → (HOD Approves) → Approved ✅
                                        → Reflects in Final Results ✅
```

### Revision Flow:
```
Approved → Click "Edit Approved Marks" 
        → Enter Reason (Prompt)
        → Marks become editable
        → Edit marks
        → Save Draft (with revision reason)
        → Status: Draft (requires re-approval)
        → Submit for Approval
        → (HOD Re-approves) → Approved ✅
                            → Updated marks reflect in Final Results ✅
```

### Data Model - Revision History:
```json
{
  "assignment_id": "...",
  "exam_type": "mid1",
  "status": "draft",  // Changed from "approved" to "draft"
  "entries": [...],
  "revision_history": [
    {
      "revised_at": "2024-01-15T10:30:00Z",
      "revised_by": "teacher_id_123",
      "reviser_name": "Prof. John Doe",
      "reason": "Student complained about marks calculation error",
      "previous_status": "approved"
    }
  ]
}
```

---

## User Experience

### Teacher/HOD View - Approved Marks

#### Initial State:
- ✅ Can view all marks (read-only)
- ✅ Green badge: "Marks approved by HOD"
- ✅ Message: "These will reflect in final results"
- ✅ Button: "Edit Approved Marks"

#### After Clicking Edit:
1. Prompt appears: "Enter reason for editing approved marks:"
2. User enters reason (required)
3. Marks become editable
4. Status changes to: "Editing Approved"
5. Shows revision reason: "📝 Revision: [reason]"
6. Can edit marks
7. Save button: "Save Draft"
8. Submit button: "Re-submit for Approval"

#### After Re-submission:
- Status: "Submitted"
- Waiting for HOD re-approval
- If approved → Marks updated in final results
- If rejected → Can edit again

---

## Benefits

### 1. Data Integrity
- ✅ Maintains audit trail with revision history
- ✅ Requires reason for any changes to approved marks
- ✅ Prevents unauthorized edits

### 2. Accountability
- ✅ Tracks who edited, when, and why
- ✅ HOD can see revision history before re-approving
- ✅ Clear paper trail for audits

### 3. Quality Control
- ✅ Only approved marks reflect in final results
- ✅ Re-approval process ensures correctness
- ✅ Prevents accidental final result modifications

### 4. User-Friendly
- ✅ Clear visual feedback at each step
- ✅ Simple workflow with prompts
- ✅ Prevents mistakes with validation

---

## Testing

### Test Case 1: View Approved Marks ✅
1. Mark entry has status "approved"
2. Open marks entry page
3. See all marks (read-only)
4. See "Edit Approved Marks" button

### Test Case 2: Edit Without Reason ✅
1. Click "Edit Approved Marks"
2. Cancel prompt or enter empty reason
3. Alert: "Reason is required to edit approved marks"
4. Marks remain read-only

### Test Case 3: Edit With Reason ✅
1. Click "Edit Approved Marks"
2. Enter reason: "Calculation error found"
3. Marks become editable
4. Edit marks
5. Save as draft (includes revision reason)
6. Status changes to "draft"
7. Submit for re-approval
8. Status changes to "submitted"

### Test Case 4: Revision History ✅
1. Check database after editing approved marks
2. Verify `revision_history` array exists
3. Contains: revised_at, revised_by, reviser_name, reason, previous_status

### Test Case 5: Backend Validation ✅
1. Try to save approved marks without revision_reason via API
2. Should return 400 error: "Revision reason is required to edit approved marks"

---

## API Contract

### POST `/api/marks/entry`

**Request:**
```json
{
  "assignment_id": "abc123",
  "exam_type": "mid1",
  "semester": 3,
  "max_marks": 30,
  "entries": [...],
  "revision_reason": "Student reported grade discrepancy"  // Required for approved marks
}
```

**Response (Success):**
```json
{
  "id": "entry_id_123",
  "status": "draft",  // Changed from "approved"
  "revision_history": [...]
}
```

**Response (Error - No Reason):**
```json
{
  "detail": "Revision reason is required to edit approved marks"
}
```

---

## Linting Status
- ✅ Python linting passed
- ✅ JavaScript linting passed
- Ready for user verification
