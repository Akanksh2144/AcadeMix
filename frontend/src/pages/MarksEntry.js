import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, PaperPlaneTilt, FloppyDisk, CheckCircle, Clock, Warning, Percent, ChartBar, PencilLine } from '@phosphor-icons/react';
import { marksAPI } from '../services/api';

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

  const handleSave = async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    try {
      const entries = students.map(s => ({
        student_id: s.id, college_id: s.college_id, student_name: s.name,
        marks: marks[s.id] ?? null
      }));
      const payload = {
        assignment_id: selectedAssignment.id, exam_type: examType,
        semester: selectedAssignment.semester, max_marks: maxMarks, entries
      };
      
      // If editing approved marks, include revision reason
      if (isEditingApproved && revisionReason) {
        payload.revision_reason = revisionReason;
      }
      
      const { data } = await marksAPI.saveEntry(payload);
      
      // Update state with response from backend
      setEntryId(data.id);
      setStatus(data.status || 'draft'); // Use status from backend response
      
      if (isEditingApproved) {
        alert('Revised marks saved as draft. Submit for re-approval.');
      } else {
        alert('Marks saved as draft');
      }
    } catch (err) { 
      console.error('Save error:', err);
      alert(err.response?.data?.detail || 'Save failed'); 
    }
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (!entryId) return alert('Save marks first');
    
    // Check if all students have marks filled
    const allStudentsGraded = students.every(s => marks[s.id] !== null && marks[s.id] !== undefined);
    if (!allStudentsGraded) {
      return alert('Please fill marks for all students before submitting for approval.');
    }
    
    if (!window.confirm('Submit marks for HOD approval? You cannot edit after submission.')) return;
    try {
      await marksAPI.submit(entryId);
      setStatus('submitted');
      setIsEditingApproved(false);
      setRevisionReason('');
      alert('Marks submitted for HOD approval');
    } catch (err) { alert(err.response?.data?.detail || 'Submit failed'); }
  };

  const handleEnableEditApproved = () => {
    const reason = prompt('Enter reason for editing approved marks:');
    if (!reason || reason.trim() === '') {
      alert('Reason is required to edit approved marks');
      return;
    }
    setRevisionReason(reason.trim());
    setIsEditingApproved(true);
  };

  const isEditable = status === 'new' || status === 'draft' || status === 'rejected' || isEditingApproved;

  // Compute average marks and percentage
  const stats = useMemo(() => {
    const graded = students.filter(s => marks[s.id] !== null && marks[s.id] !== undefined);
    if (graded.length === 0) return { avgMarks: 0, avgPercent: 0, gradedCount: 0 };
    const total = graded.reduce((sum, s) => sum + (marks[s.id] || 0), 0);
    const avgMarks = total / graded.length;
    const avgPercent = maxMarks > 0 ? (avgMarks / maxMarks) * 100 : 0;
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
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button data-testid="back-button" onClick={() => {
            if (selectedAssignment && !isDirectNavigation) {
              // Only go to assignment list if user manually selected from list
              setSelectedAssignment(null);
            } else {
              // Go back to dashboard (for direct navigation or from assignment list)
              const dashboardRoute = user?.role === 'hod' ? 'hod-dashboard' : 'teacher-dashboard';
              navigate(dashboardRoute);
            }
          }}
            className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft size={22} weight="duotone" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {selectedAssignment ? selectedAssignment.subject_name : 'Mid-term Marks Entry'}
            </h1>
            <p className="text-sm font-medium text-slate-400">
              {selectedAssignment ? `${selectedAssignment.subject_code} | Batch ${selectedAssignment.batch} Sec ${selectedAssignment.section}` : 'Select a subject to enter marks'}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!selectedAssignment ? (
          <div data-testid="assignment-list">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">My Subject Assignments</h3>
            {classGroups.map((group, gi) => (
              <div key={gi} className="mb-6">
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">{group.label}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.assignments.map(a => (
                    <button key={a.id} data-testid={`assignment-${a.id}`} onClick={() => handleClassSelect(a)}
                      className="soft-card-hover p-6 text-left">
                      <p className="font-bold text-lg text-slate-800">{a.subject_name}</p>
                      <p className="text-sm font-medium text-slate-500">{a.subject_code}</p>
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
              <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5" data-testid="exam-type-tabs">
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
                        isActive ? 'bg-indigo-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}>
                      {a.subject_code} &bull; {a.batch}-{a.section}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-400">Max:</label>
                  <input data-testid="max-marks-input" type="number" value={maxMarks} onChange={(e) => setMaxMarks(parseFloat(e.target.value) || 30)}
                    className="soft-input !py-1.5 !px-3 w-20 text-sm" disabled={!isEditable} />
                </div>
                {stats.gradedCount > 0 && (
                  <div className="flex items-center gap-3" data-testid="avg-stats">
                    <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl">
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
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest w-12">#</th>
                    <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">College ID</th>
                    <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Student Name</th>
                    <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest w-32">Marks / {maxMarks}</th>
                    <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest w-28">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const m = marks[s.id];
                    const pct = m !== null && m !== undefined && maxMarks > 0 ? ((m / maxMarks) * 100).toFixed(1) : null;
                    return (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`student-row-${s.college_id}`}>
                        <td className="py-3 px-4 text-sm text-slate-400">{i + 1}</td>
                        <td className="py-3 px-4 font-medium text-slate-700">{s.college_id}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{s.name}</td>
                        <td className="py-3 px-4 text-center">
                          {isEditable ? (
                            <input data-testid={`marks-input-${s.college_id}`} type="number" min="0" max={maxMarks} step="0.5"
                              value={m ?? ''} onChange={(e) => handleMarkChange(s.id, e.target.value)}
                              className="soft-input !py-1.5 !px-3 w-24 text-center text-sm font-bold mx-auto" placeholder="-" />
                          ) : (
                            <span className="font-bold text-slate-900">{m ?? '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
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
                <p className="text-sm text-slate-500">
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
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {status === 'new' ? 'Not Started' : isEditingApproved ? 'Editing Approved' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                  <button data-testid="save-marks-button" onClick={handleSave} disabled={saving} className="btn-ghost !py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
                    <FloppyDisk size={16} weight="duotone" /> {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button 
                    data-testid="submit-marks-button" 
                    onClick={handleSubmit} 
                    disabled={!entryId || (status !== 'draft' && !isEditingApproved) || stats.gradedCount < students.length} 
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
    </div>
  );
};

export default MarksEntry;
