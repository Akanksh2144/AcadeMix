import React, { useState, useEffect } from 'react';
import { ArrowLeft, MagnifyingGlass, GraduationCap, Trophy, BookOpen, ChartLine, Target, TrendUp, TrendDown } from '@phosphor-icons/react';
import { studentsAPI } from '../services/api';

const getGradeColor = (grade) => {
  if (!grade) return 'bg-slate-100 text-slate-600';
  if (grade === 'O' || grade.startsWith('A')) return 'bg-emerald-50 text-emerald-600';
  if (grade.startsWith('B')) return 'bg-amber-50 text-amber-600';
  return 'bg-rose-50 text-rose-600';
};

const SemesterTabView = ({ semesters }) => {
  const [selectedSem, setSelectedSem] = useState(semesters.length > 0 ? semesters[semesters.length - 1].semester : null);
  const currentSem = semesters.find(s => s.semester === selectedSem);
  const allSemNumbers = semesters.map(s => s.semester);

  return (
    <div className="mb-6" data-testid="semester-tab-view">
      <h4 className="text-xl font-bold text-slate-800 mb-4">Semester Results</h4>

      {/* Semester pill tabs */}
      <div className="mb-6">
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Select Semester</label>
        <div className="bg-slate-100 rounded-2xl p-1 inline-flex gap-1 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <button
              key={sem}
              data-testid={`profile-semester-${sem}-tab`}
              onClick={() => allSemNumbers.includes(sem) && setSelectedSem(sem)}
              disabled={!allSemNumbers.includes(sem)}
              className={`pill-tab ${selectedSem === sem ? 'pill-tab-active' : allSemNumbers.includes(sem) ? 'pill-tab-inactive' : 'text-slate-300 cursor-not-allowed'}`}
            >
              Sem {sem}
            </button>
          ))}
        </div>
      </div>

      {currentSem && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="soft-card p-5" data-testid="profile-sgpa-card">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">SGPA</span>
              <p className="text-3xl font-extrabold text-slate-900">{currentSem.sgpa?.toFixed(2) ?? '-'}</p>
            </div>
            <div className="soft-card p-5" data-testid="profile-cgpa-card">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">CGPA</span>
              <p className="text-3xl font-extrabold text-slate-900">{currentSem.cgpa?.toFixed(2) ?? '-'}</p>
            </div>
            <div className="soft-card p-5" data-testid="profile-subjects-count">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">Subjects</span>
              <p className="text-3xl font-extrabold text-slate-900">{currentSem.subjects?.length || 0}</p>
            </div>
            <div className="soft-card p-5" data-testid="profile-status-card">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">Status</span>
              <span className={`soft-badge text-base mt-1 ${currentSem.subjects?.every(s => s.status === 'PASS') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {currentSem.subjects?.every(s => s.status === 'PASS') ? 'All Pass' : 'Has Arrears'}
              </span>
            </div>
          </div>

          {/* Subject table + CGPA progression sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 soft-card p-6">
              <h5 className="text-lg font-bold text-slate-800 mb-4">Subject-wise Results</h5>
              {currentSem.subjects && currentSem.subjects.length > 0 ? (
                <table className="w-full text-sm" data-testid="profile-subjects-table">
                  <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.05]">
                      <th className="text-left p-3 text-xs font-bold uppercase tracking-widest text-slate-400">Subject</th>
                      <th className="text-center p-3 text-xs font-bold uppercase tracking-widest text-slate-400">Credits</th>
                      <th className="text-center p-3 text-xs font-bold uppercase tracking-widest text-slate-400">Grade</th>
                      <th className="text-center p-3 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSem.subjects.map((sub, j) => (
                      <tr key={j} className="border-b border-slate-50 dark:border-white/[0.05] hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors" data-testid={`profile-subject-row-${j}`}>
                        <td className="p-3">
                          <p className="font-bold text-slate-800">{sub.name}</p>
                          <p className="text-xs font-medium text-slate-400">{sub.code}</p>
                        </td>
                        <td className="text-center p-3 font-bold text-slate-700">{sub.credits}</td>
                        <td className="text-center p-3"><span className={`soft-badge ${getGradeColor(sub.grade)}`}>{sub.grade}</span></td>
                        <td className="text-center p-3">
                          <span className={`soft-badge ${sub.status === 'PASS' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{sub.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-slate-400 font-medium">No subject details available.</p>
              )}
            </div>

            <div className="space-y-6">
              {/* CGPA Progression */}
              <div className="soft-card p-6">
                <h5 className="text-lg font-bold text-slate-800 mb-4">CGPA Progression</h5>
                <div className="space-y-3">
                  {semesters.map((s, i) => (
                    <div key={s.semester} className={`flex items-center justify-between py-1 ${s.semester === selectedSem ? 'bg-indigo-50/60 -mx-2 px-2 rounded-lg' : ''}`} data-testid={`profile-cgpa-sem-${s.semester}`}>
                      <span className={`font-bold text-sm ${s.semester === selectedSem ? 'text-indigo-600' : 'text-slate-700'}`}>Sem {s.semester}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-slate-900">{s.cgpa?.toFixed(2)}</span>
                        {i > 0 && s.cgpa > semesters[i - 1].cgpa && <TrendUp size={14} weight="duotone" className="text-emerald-500" />}
                        {i > 0 && s.cgpa < semesters[i - 1].cgpa && <TrendDown size={14} weight="duotone" className="text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Summary */}
              <div className="soft-card p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <h5 className="text-lg font-bold mb-3">Performance Summary</h5>
                <div className="space-y-2 text-sm font-medium text-white/90">
                  <p>Total credits: {currentSem.subjects?.reduce((s, sub) => s + (sub.credits || 0), 0) || 0}</p>
                  <p>Grade O count: {currentSem.subjects?.filter(s => s.grade === 'O').length || 0}</p>
                  <p>All subjects: {currentSem.subjects?.every(s => s.status === 'PASS') ? 'Passed' : 'Has arrears'}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StudentProfileView = ({ studentId, onBack }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await studentsAPI.profile(studentId);
        setProfile(data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetch();
  }, [studentId]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!profile) return <div className="soft-card p-8 text-center"><p className="text-slate-400">Student not found</p></div>;

  const { student, semesters, quiz_attempts, mid_marks } = profile;
  const latestCgpa = semesters.length > 0 ? semesters[semesters.length - 1].cgpa : null;

  return (
    <div data-testid="student-profile-view">
      {/* Back + Header */}
      <button data-testid="profile-back-button" onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 mb-6 transition-colors">
        <ArrowLeft size={18} weight="duotone" /> Back to search
      </button>

      {/* Student Info Card */}
      <div className="soft-card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold">
              {student.name?.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900" data-testid="profile-student-name">{student.name}</h3>
              <p className="text-sm font-medium text-slate-500">{student.college_id} &bull; {student.department || '-'} &bull; Batch {student.batch || '-'} Sec {student.section || '-'}</p>
            </div>
          </div>
          {latestCgpa && (
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">CGPA</p>
              <p className="text-3xl font-extrabold text-indigo-600">{latestCgpa.toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="soft-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap size={16} weight="duotone" className="text-indigo-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Semesters</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{semesters.length}</p>
        </div>
        <div className="soft-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} weight="duotone" className="text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Latest SGPA</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{semesters.length > 0 ? semesters[semesters.length - 1].sgpa?.toFixed(2) : '-'}</p>
        </div>
        <div className="soft-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} weight="duotone" className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Quizzes</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{quiz_attempts.length}</p>
        </div>
        <div className="soft-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} weight="duotone" className="text-rose-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Mid-terms</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{mid_marks.length}</p>
        </div>
      </div>

      {/* Semester Results — Tab-based */}
      {semesters.length > 0 && (
        <SemesterTabView semesters={semesters} />
      )}

      {/* Mid-term Marks */}
      {mid_marks.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xl font-bold text-slate-800 mb-4">Mid-term Marks</h4>
          <div className="soft-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.05]">
                  <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Subject</th>
                  <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Exam</th>
                  <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Marks</th>
                  <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {mid_marks.map((m, i) => {
                  const pct = m.max_marks > 0 ? ((m.marks / m.max_marks) * 100).toFixed(1) : '-';
                  return (
                    <tr key={i} className="border-b border-slate-50 dark:border-white/[0.05]">
                      <td className="py-2.5 px-4 font-medium text-slate-800">{m.subject_name} ({m.subject_code})</td>
                      <td className="py-2.5 px-4 text-center"><span className="soft-badge bg-slate-100 text-slate-600">{m.exam_type?.toUpperCase()}</span></td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-900">{m.marks ?? '-'} / {m.max_marks}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`text-sm font-bold ${parseFloat(pct) >= 60 ? 'text-emerald-600' : parseFloat(pct) >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quiz Attempts */}
      {quiz_attempts.length > 0 && (
        <div>
          <h4 className="text-xl font-bold text-slate-800 mb-4">Recent Quiz Attempts</h4>
          <div className="soft-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.05]">
                  <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Quiz</th>
                  <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Score</th>
                  <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {quiz_attempts.map((a, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-white/[0.05]">
                    <td className="py-2.5 px-4 font-medium text-slate-800">{a.quiz_title}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900">{a.score} / {a.total}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`text-sm font-bold ${a.percentage >= 60 ? 'text-emerald-600' : a.percentage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {a.percentage?.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {semesters.length === 0 && mid_marks.length === 0 && quiz_attempts.length === 0 && (
        <div className="soft-card p-8 text-center">
          <p className="text-slate-400 font-medium">No academic records found for this student.</p>
        </div>
      )}
    </div>
  );
};

const StudentResultsSearch = ({ user, departmentLocked }) => {
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeSection, setActiveSection] = useState('All');
  const [activeDepartment, setActiveDepartment] = useState('All');
  
  // Dynamically compute available departments and sections from the loaded student data
  const availableDepartments = ['All', ...Array.from(new Set(allStudents.map(s => s.department))).filter(Boolean).sort()];
  
  // Only show sections relevant to the currently selected department (if not 'All')
  const studentsForSectionFilter = activeDepartment === 'All' ? allStudents : allStudents.filter(s => s.department === activeDepartment);
  const availableSections = ['All', ...Array.from(new Set(studentsForSectionFilter.map(s => s.section))).filter(Boolean).sort()];

  useEffect(() => {
    // Load all students initially
    const init = async () => {
      setLoading(true);
      try {
        const { data } = await studentsAPI.search('', departmentLocked ? undefined : undefined);
        setAllStudents(data);
        setStudents(data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (value) => {
    setSearch(value);
    filterStudents(value, activeDepartment, activeSection);
  };
  
  const handleDepartmentChange = (dept) => {
    setActiveDepartment(dept);
    setActiveSection('All'); // Reset section when changing department
    filterStudents(search, dept, 'All');
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    filterStudents(search, activeDepartment, section);
  };
  
  const filterStudents = (searchValue, dept, section) => {
    let filtered = allStudents;
    
    // Filter by department
    if (dept !== 'All') {
      filtered = filtered.filter(s => s.department === dept);
    }
    
    // Filter by section
    if (section !== 'All') {
      filtered = filtered.filter(s => s.section === section);
    }
    
    // Filter by search
    if (searchValue) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        s.college_id.toLowerCase().includes(searchValue.toLowerCase())
      );
    }
    
    setStudents(filtered);
  };

  if (selectedStudent) {
    return <StudentProfileView studentId={selectedStudent} onBack={() => setSelectedStudent(null)} />;
  }

  return (
    <div data-testid="student-results-search">
      <h3 className="text-2xl font-bold text-slate-800 mb-2">Student Management</h3>
      <p className="text-sm text-slate-500 mb-6">
        {departmentLocked ? `Manage students in ${user?.department || 'your'} department` : 'Search across all departments'}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-6">
        {/* Dynamic Department Tabs */}
        {availableDepartments.length > 2 && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Department</label>
            <div className="flex flex-wrap gap-2">
              {availableDepartments.map(dept => (
                <button
                  key={dept}
                  onClick={() => handleDepartmentChange(dept)}
                  className={`pill-tab ${activeDepartment === dept ? 'pill-tab-active' : 'pill-tab-inactive'}`}
                  data-testid={`dept-tab-${dept.toLowerCase()}`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Section Tabs */}
        {availableSections.length > 1 && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Section</label>
            <div className="flex flex-wrap gap-2">
              {availableSections.map(section => (
                <button
                  key={section}
                  onClick={() => handleSectionChange(section)}
                  className={`pill-tab ${activeSection === section ? 'pill-tab-active' : 'pill-tab-inactive'}`}
                  data-testid={`section-tab-${section.toLowerCase()}`}
                >
                  {section === 'All' ? 'All Sections' : `${section}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <MagnifyingGlass size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input data-testid="student-results-search-input" type="text" value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name or college ID..."
          className="soft-input w-full pl-12" />
      </div>

      {/* Student List */}
      <div className="soft-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.05]">
              <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">College ID</th>
              <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Name</th>
              <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Department</th>
              <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Section</th>
              <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Batch</th>
              <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id} className="border-b border-slate-50 dark:border-white/[0.05] hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors" data-testid={`result-student-${s.college_id}`}>
                <td className="py-3 px-4 font-bold text-indigo-600">{s.college_id}</td>
                <td className="py-3 px-4 font-medium text-slate-800">{s.name}</td>
                <td className="py-3 px-4 text-sm font-bold text-slate-500">{s.department || '-'}</td>
                <td className="py-3 px-4 text-sm">
                  <span className="soft-badge bg-indigo-50 text-indigo-600">{s.section || '-'}</span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{s.batch || '-'}</td>
                <td className="py-3 px-4 text-center">
                  <button data-testid={`view-profile-${s.college_id}`} onClick={() => setSelectedStudent(s.id)}
                    className="btn-primary !px-4 !py-1.5 text-xs">
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-slate-400 font-medium">{loading ? 'Loading...' : 'No students found'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { StudentProfileView, StudentResultsSearch };
