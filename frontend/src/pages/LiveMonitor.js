import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, CheckCircle, Clock, Warning, Eye, Camera, CircleNotch } from '@phosphor-icons/react';
import { quizzesAPI } from '../services/api';

const LiveMonitor = ({ quiz, navigate, user }) => {
  const [activeTab, setActiveTab] = useState('active');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quiz?.id) return;
    
    const fetchLive = async () => {
      try {
        const { data } = await quizzesAPI.liveMonitor(quiz.id);
        setStudents(data || []);
      } catch (err) {
        console.error("Live monitor fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLive();
    const interval = setInterval(fetchLive, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [quiz?.id]);

  const activeStudents = students.filter(s => s.status === 'active');
  const submittedStudents = students.filter(s => s.status === 'submitted');
  const violationStudents = students.filter(s => s.violations > 0);
  const displayStudents = activeTab === 'active' ? activeStudents : activeTab === 'submitted' ? submittedStudents : violationStudents;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button data-testid="back-button" onClick={() => navigate(user?.role === 'hod' ? 'hod-dashboard' : user?.role === 'exam_cell' ? 'examcell-dashboard' : user?.role === 'admin' ? 'admin-dashboard' : 'teacher-dashboard')} className="p-2.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-500 transition-colors" aria-label="Go back">
                <ArrowLeft size={22} weight="duotone" />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Live Quiz Monitor</h1>
                <p className="text-sm font-medium text-slate-400">{quiz?.title || 'Data Structures - Arrays & Linked Lists'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="soft-badge bg-emerald-50 text-emerald-600" data-testid="quiz-status">ACTIVE</span>
              <div className="bg-slate-50 px-4 py-2 rounded-2xl flex items-center gap-2" data-testid="time-remaining">
                <Clock size={18} weight="duotone" className="text-slate-500" /><span className="font-bold text-slate-700">35:00</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Students', value: students.length, icon: Users, color: 'bg-indigo-50 text-indigo-500' },
            { label: 'Active Now', value: activeStudents.length, icon: Eye, color: 'bg-emerald-50 text-emerald-500' },
            { label: 'Submitted', value: submittedStudents.length, icon: CheckCircle, color: 'bg-amber-50 text-amber-500' },
            { label: 'Violations', value: violationStudents.length, icon: Warning, color: 'bg-red-50 text-red-500' },
          ].map((stat, i) => (
            <div key={i} className="soft-card p-6" data-testid={`${stat.label.toLowerCase().replace(/\s+/g, '-')}-stat`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
                <div className={`${stat.color} p-2 rounded-xl`}><stat.icon size={18} weight="duotone" /></div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-100 rounded-full p-1 inline-flex gap-1 mb-6">
          {[{ key: 'active', label: `Active (${activeStudents.length})` }, { key: 'submitted', label: `Submitted (${submittedStudents.length})` }, { key: 'violations', label: `Violations (${violationStudents.length})` }].map(t => (
            <button key={t.key} data-testid={`${t.key}-tab`} onClick={() => setActiveTab(t.key)}
              className={`pill-tab ${activeTab === t.key ? 'pill-tab-active' : 'pill-tab-inactive'}`}>{t.label}</button>
          ))}
        </div>

        <div className="soft-card p-6 overflow-hidden">
          {loading && students.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <CircleNotch size={32} weight="bold" className="text-indigo-500 animate-spin mb-3" />
              <p className="text-slate-500 font-medium">Connecting to live feed...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">No students have joined this quiz yet</div>
          ) : displayStudents.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-medium">No students in this view</div>
          ) : (
            <table className="w-full" data-testid="students-monitor-table">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Student', 'Progress', 'Time', 'Violations', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`${h === 'Student' ? 'text-left' : 'text-center'} p-4 text-xs font-bold uppercase tracking-widest text-slate-400`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((student) => (
                  <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`student-row-${student.id}`}>
                    <td className="p-4"><p className="font-bold text-slate-800">{student.name}</p><p className="text-sm font-medium text-slate-400">{student.rollNo}</p></td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2 mb-1"><span className="font-bold text-slate-700 text-sm">{student.progress}/{student.totalQuestions}</span></div>
                      <div className="h-2 bg-slate-100 rounded-full max-w-32 mx-auto overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full transition-all duration-1000" style={{ width: `${student.totalQuestions > 0 ? (student.progress / student.totalQuestions) * 100 : 0}%` }}></div>
                      </div>
                    </td>
                    <td className="text-center p-4">
                      <div className="flex items-center justify-center gap-1"><Clock size={15} weight="duotone" className="text-slate-400" /><span className="font-bold text-slate-700">{student.timeElapsed}m</span></div>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">{student.status === 'active' ? `Started ${student.startTime}` : `Done ${student.submitTime}`}</p>
                    </td>
                    <td className="text-center p-4">
                      {student.violations > 0 ? <span className={`soft-badge ${student.violations >= 2 ? 'bg-red-100 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{student.violations}</span>
                        : <span className="text-emerald-500 font-bold">OK</span>}
                    </td>
                    <td className="text-center p-4"><span className={`soft-badge ${student.status === 'active' ? 'bg-emerald-50 text-emerald-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>{student.status}</span></td>
                    <td className="text-center p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button data-testid={`view-activity-${student.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">View Activity</button>
                        {student.violations > 0 && <button data-testid={`view-snapshots-${student.id}`} className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 transition-colors"><Camera size={14} weight="duotone" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <button data-testid="extend-time-button" className="soft-card-hover p-6 text-left flex items-center gap-4 group">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors"><Clock size={24} weight="duotone" className="text-indigo-500" /></div>
            <div><p className="font-extrabold text-slate-900">Extend Time</p><p className="text-sm font-medium text-slate-400">Add 10 mins for all</p></div>
          </button>
          <button data-testid="end-quiz-button" className="soft-card-hover p-6 text-left flex items-center gap-4 bg-red-50 group">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><Warning size={24} weight="duotone" className="text-red-500" /></div>
            <div><p className="font-extrabold text-red-700">End Quiz Now</p><p className="text-sm font-medium text-red-400">Force submit all</p></div>
          </button>
          <button data-testid="export-activity-button" className="soft-card-hover p-6 text-left flex items-center gap-4 group">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition-colors"><Eye size={24} weight="duotone" className="text-teal-500" /></div>
            <div><p className="font-extrabold text-slate-900">Export Log</p><p className="text-sm font-medium text-slate-400">Download activity</p></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitor;
