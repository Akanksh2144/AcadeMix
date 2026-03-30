import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, MagnifyingGlass, GraduationCap } from '@phosphor-icons/react';
import { marksAPI } from '../services/api';

const StudentManagement = ({ navigate, user }) => {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await marksAPI.myAssignments();
        setAssignments(data);
        if (data.length > 0) {
          setSelectedAssignment(data[0]);
          const res = await marksAPI.students(data[0].department, data[0].batch, data[0].section);
          setStudents(res.data);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleClassSelect = async (a) => {
    setSelectedAssignment(a);
    setLoading(true);
    try {
      const { data } = await marksAPI.students(a.department, a.batch, a.section);
      setStudents(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.college_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button data-testid="back-button" onClick={() => navigate('teacher-dashboard')}
            className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft size={22} weight="duotone" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">My Students</h1>
            <p className="text-sm font-medium text-slate-400">Students in your assigned classes</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Class Buttons */}
        {assignments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6" data-testid="class-buttons">
            {assignments.map(a => {
              const key = `${a.subject_code}-${a.batch}-${a.section}`;
              const isActive = selectedAssignment?.id === a.id;
              return (
                <button key={a.id} data-testid={`class-btn-${key}`} onClick={() => handleClassSelect(a)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isActive ? 'bg-indigo-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}>
                  {a.subject_code} &bull; {a.batch}-{a.section}
                </button>
              );
            })}
          </div>
        )}

        {selectedAssignment && (
          <div className="soft-card p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap size={20} weight="duotone" className="text-indigo-500" />
              <div>
                <p className="font-bold text-slate-800">{selectedAssignment.subject_name}</p>
                <p className="text-xs text-slate-500">Batch {selectedAssignment.batch} | Section {selectedAssignment.section} | Semester {selectedAssignment.semester}</p>
              </div>
            </div>
            <span className="soft-badge bg-indigo-50 text-indigo-600">{students.length} students</span>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <MagnifyingGlass size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input data-testid="student-search" type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or college ID..." className="soft-input w-full pl-12" />
        </div>

        {/* Student Table */}
        <div className="soft-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest w-12">#</th>
                <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">College ID</th>
                <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Student Name</th>
                <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Department</th>
                <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Batch</th>
                <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Section</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`student-row-${s.college_id}`}>
                  <td className="py-3 px-4 text-sm text-slate-400">{i + 1}</td>
                  <td className="py-3 px-4 font-bold text-indigo-600">{s.college_id}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{s.name}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{s.department || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{s.batch || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{s.section || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center"><p className="text-slate-400 font-medium">{loading ? 'Loading...' : 'No students found'}</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;
