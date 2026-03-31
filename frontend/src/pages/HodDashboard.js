import React, { useState, useEffect } from 'react';
import { BookOpen, Users, ClipboardText, CheckCircle, Clock, SignOut, Plus, Trash, UserPlus, ChartLine, Eye, GraduationCap, X } from '@phosphor-icons/react';
import { facultyAPI, examCellAPI, marksAPI } from '../services/api';
import { StudentResultsSearch } from '../components/StudentResultsSearch';

const HodDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsTab, setAnalyticsTab] = useState('quiz');
  const [dashboard, setDashboard] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ teacher_id: '', subject_code: '', subject_name: '', department: user?.department || 'DS', batch: '2022', section: 'A', semester: 3 });
  
  // Mock subjects data (prepopulated)
  const mockSubjects = [
    // DS Department subjects (matching seed data)
    { code: '22PC0DS17', name: 'Automata Theory and Compiler Design', department: 'DS', semester: 3 },
    { code: '22PC0DS18', name: 'Machine Learning', department: 'DS', semester: 3 },
    { code: '22PC0DS19', name: 'Big Data Analytics', department: 'DS', semester: 3 },
    { code: '22PE0DS3A', name: 'Software Testing Methodologies', department: 'DS', semester: 3 },
    { code: '22PC0DS20', name: 'Machine Learning Lab', department: 'DS', semester: 3 },
    { code: '22PC0DS21', name: 'Big Data Analytics Lab', department: 'DS', semester: 3 },
    { code: '22DS0201', name: 'Data Structures and Algorithms', department: 'DS', semester: 2 },
    { code: '22DS0401', name: 'Deep Learning', department: 'DS', semester: 4 },
    { code: '22DS0402', name: 'Natural Language Processing', department: 'DS', semester: 4 },
    { code: '22DS0501', name: 'Computer Vision', department: 'DS', semester: 5 },
    // CSE Department
    { code: '22CSE201', name: 'Operating Systems', department: 'CSE', semester: 2 },
    { code: '22CSE301', name: 'Computer Networks', department: 'CSE', semester: 3 },
    { code: '22CSE401', name: 'Software Engineering', department: 'CSE', semester: 4 },
    { code: '22CSE302', name: 'Database Management Systems', department: 'CSE', semester: 3 },
    // ECE Department
    { code: '22ECE201', name: 'Digital Electronics', department: 'ECE', semester: 2 },
    { code: '22ECE301', name: 'Signals and Systems', department: 'ECE', semester: 3 },
    { code: '22ECE401', name: 'VLSI Design', department: 'ECE', semester: 4 },
  ];
  
  // Filter subjects by department
  const departmentSubjects = mockSubjects.filter(s => s.department === (user?.department || 'DS'));
  
  const [subjectSearch, setSubjectSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const { data } = await examCellAPI.hodDashboard();
        setDashboard(data);
      }
      if (activeTab === 'faculty' || activeTab === 'overview') {
        const [a, t] = await Promise.all([facultyAPI.assignments(), facultyAPI.teachers()]);
        setAssignments(a.data);
        setTeachers(t.data);
      }
      if (activeTab === 'review') {
        const { data } = await marksAPI.submissions();
        setSubmissions(data);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  
  const handleSubjectSelect = (subject) => {
    setNewAssignment({ ...newAssignment, subject_code: subject.code, subject_name: subject.name, semester: subject.semester });
    setSubjectSearch(subject.code);
    setShowSubjectDropdown(false);
  };
  
  const handleTeacherSelect = (teacher) => {
    setNewAssignment({ ...newAssignment, teacher_id: teacher.id });
    setTeacherSearch(teacher.name);
    setShowTeacherDropdown(false);
  };
  
  const handleClearSubject = () => {
    setSubjectSearch('');
    setNewAssignment({ ...newAssignment, subject_code: '', subject_name: '', semester: 3 });
  };
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-dropdown-container]')) {
        setShowSubjectDropdown(false);
        setShowTeacherDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const filteredSubjects = departmentSubjects.filter(s => 
    s.code.toLowerCase().includes(subjectSearch.toLowerCase()) || 
    s.name.toLowerCase().includes(subjectSearch.toLowerCase())
  );
  
  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || 
    t.college_id.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const handleAddAssignment = async () => {
    try {
      await facultyAPI.createAssignment(newAssignment);
      setShowAddForm(false);
      setNewAssignment({ ...newAssignment, teacher_id: '', subject_code: '', subject_name: '' });
      fetchData();
    } catch (err) { alert(err.response?.data?.detail || 'Failed to create assignment'); }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Remove this assignment?')) return;
    try { await facultyAPI.deleteAssignment(id); fetchData(); } catch {}
  };

  const handleReview = async (entryId, action) => {
    const remarks = action === 'reject' ? prompt('Enter rejection remarks:') || '' : '';
    try {
      await marksAPI.review(entryId, { action, remarks });
      fetchData();
    } catch (err) { alert(err.response?.data?.detail || 'Review failed'); }
  };


  const stats = dashboard ? [
    { label: 'Teachers', value: dashboard.total_teachers, icon: Users, color: 'bg-indigo-50 text-indigo-500', onClick: () => setActiveTab('teachers') },
    { label: 'Students', value: dashboard.total_students, icon: BookOpen, color: 'bg-emerald-50 text-emerald-500', onClick: () => setActiveTab('results') },
    { label: 'Analytics', value: '2', icon: ChartLine, color: 'bg-purple-50 text-purple-500', onClick: () => setActiveTab('analytics') },
    { label: 'Pending Reviews', value: dashboard.pending_reviews, icon: Clock, color: 'bg-rose-50 text-rose-500', onClick: () => setActiveTab('review') },
  ] : [];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center">
              <BookOpen size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">QuizPortal</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Head of Department</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="btn-ghost !px-4 !py-2 text-sm">{user?.name}</span>
            <button data-testid="logout-button" onClick={onLogout} className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors">
              <SignOut size={20} weight="duotone" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-2">Welcome, {user?.name}!</h2>
        <p className="text-base font-medium text-slate-500 mb-8">
          {user?.designation || 'Head of Department'}
        </p>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5 w-fit mb-8" data-testid="hod-tabs">
          {[{ id: 'overview', label: 'Overview' }, { id: 'marks-entry', label: 'Marks Entry' }, { id: 'faculty', label: 'Faculty Management' }, { id: 'review', label: 'Mark Reviews' }, { id: 'results', label: 'Student Management' }].map(tab => (
            <button key={tab.id} data-testid={`tab-${tab.id}`} onClick={() => setActiveTab(tab.id)}
              className={`pill-tab ${activeTab === tab.id ? 'pill-tab-active' : 'pill-tab-inactive'}`}>{tab.label}</button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div data-testid="overview-content">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, i) => (
                <button
                  key={i}
                  onClick={stat.onClick}
                  className="soft-card-hover p-6 text-left transition-all duration-200 active:scale-95 cursor-pointer"
                  data-testid={`stat-${stat.label.toLowerCase()}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
                    <div className={`${stat.color} p-2 rounded-xl`}><stat.icon size={18} weight="duotone" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900">{stat.value}</p>
                  <p className="text-xs font-medium text-slate-400 mt-2">Click to view details →</p>
                </button>
              ))}
            </div>

            {/* Pending Reviews */}
            {dashboard?.recent_submissions?.length > 0 && (
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Recent Submissions</h3>
                <div className="space-y-3">
                  {dashboard.recent_submissions.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-800">{s.teacher_name} - {s.subject_name}</p>
                        <p className="text-sm text-slate-500">{s.exam_type?.toUpperCase()} | {s.batch} {s.section} | {s.entries?.length} students</p>
                      </div>
                      <button onClick={() => setActiveTab('review')} className="btn-primary !px-4 !py-2 text-sm">Review</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Marks Entry */}
        {activeTab === 'marks-entry' && (
          <div data-testid="marks-entry-content">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">My Marks Entry</h3>
                <p className="text-sm text-slate-500">Enter marks for your assigned subjects</p>
              </div>
            </div>

            {/* My Assignments */}
            <div className="mb-6">
              <h4 className="text-lg font-bold text-slate-700 mb-4">My Assigned Subjects</h4>
              {assignments.filter(a => a.teacher_id === user?.id).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments.filter(a => a.teacher_id === user?.id).map(assignment => (
                    <div key={assignment.id} className="soft-card p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="font-bold text-slate-900 text-lg">{assignment.subject_code}</h5>
                          <p className="text-sm text-slate-600 mb-2">{assignment.subject_name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="soft-badge bg-indigo-50 text-indigo-600">{assignment.section}</span>
                            <span className="soft-badge bg-purple-50 text-purple-600">Batch {assignment.batch}</span>
                            <span className="soft-badge bg-teal-50 text-teal-600">Sem {assignment.semester}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <button 
                          onClick={() => navigate('marks-entry', assignment)}
                          className="btn-primary w-full !py-2 text-sm"
                        >
                          Enter Marks (Mid-1 / Mid-2)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="soft-card p-12 text-center">
                  <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardText size={40} weight="duotone" className="text-slate-400" />
                  </div>
                  <h5 className="text-lg font-bold text-slate-700 mb-2">No Subjects Assigned</h5>
                  <p className="text-sm text-slate-500">No subjects are assigned for the current semester.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Faculty Management */}
        {activeTab === 'faculty' && (
          <div data-testid="faculty-content">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800">Faculty Assignments</h3>
              <button data-testid="add-assignment-button" onClick={() => setShowAddForm(!showAddForm)} className="btn-primary !px-4 !py-2.5 text-sm flex items-center gap-2">
                <UserPlus size={18} weight="duotone" /> Add Assignment
              </button>
            </div>

            {showAddForm && (
              <div className="soft-card p-6 mb-6" data-testid="add-assignment-form">
                <h4 className="text-lg font-bold text-slate-800 mb-4">New Faculty Assignment</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Teacher Dropdown with Search */}
                  <div className="relative" data-dropdown-container>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Teacher</label>
                    <input 
                      data-testid="teacher-search-input" 
                      type="text"
                      value={teacherSearch} 
                      onFocus={() => setShowTeacherDropdown(true)}
                      onChange={(e) => {
                        setTeacherSearch(e.target.value);
                        setShowTeacherDropdown(true);
                      }}
                      placeholder="Search teacher..."
                      className="soft-input w-full"
                    />
                    {showTeacherDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-100 max-h-60 overflow-y-auto">
                        {filteredTeachers.length > 0 ? (
                          filteredTeachers.map(t => (
                            <button
                              key={t.id}
                              onClick={() => handleTeacherSelect(t)}
                              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0"
                              type="button"
                            >
                              <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                              <p className="text-xs text-slate-500">{t.college_id} - {t.department}</p>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-slate-400">No teachers found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Subject Code Dropdown with Search */}
                  <div className="relative" data-dropdown-container>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Subject Code</label>
                    <div className="relative">
                      <input 
                        data-testid="subject-code-search" 
                        type="text"
                        value={subjectSearch} 
                        onFocus={() => setShowSubjectDropdown(true)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSubjectSearch(value);
                          setShowSubjectDropdown(true);
                          // Clear subject name if input is cleared
                          if (!value) {
                            setNewAssignment({ ...newAssignment, subject_code: '', subject_name: '', semester: 3 });
                          }
                        }}
                        placeholder="Search subject code..."
                        className="soft-input w-full pr-10"
                      />
                      {subjectSearch && (
                        <button
                          onClick={handleClearSubject}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 transition-colors"
                          type="button"
                        >
                          <X size={16} weight="bold" className="text-slate-400" />
                        </button>
                      )}
                    </div>
                    {showSubjectDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-100 max-h-60 overflow-y-auto">
                        {filteredSubjects.length > 0 ? (
                          filteredSubjects.map(s => (
                            <button
                              key={s.code}
                              onClick={() => handleSubjectSelect(s)}
                              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0"
                              type="button"
                            >
                              <p className="font-bold text-slate-800 text-sm">{s.code}</p>
                              <p className="text-xs text-slate-500">{s.name} - Sem {s.semester}</p>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-slate-400">No subjects found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Subject Name (Read-only, auto-populated) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Subject Name</label>
                    <input 
                      data-testid="subject-name-display" 
                      value={newAssignment.subject_name} 
                      readOnly
                      placeholder="Auto-filled from code"
                      className="soft-input w-full bg-slate-50 cursor-not-allowed text-slate-600" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {/* Department (Read-only for HOD) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Department</label>
                    <input 
                      value={newAssignment.department} 
                      readOnly
                      className="soft-input w-full bg-slate-50 cursor-not-allowed text-slate-600" 
                    />
                  </div>

                  {/* Batch Dropdown */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Batch</label>
                    <select 
                      data-testid="batch-select"
                      value={newAssignment.batch} 
                      onChange={(e) => setNewAssignment({ ...newAssignment, batch: e.target.value })} 
                      className="soft-input w-full"
                    >
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                      <option value="2021">2021</option>
                    </select>
                  </div>

                  {/* Section Dropdown */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Section</label>
                    <select 
                      data-testid="section-select"
                      value={newAssignment.section} 
                      onChange={(e) => setNewAssignment({ ...newAssignment, section: e.target.value })} 
                      className="soft-input w-full"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="DS-1">DS-1</option>
                      <option value="DS-2">DS-2</option>
                      <option value="CS">CS (Cyber Security)</option>
                      <option value="AIML-1">AIML-1</option>
                      <option value="AIML-2">AIML-2</option>
                      <option value="AIML-3">AIML-3</option>
                      <option value="IT-1">IT-1</option>
                      <option value="IT-2">IT-2</option>
                    </select>
                  </div>

                  {/* Semester (Auto-filled from subject) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Semester</label>
                    <input 
                      type="number" 
                      value={newAssignment.semester} 
                      readOnly
                      className="soft-input w-full bg-slate-50 cursor-not-allowed text-slate-600" 
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    data-testid="save-assignment-button" 
                    onClick={handleAddAssignment} 
                    className="btn-primary !py-2.5 text-sm"
                    disabled={!newAssignment.teacher_id || !newAssignment.subject_code}
                  >
                    Save Assignment
                  </button>
                  <button 
                    onClick={() => {
                      setShowAddForm(false);
                      setSubjectSearch('');
                      setTeacherSearch('');
                    }} 
                    className="btn-ghost !py-2.5 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {assignments.map(a => (
                <div key={a.id} className="soft-card p-5 flex items-center justify-between" data-testid={`assignment-${a.id}`}>
                  <div>
                    <p className="font-bold text-slate-800">{a.teacher_name}</p>
                    <p className="text-sm font-medium text-slate-500">{a.subject_code} - {a.subject_name}</p>
                    <p className="text-xs text-slate-400">Batch {a.batch} | Section {a.section} | Sem {a.semester}</p>
                  </div>
                  <button onClick={() => handleDeleteAssignment(a.id)} className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                    <Trash size={18} weight="duotone" />
                  </button>
                </div>
              ))}
              {assignments.length === 0 && <div className="soft-card p-8 text-center"><p className="text-slate-400 font-medium">No faculty assignments yet</p></div>}
            </div>
          </div>
        )}

        {/* Mark Reviews */}
        {activeTab === 'review' && (
          <div data-testid="review-content">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">Mark Submissions</h3>
            <div className="space-y-4">
              {submissions.map(s => (
                <div key={s.id} className="soft-card p-6" data-testid={`submission-${s.id}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-bold text-lg text-slate-800">{s.subject_name} ({s.subject_code})</p>
                      <p className="text-sm font-medium text-slate-500">By: {s.teacher_name} | {s.exam_type?.toUpperCase()} | Batch {s.batch} Sec {s.section}</p>
                      <p className="text-xs text-slate-400">{s.entries?.length} students | Max: {s.max_marks} marks</p>
                    </div>
                    <span className={`soft-badge ${s.status === 'submitted' ? 'bg-amber-50 text-amber-600' : s.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {s.status}
                    </span>
                  </div>
                  {s.entries && s.entries.length > 0 && (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest w-12">#</th>
                            <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">College ID</th>
                            <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Student Name</th>
                            <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest w-32">Marks / {s.max_marks}</th>
                            <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest w-28">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.entries.map((e, i) => {
                            const marks = e.marks ?? null;
                            const pct = marks !== null && s.max_marks > 0 ? ((marks / s.max_marks) * 100).toFixed(1) : null;
                            return (
                              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 text-sm text-slate-400">{i + 1}</td>
                                <td className="py-3 px-4 font-medium text-slate-700">{e.college_id}</td>
                                <td className="py-3 px-4 font-medium text-slate-800">{e.student_name}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="font-bold text-slate-900">{marks ?? '-'}</span>
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
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <p className="text-sm font-bold text-slate-600">Total Students: <span className="text-slate-900">{s.entries.length}</span></p>
                          <p className="text-sm font-bold text-slate-600">Avg Marks: <span className="text-slate-900">
                            {s.entries.filter(e => e.marks !== null).length > 0 
                              ? (s.entries.reduce((sum, e) => sum + (e.marks ?? 0), 0) / s.entries.filter(e => e.marks !== null).length).toFixed(1)
                              : '-'}
                          </span></p>
                        </div>
                      </div>
                    </div>
                  )}
                  {s.status === 'submitted' && (
                    <div className="flex gap-3">
                      <button data-testid={`approve-${s.id}`} onClick={() => handleReview(s.id, 'approve')} className="btn-primary !py-2 text-sm flex items-center gap-2">
                        <CheckCircle size={16} weight="duotone" /> Approve
                      </button>
                      <button data-testid={`reject-${s.id}`} onClick={() => handleReview(s.id, 'reject')} className="btn-ghost !py-2 text-sm text-red-600">Reject</button>
                    </div>
                  )}
                  {s.review_remarks && <p className="text-sm text-slate-500 mt-2">Remarks: {s.review_remarks}</p>}
                </div>
              ))}
              {submissions.length === 0 && <div className="soft-card p-8 text-center"><p className="text-slate-400 font-medium">No submissions to review</p></div>}
            </div>
          </div>
        )}

        {/* Teachers Page */}
        {activeTab === 'teachers' && (
          <div data-testid="teachers-content">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Teachers List</h3>
                <p className="text-sm text-slate-500">Manage teachers in {user?.department || 'DS'} department</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teachers.length > 0 ? (
                teachers.map(teacher => (
                  <div key={teacher.id} className="soft-card p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-50 text-indigo-600 w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl">
                        {teacher.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-lg">{teacher.name}</p>
                        <p className="text-sm text-slate-500">{teacher.college_id} • {teacher.email}</p>
                        <p className="text-xs text-slate-400 mt-1">{teacher.department} Department • {teacher.college}</p>
                      </div>
                    </div>
                    <span className="soft-badge bg-emerald-50 text-emerald-600">Active</span>
                  </div>
                ))
              ) : (
                <div className="col-span-2 soft-card p-12 text-center">
                  <p className="text-slate-400 font-medium">No teachers found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Page */}
        {activeTab === 'analytics' && (
          <div data-testid="analytics-content">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Department Analytics</h3>
                <p className="text-sm text-slate-500">Performance insights for {user?.department || 'DS'} department</p>
              </div>
            </div>

            {/* Analytics Tabs */}
            <div className="mb-6">
              <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5 w-fit">
                <button 
                  onClick={() => setAnalyticsTab('quiz')} 
                  className={`pill-tab ${analyticsTab === 'quiz' ? 'pill-tab-active' : 'pill-tab-inactive'}`}
                >
                  Quiz Analytics
                </button>
                <button 
                  onClick={() => setAnalyticsTab('semester')} 
                  className={`pill-tab ${analyticsTab === 'semester' ? 'pill-tab-active' : 'pill-tab-inactive'}`}
                >
                  Semester Analytics
                </button>
              </div>
            </div>

            {/* Quiz Analytics */}
            {analyticsTab === 'quiz' && (
              <div className="space-y-6">
                <div className="soft-card p-6">
                  <h4 className="text-xl font-bold text-slate-800 mb-4">Department Quiz Performance</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-indigo-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-1">Avg Score</p>
                      <p className="text-3xl font-extrabold text-indigo-700">78.5%</p>
                    </div>
                    <div className="bg-teal-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-1">Total Attempts</p>
                      <p className="text-3xl font-extrabold text-teal-700">1,248</p>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">Completion Rate</p>
                      <p className="text-3xl font-extrabold text-amber-700">94%</p>
                    </div>
                  </div>
                  
                  <h5 className="text-lg font-bold text-slate-700 mb-3">Section-wise Performance</h5>
                  <div className="space-y-3">
                    {['DS-1', 'DS-2', 'CS', 'AIML-1', 'AIML-2', 'AIML-3', 'IT-1', 'IT-2'].map(section => {
                      const score = 75 + Math.floor(Math.random() * 15);
                      return (
                        <div key={section} className="flex items-center gap-4">
                          <span className="soft-badge bg-indigo-50 text-indigo-600 !w-24">{section}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-slate-600">Avg Score</span>
                              <span className="text-sm font-bold text-slate-800">{score}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full"
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Semester Analytics */}
            {analyticsTab === 'semester' && (
              <div className="space-y-6">
                <div className="soft-card p-6">
                  <h4 className="text-xl font-bold text-slate-800 mb-4">Department Semester Performance</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-purple-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-1">Avg SGPA</p>
                      <p className="text-3xl font-extrabold text-purple-700">8.2</p>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">Pass Rate</p>
                      <p className="text-3xl font-extrabold text-emerald-700">96%</p>
                    </div>
                    <div className="bg-blue-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">First Class</p>
                      <p className="text-3xl font-extrabold text-blue-700">78%</p>
                    </div>
                    <div className="bg-rose-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-1">Distinction</p>
                      <p className="text-3xl font-extrabold text-rose-700">45%</p>
                    </div>
                  </div>

                  <h5 className="text-lg font-bold text-slate-700 mb-3">Section-wise Semester Results</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Section</th>
                          <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Students</th>
                          <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Avg SGPA</th>
                          <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Pass %</th>
                          <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">First Class %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['DS-1', 'DS-2', 'CS', 'AIML-1', 'AIML-2', 'AIML-3', 'IT-1', 'IT-2'].map(section => {
                          const avgSgpa = (7.5 + Math.random() * 1.5).toFixed(2);
                          const passRate = 92 + Math.floor(Math.random() * 8);
                          const firstClass = 70 + Math.floor(Math.random() * 20);
                          return (
                            <tr key={section} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4">
                                <span className="soft-badge bg-indigo-50 text-indigo-600">{section}</span>
                              </td>
                              <td className="text-center py-3 px-4 font-medium text-slate-700">{section === 'DS-1' ? 10 : 8}</td>
                              <td className="text-center py-3 px-4 font-bold text-slate-800">{avgSgpa}</td>
                              <td className="text-center py-3 px-4">
                                <span className={`soft-badge ${passRate >= 95 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {passRate}%
                                </span>
                              </td>
                              <td className="text-center py-3 px-4">
                                <span className="soft-badge bg-blue-50 text-blue-600">{firstClass}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div data-testid="results-content">
            <StudentResultsSearch user={user} departmentLocked={true} />
          </div>
        )}
      </div>
    </div>
  );
};

export default HodDashboard;
