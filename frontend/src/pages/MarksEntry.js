import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, PaperPlaneTilt, FloppyDisk, CheckCircle, Clock, Warning, WarningCircle, Percent, ChartBar, PencilLine, X, DownloadSimple, UploadSimple } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader';
import { marksAPI } from '../services/api';
import * as XLSX from 'xlsx';

const MarksEntry = ({ navigate, user, preselectedAssignment }) => {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(preselectedAssignment || null);
  const [examType, setExamType] = useState('mid1');
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [maxMarks, setMaxMarks] = useState(30);
  const [entryId, setEntryId] = useState(null);
  const [status, setStatus] = useState('new');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirectNavigation, setIsDirectNavigation] = useState(!!preselectedAssignment);
  const [isEditingApproved, setIsEditingApproved] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const importFileRef = useRef(null);
  
  // Custom UI Dialogs
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [promptDialog, setPromptDialog] = useState(null);
  const [promptInput, setPromptInput] = useState('');

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Excel Template Download ─────────────────────────────
  const handleDownloadTemplate = () => {
    if (!students.length) return showToast('Load a class first to download template', 'error');

    const wb = XLSX.utils.book_new();
    const sheetName = `${selectedAssignment?.subject_code || 'Marks'}_${examType}`;

    // Row 1: Max Marks header (single value, editable by teacher)
    // Row 2: blank separator
    // Row 3: column headers
    // Row 4+: student data
    const wsData = [
      ['Max Marks', maxMarks],              // Row 1 — fill this value once
      [],                                   // Row 2 — blank
      ['S.No', 'College ID', 'Student Name', 'Marks Obtained'], // Row 3 — headers
      ...students.map((s, i) => [
        i + 1,
        s.college_id,
        s.name,
        marks[s.id] ?? '',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 32 }, { wch: 18 }];
    // Bold the Max Marks label
    if (!ws['!fonts']) ws['!fonts'] = [];
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    XLSX.writeFile(wb, `${sheetName}_template.xlsx`);
  };

  // ── Excel Import ────────────────────────────────────────
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Read raw rows as arrays to check for our header layout
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!raw.length) return showToast('The spreadsheet appears to be empty.', 'error');

        // --- Detect max marks from Row 1 (our template layout: ['Max Marks', value]) ---
        let parsedMax = null;
        if (String(raw[0]?.[0] || '').toLowerCase().includes('max marks')) {
          const v = parseFloat(raw[0][1]);
          if (!isNaN(v) && v > 0) parsedMax = v;
        }

        // --- Find the header row (the row containing 'College ID') ---
        let headerRowIdx = raw.findIndex(row =>
          row.some(cell => String(cell).toLowerCase().includes('college id'))
        );
        // Fallback: treat row 0 as header if not found (old template format)
        if (headerRowIdx === -1) headerRowIdx = 0;

        const headers = raw[headerRowIdx].map(h => String(h).trim());
        const colIdx = {
          collegeId: headers.findIndex(h => h.toLowerCase().includes('college id')),
          marks: headers.findIndex(h => h.toLowerCase().includes('marks obtained')),
        };

        if (colIdx.collegeId === -1 || colIdx.marks === -1) {
          return showToast('Could not find required columns. Please use the downloaded template.', 'error');
        }

        if (parsedMax) setMaxMarks(parsedMax);

        // Build lookup
        const idMap = {};
        students.forEach(s => { idMap[String(s.college_id).trim().toLowerCase()] = s; });

        let updated = 0;
        let skipped = 0;
        const newMarks = { ...marks };

        const dataRows = raw.slice(headerRowIdx + 1);
        dataRows.forEach(row => {
          const collegeId = String(row[colIdx.collegeId] || '').trim().toLowerCase();
          const student = idMap[collegeId];
          if (!student) { if (collegeId) skipped++; return; }
          const marksVal = row[colIdx.marks];
          if (marksVal === '' || marksVal === null || marksVal === undefined) return;
          const num = parseFloat(marksVal);
          if (!isNaN(num)) { newMarks[student.id] = num; updated++; }
        });

        setMarks(newMarks);
        showToast(`✓ Imported marks for ${updated} student${updated !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} unmatched rows skipped)` : ''}.`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Failed to read file. Make sure it is a valid .xlsx file.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const { data } = await marksAPI.myAssignments();
        setAssignments(data);
        
        // If preselected assignment is provided, load students and marks
        if (preselectedAssignment) {
          const matchingAssignment = data.find(a => a.id === preselectedAssignment.id);
          if (matchingAssignment) {
            setSelectedAssignment(matchingAssignment);
            // Load students and marks for this assignment
            await loadStudentsAndMarks(matchingAssignment, 'mid1');
          }
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedAssignment]);

  const loadStudentsAndMarks = async (assignment, exam) => {
    setLoading(true);
    try {
      const [studentsRes, entryRes] = await Promise.all([
        marksAPI.students(assignment.department, assignment.batch, assignment.section),
        marksAPI.getEntry(assignment.id, exam || examType)
      ]);
      setStudents(studentsRes.data);
      if (entryRes.data) {
        const savedMarks = {};
        (entryRes.data.entries || []).forEach(e => { savedMarks[e.student_id] = e.marks; });
        setMarks(savedMarks);
        setEntryId(entryRes.data.id);
        setStatus(entryRes.data.status);
        setMaxMarks(entryRes.data.max_marks || 30);
      } else {
        setMarks({});
        setEntryId(null);
        setStatus('new');
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleClassSelect = (a) => {
    setSelectedAssignment(a);
    setIsDirectNavigation(false); // Mark as manual selection
    loadStudentsAndMarks(a, examType);
  };

  const handleExamTypeChange = (type) => {
    setExamType(type);
    if (selectedAssignment) loadStudentsAndMarks(selectedAssignment, type);
  };

  const handleMarkChange = (studentId, value) => {
    const num = value === '' ? null : parseFloat(value);
    if (num !== null && (num < 0 || num > maxMarks)) return;
    setMarks({ ...marks, [studentId]: num });
  };

  const saveMarksData = async (isSubmit = false) => {
    if (!selectedAssignment) return null;
    if (!maxMarks || String(maxMarks).trim() === '') {
      showToast("Max marks cannot be empty", "error");
      return null;
    }
    
    const currentMax = parseFloat(maxMarks);
    if (isNaN(currentMax) || currentMax <= 0) {
      showToast("Max marks must be greater than 0", "error");
      return null;
    }
    
    setSaving(true);
    let newEntryId = entryId;
    try {
      const entries = students.map(s => ({
        student_id: s.id, college_id: s.college_id, student_name: s.name,
        marks: marks[s.id] ?? null
      }));
      const payload = {
        assignment_id: selectedAssignment.id, exam_type: examType,
        semester: selectedAssignment.semester, max_marks: currentMax, entries
      };
      
      if (isEditingApproved && revisionReason) {
        payload.revision_reason = revisionReason;
      }
      
      const { data } = await marksAPI.saveEntry(payload);
      newEntryId = data.id;
      setEntryId(newEntryId);
      setStatus(data.status || 'draft');
      
      if (!isSubmit) {
        showToast(isEditingApproved ? 'Revised marks saved as draft. Submit for re-approval.' : 'Marks saved as draft', 'success');
      }
    } catch (err) { 
      console.error('Save error:', err);
      showToast(err.response?.data?.detail || 'Save failed', 'error'); 
      newEntryId = null;
    }
    setSaving(false);
    return newEntryId;
  };

  const handleSave = async () => {
    await saveMarksData(false);
  };

  const handleInitiateSubmit = () => {
    const allStudentsGraded = students.every(s => marks[s.id] !== null && marks[s.id] !== undefined);
    if (!allStudentsGraded) {
      return showToast('Please fill marks for all students before submitting for approval.', 'error');
    }
    
    setConfirmDialog({
      title: "Submit for Approval?",
      message: "Are you sure you want to submit these marks to the HOD? You will not be able to edit them after submission.",
      onConfirm: async () => {
        setConfirmDialog(null);
        await performSubmit();
      }
    });
  };

  const performSubmit = async () => {
    const currentEntryId = await saveMarksData(true);
    if (!currentEntryId) return; 
    
    try {
      await marksAPI.submit(currentEntryId);
      setStatus('submitted');
      setIsEditingApproved(false);
      setRevisionReason('');
      showToast('Marks submitted for HOD approval', 'success');
    } catch (err) { showToast(err.response?.data?.detail || 'Submit failed', 'error'); }
  };

  const handleEnableEditApproved = () => {
    setPromptInput('');
    setPromptDialog({
      title: "Edit Approved Marks",
      message: "Please enter the reason for revising these approved marks:",
      onSubmit: (reason) => {
        if (!reason || reason.trim() === '') {
          showToast('Reason is required to edit approved marks', 'error');
          return;
        }
        setRevisionReason(reason.trim());
        setIsEditingApproved(true);
        setPromptDialog(null);
      }
    });
  };

  const isEditable = status === 'new' || status === 'draft' || status === 'rejected' || isEditingApproved;

  // Compute average marks and percentage
  const stats = useMemo(() => {
    const graded = students.filter(s => marks[s.id] !== null && marks[s.id] !== undefined);
    if (graded.length === 0) return { avgMarks: 0, avgPercent: 0, gradedCount: 0 };
    const total = graded.reduce((sum, s) => sum + (marks[s.id] || 0), 0);
    const avgMarks = total / graded.length;
    
    const parsedMax = parseFloat(maxMarks);
    const safeMax = isNaN(parsedMax) || parsedMax <= 0 ? 30 : parsedMax;
    const avgPercent = (avgMarks / safeMax) * 100;
    
    return { avgMarks: avgMarks.toFixed(1), avgPercent: avgPercent.toFixed(1), gradedCount: graded.length };
  }, [marks, students, maxMarks]);

  // Group assignments by class (batch-section)
  const classGroups = useMemo(() => {
    const map = {};
    assignments.forEach(a => {
      const key = `${a.batch}-${a.section}`;
      if (!map[key]) map[key] = { label: `Batch ${a.batch} Sec ${a.section}`, assignments: [] };
      map[key].assignments.push(a);
    });
    return Object.values(map);
  }, [assignments]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader
        navigate={navigate} user={user} title={selectedAssignment ? selectedAssignment.subject_name : 'Mid-term Marks Entry'}
        subtitle={selectedAssignment ? `${selectedAssignment.subject_code} | Batch ${selectedAssignment.batch} Sec ${selectedAssignment.section}` : 'Select a subject to enter marks'}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!selectedAssignment ? (
          <div data-testid="assignment-list">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">My Subject Assignments</h3>
            {classGroups.map((group, gi) => (
              <div key={gi} className="mb-6">
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">{group.label}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.assignments.map(a => (
                    <button key={a.id} data-testid={`assignment-${a.id}`} onClick={() => handleClassSelect(a)}
                      className="soft-card-hover p-6 text-left">
                      <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{a.subject_name}</p>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{a.subject_code}</p>
                      <p className="text-xs text-slate-400 mt-1">Semester {a.semester}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {assignments.length === 0 && (
              <div className="soft-card p-8 text-center">
                <p className="text-slate-400 font-medium">No subjects assigned. Contact your HOD.</p>
              </div>
            )}
          </div>
        ) : (
          <div data-testid="marks-entry-form">
            {/* Row 1: Mid-1/Mid-2 tabs */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.04] rounded-xl p-1.5" data-testid="exam-type-tabs">
                <button data-testid="tab-mid1" onClick={() => handleExamTypeChange('mid1')}
                  className={`pill-tab ${examType === 'mid1' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>Mid-term 1</button>
                <button data-testid="tab-mid2" onClick={() => handleExamTypeChange('mid2')}
                  className={`pill-tab ${examType === 'mid2' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>Mid-term 2</button>
              </div>
            </div>

            {/* Row 2: Class Buttons (left) + Max / Avg / % (right) */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-2" data-testid="class-buttons">
                {assignments.map(a => {
                  const isActive = selectedAssignment?.id === a.id;
                  return (
                    <button key={a.id} data-testid={`class-btn-${a.id}`} onClick={() => handleClassSelect(a)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        isActive ? 'bg-indigo-50 dark:bg-indigo-500/150 text-white shadow-md' : 'bg-white text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:bg-indigo-500/15'
                      }`}>
                      {a.subject_code} &bull; {a.batch}-{a.section}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 relative">
                  <label className="text-xs font-bold text-slate-400">Max:</label>
                  <input data-testid="max-marks-input" type="number" min="1" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)}
                    className={`soft-input !py-1.5 !px-3 w-20 text-sm transition-colors outline-none ${(!maxMarks || String(maxMarks).trim() === '') ? 'border-2 !border-red-400 !bg-red-50 focus:!border-red-500' : 'border border-transparent shadow-sm'}`} disabled={!isEditable} />
                  {(!maxMarks || String(maxMarks).trim() === '') && (
                    <span className="absolute -bottom-4 left-9 text-[10px] font-bold text-red-500 whitespace-nowrap" style={{animation: 'fadeIn 0.2s ease'}}>*Required</span>
                  )}
                </div>

                {/* ── Excel Import / Export ── */}
                {isEditable && students.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadTemplate}
                      title="Download Excel template with student list"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      <DownloadSimple size={14} weight="bold" />
                      Template
                    </button>
                    <button
                      onClick={() => importFileRef.current?.click()}
                      title="Import filled Excel template"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                    >
                      <UploadSimple size={14} weight="bold" />
                      Import Marks
                    </button>
                    <input
                      ref={importFileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportExcel}
                      className="hidden"
                    />
                  </div>
                )}

                {stats.gradedCount > 0 && (
                  <div className="flex items-center gap-3" data-testid="avg-stats">
                    <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/15 px-3 py-1.5 rounded-xl">
                      <ChartBar size={16} weight="duotone" className="text-indigo-500" />
                      <span className="text-sm font-bold text-indigo-700">Avg: {stats.avgMarks}/{maxMarks}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl">
                      <Percent size={16} weight="duotone" className="text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-700">{stats.avgPercent}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {status === 'rejected' && (
              <div className="mb-4 p-4 bg-red-50 rounded-2xl flex items-center gap-3">
                <Warning size={20} weight="duotone" className="text-red-500" />
                <p className="text-sm font-medium text-red-600">Marks were rejected by HOD. Please review and resubmit.</p>
              </div>
            )}

            {/* Marks Table */}
            <div className="soft-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest w-12">#</th>
                    <th className="text-left py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">College ID</th>
                    <th className="text-left py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Student Name</th>
                    <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest w-32">Marks / {maxMarks}</th>
                    <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest w-28">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const m = marks[s.id];
                    const pct = m !== null && m !== undefined && maxMarks > 0 ? ((m / maxMarks) * 100).toFixed(1) : null;
                    return (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-800/50/50 transition-colors h-14" data-testid={`student-row-${s.college_id}`}>
                        <td className="py-0 px-4 text-sm text-slate-400">{i + 1}</td>
                        <td className="py-0 px-4 font-medium text-slate-700 dark:text-slate-300">{s.college_id}</td>
                        <td className="py-0 px-4 font-medium text-slate-800 dark:text-slate-100">{s.name}</td>
                        <td className="py-0 px-4 text-center">
                          {isEditable ? (
                            <input data-testid={`marks-input-${s.college_id}`} type="number" min="0" max={parseFloat(maxMarks) || 100} step="0.5"
                              value={m ?? ''} onChange={(e) => handleMarkChange(s.id, e.target.value)}
                              className="soft-input !py-1.5 !px-3 w-24 h-9 text-center text-sm font-bold mx-auto" placeholder="-" />
                          ) : (
                            <span className="inline-flex items-center justify-center w-24 h-9 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm font-bold text-slate-900 mx-auto">{m ?? '-'}</span>
                          )}
                        </td>
                        <td className="py-0 px-4 text-center">
                          {pct !== null ? (
                            <span className={`text-sm font-bold ${parseFloat(pct) >= 60 ? 'text-emerald-600' : parseFloat(pct) >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                              {pct}%
                            </span>
                          ) : (
                            <span className="text-sm text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {students.length === 0 && (
                <div className="p-8 text-center"><p className="text-slate-400 font-medium">{loading ? 'Loading...' : 'No students found for this class'}</p></div>
              )}
            </div>

            {/* Actions */}
            {isEditable && students.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {stats.gradedCount} / {students.length} students graded
                  {stats.gradedCount < students.length && (
                    <span className="text-amber-600 font-bold ml-2">
                      ⚠ Fill all students' marks to submit
                    </span>
                  )}
                  {isEditingApproved && revisionReason && (
                    <span className="text-purple-600 font-bold ml-2">
                      📝 Revision: {revisionReason}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <span className={`soft-badge ${
                    status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                    status === 'submitted' ? 'bg-amber-50 text-amber-600' :
                    status === 'rejected' ? 'bg-red-50 text-red-600' :
                    'bg-slate-100 text-slate-500 dark:text-slate-400'
                  }`}>
                    {status === 'new' ? 'Not Started' : isEditingApproved ? 'Editing Approved' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                  <button data-testid="save-marks-button" onClick={handleSave} disabled={saving} className="btn-ghost !py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
                    <FloppyDisk size={16} weight="duotone" /> {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button 
                    data-testid="submit-marks-button" 
                    onClick={handleInitiateSubmit} 
                    disabled={(!entryId && marks.length===0) || (status !== 'draft' && status !== 'new' && !isEditingApproved) || stats.gradedCount < students.length || saving} 
                    className="btn-primary !py-2.5 text-sm flex items-center gap-2 disabled:opacity-60"
                    title={stats.gradedCount < students.length ? 'Fill marks for all students before submitting' : ''}
                  >
                    <PaperPlaneTilt size={16} weight="duotone" /> {isEditingApproved ? 'Re-submit for Approval' : 'Submit for Approval'}
                  </button>
                </div>
              </div>
            )}

            {status === 'submitted' && !isEditingApproved && (
              <div className="mt-6 p-4 bg-amber-50 rounded-2xl flex items-center gap-3">
                <Clock size={20} weight="duotone" className="text-amber-500" />
                <p className="text-sm font-medium text-amber-700">Marks submitted. Waiting for HOD approval.</p>
              </div>
            )}
            {status === 'approved' && !isEditingApproved && (
              <div className="mt-6 p-4 bg-emerald-50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} weight="duotone" className="text-emerald-500" />
                  <p className="text-sm font-medium text-emerald-700">Marks approved by HOD. These will reflect in final results.</p>
                </div>
                <button 
                  onClick={handleEnableEditApproved}
                  className="btn-secondary !py-2 !px-4 text-sm flex items-center gap-2"
                >
                  <PencilLine size={16} weight="duotone" /> Edit Approved Marks
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 transform translate-y-0
          ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-l-4 border-red-500' : 
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500' : 
            'bg-slate-800 text-white'}`}
          style={{animation: 'fadeInUp 0.3s ease'}}
        >
          {toast.type === 'error' && <WarningCircle size={24} weight="fill" className="text-red-500" />}
          {toast.type === 'success' && <CheckCircle size={24} weight="fill" className="text-emerald-500" />}
          <p className="text-sm font-bold tracking-wide">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 transition-opacity"><X size={16} weight="bold" /></button>
        </div>
      )}

      {/* Confirm Dialog UI */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" style={{animation: 'fadeIn 0.2s ease'}}>
           <div className="bg-white rounded-2xl dark:bg-[#1A202C] p-6 sm:p-8 w-full max-w-sm shadow-2xl" style={{animation: 'scaleIn 0.2s ease'}}>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">{confirmDialog.title}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">{confirmDialog.message}</p>
              <div className="flex gap-3 justify-end">
                 <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 transition-colors">Cancel</button>
                 <button onClick={confirmDialog.onConfirm} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-indigo-50 dark:bg-indigo-500/150 hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-200">Yes, Submit</button>
              </div>
           </div>
        </div>
      )}

      {/* Prompt Dialog UI */}
      {promptDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" style={{animation: 'fadeIn 0.2s ease'}}>
           <div className="bg-white rounded-2xl dark:bg-[#1A202C] p-6 sm:p-8 w-full max-w-md shadow-2xl" style={{animation: 'scaleIn 0.2s ease'}}>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">{promptDialog.title}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">{promptDialog.message}</p>
              <textarea 
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                autoFocus
                className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none mb-6"
                placeholder="Type your reason here..."
              />
              <div className="flex gap-3 justify-end">
                 <button onClick={() => setPromptDialog(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 transition-colors">Cancel</button>
                 <button onClick={() => promptDialog.onSubmit(promptInput)} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-indigo-50 dark:bg-indigo-500/150 hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-200">Confirm Edit</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default MarksEntry;
