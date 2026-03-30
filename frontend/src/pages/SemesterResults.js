import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, TrendUp, TrendDown } from '@phosphor-icons/react';
import { resultsAPI } from '../services/api';

const SemesterResults = ({ navigate, user }) => {
  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await resultsAPI.semester(user.id);
        setSemesters(data);
        if (data.length > 0) setSelectedSem(data[data.length - 1].semester);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, [user]);

  const currentSem = semesters.find(s => s.semester === selectedSem);
  const allSemNumbers = semesters.map(s => s.semester);

  const getGradeColor = (grade) => {
    if (!grade) return 'bg-slate-100 text-slate-600';
    if (grade === 'O' || grade.startsWith('A')) return 'bg-emerald-50 text-emerald-600';
    if (grade.startsWith('B')) return 'bg-amber-50 text-amber-600';
    return 'bg-rose-50 text-rose-600';
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button data-testid="back-button" onClick={() => navigate('student-dashboard')} className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"><ArrowLeft size={22} weight="duotone" /></button>
            <div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Semester Results</h1><p className="text-sm font-medium text-slate-400">Academic performance & grades</p></div>
          </div>
          <button data-testid="download-report-button" className="btn-primary flex items-center gap-2 text-sm"><Download size={18} weight="duotone" /> Download Report</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {semesters.length === 0 ? (
          <div className="soft-card p-12 text-center">
            <p className="text-xl font-bold text-slate-400 mb-2">No semester results found</p>
            <p className="text-sm text-slate-400">Results will appear here once they are uploaded by your institution.</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Select Semester</label>
              <div className="bg-slate-100 rounded-full p-1 inline-flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <button key={sem} data-testid={`semester-${sem}-button`} onClick={() => allSemNumbers.includes(sem) && setSelectedSem(sem)}
                    disabled={!allSemNumbers.includes(sem)}
                    className={`pill-tab ${selectedSem === sem ? 'pill-tab-active' : allSemNumbers.includes(sem) ? 'pill-tab-inactive' : 'text-slate-300 cursor-not-allowed'}`}>
                    Sem {sem}
                  </button>
                ))}
              </div>
            </div>

            {currentSem && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="soft-card p-5" data-testid="sgpa-card"><span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">SGPA</span><p className="text-3xl font-extrabold text-slate-900">{currentSem.sgpa}</p></div>
                  <div className="soft-card p-5" data-testid="cgpa-card">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">CGPA</span>
                    <div className="flex items-center gap-2"><p className="text-3xl font-extrabold text-slate-900">{currentSem.cgpa}</p></div>
                  </div>
                  <div className="soft-card p-5" data-testid="subjects-count-card"><span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">Subjects</span><p className="text-3xl font-extrabold text-slate-900">{currentSem.subjects?.length || 0}</p></div>
                  <div className="soft-card p-5" data-testid="status-card"><span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">Status</span><span className="soft-badge bg-emerald-50 text-emerald-600 text-base mt-1">
                    {currentSem.subjects?.every(s => s.status === 'PASS') ? 'All Pass' : 'Has Arrears'}
                  </span></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 soft-card p-6">
                    <h3 className="text-2xl font-bold text-slate-800 mb-6">Subject-wise Results</h3>
                    <table className="w-full" data-testid="subjects-table">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Subject</th>
                          <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Credits</th>
                          <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Grade</th>
                          <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(currentSem.subjects || []).map((sub, i) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`subject-row-${i}`}>
                            <td className="p-4"><p className="font-bold text-slate-800">{sub.name}</p><p className="text-sm font-medium text-slate-400">{sub.code}</p></td>
                            <td className="text-center p-4"><p className="font-bold text-slate-700">{sub.credits}</p></td>
                            <td className="text-center p-4"><span className={`soft-badge ${getGradeColor(sub.grade)}`}>{sub.grade}</span></td>
                            <td className="text-center p-4"><span className={`soft-badge ${sub.status === 'PASS' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{sub.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-6">
                    <div className="soft-card p-6">
                      <h3 className="text-xl font-bold text-slate-800 mb-4">CGPA Progression</h3>
                      <div className="space-y-4">
                        {semesters.map((s, i) => (
                          <div key={s.semester} className="flex items-center justify-between" data-testid={`cgpa-history-sem-${s.semester}`}>
                            <span className="font-bold text-slate-700">Semester {s.semester}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-extrabold text-slate-900">{s.cgpa}</span>
                              {i > 0 && s.cgpa > semesters[i - 1].cgpa && <TrendUp size={16} weight="duotone" className="text-emerald-500" />}
                              {i > 0 && s.cgpa < semesters[i - 1].cgpa && <TrendDown size={16} weight="duotone" className="text-red-500" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="soft-card p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      <h3 className="text-xl font-bold mb-3">Performance Summary</h3>
                      <div className="space-y-2 text-sm font-medium text-white/90">
                        <p>Total credits this sem: {currentSem.subjects?.reduce((s, sub) => s + (sub.credits || 0), 0)}</p>
                        <p>Grade O count: {currentSem.subjects?.filter(s => s.grade === 'O').length || 0}</p>
                        <p>All subjects: {currentSem.subjects?.every(s => s.status === 'PASS') ? 'Passed' : 'Has arrears'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SemesterResults;
