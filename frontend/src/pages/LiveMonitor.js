import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Users, CheckCircle, Clock, Warning, Eye, Camera, CircleNotch, DownloadSimple, StopCircle, Plus } from '@phosphor-icons/react';
import { quizzesAPI } from '../services/api';
import * as XLSX from 'xlsx';

const LiveMonitor = ({ quiz, navigate, user }) => {
  const [activeTab, setActiveTab] = useState('active');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [toast, setToast] = useState(null);
  const [quizEnded, setQuizEnded] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLive = useCallback(async () => {
    if (!quiz?.id) return;
    try {
      const { data } = await quizzesAPI.liveMonitor(quiz.id);
      setStudents(data || []);
    } catch (err) {
      console.error('Live monitor fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [quiz?.id]);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 10000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  const handleExtendTime = async () => {
    if (!quiz?.id || actionLoading) return;
    setActionLoading('extend');
    try {
      const { data } = await quizzesAPI.extendTime(quiz.id);
      showToast(`✓ ${data.message}`, 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to extend time', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleEndQuiz = async () => {
    if (!quiz?.id || actionLoading) return;
    const confirm = window.confirm(`End "${quiz.title}" now? All in-progress attempts will be auto-submitted.`);
    if (!confirm) return;
    setActionLoading('end');
    try {
      const { data } = await quizzesAPI.endQuiz(quiz.id);
      showToast(`✓ ${data.message}`, 'success');
      setQuizEnded(true);
      fetchLive(); // refresh table
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to end quiz', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleExportLogs = () => {
    if (!students.length) { showToast('No data to export', 'error'); return; }
    const rows = students.map(s => ({
      'Student Name': s.name,
      'Roll No': s.rollNo,
      'Status': s.status,
      'Progress': `${s.progress}/${s.totalQuestions}`,
      'Time Elapsed (mins)': s.timeElapsed,
      'Start Time': s.startTime,
      'Submit Time': s.submitTime || '-',
      'Violations': s.violations,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Live Monitor Log');
    XLSX.writeFile(wb, `${(quiz?.title || 'quiz').replace(/\s+/g, '_')}_live_log.xlsx`);
    showToast('✓ Log exported successfully');
  };

  const activeStudents = students.filter(s => s.status === 'active');
  const submittedStudents = students.filter(s => s.status === 'submitted');
  const violationStudents = students.filter(s => s.violations > 0);
  const displayStudents = activeTab === 'active' ? activeStudents : activeTab === 'submitted' ? submittedStudents : violationStudents;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-2xl font-bold text-sm shadow-xl transition-all ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`} style={{ animation: 'fadeInUp 0.2s ease' }}>
          {toast.msg}
        </div>
      )}

      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button data-testid="back-button" onClick={() => navigate(user?.role === 'hod' ? 'hod-dashboard' : user?.role === 'exam_cell' ? 'examcell-dashboard' : user?.role === 'admin' ? 'admin-dashboard' : 'teacher-dashboard')} className="p-2.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-500 transition-colors" aria-label="Go back">
                <ArrowLeft size={22} weight="duotone" />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Live Quiz Monitor</h1>
                <p className="text-sm font-medium text-slate-400">{quiz?.title || 'Unknown Quiz'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`soft-badge ${quizEnded ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`} data-testid="quiz-status">
                {quizEnded ? 'ENDED' : 'ACTIVE'}
              </span>
              <div className="bg-slate-50 px-4 py-2 rounded-2xl flex items-center gap-2" data-testid="time-remaining">
                <Clock size={18} weight="duotone" className="text-slate-500" />
                <span className="font-bold text-slate-700">{quiz?.duration_mins || '-'} mins</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
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

        {/* Tabs */}
        <div className="bg-slate-100 rounded-full p-1 inline-flex gap-1 mb-6">
          {[{ key: 'active', label: `Active (${activeStudents.length})` }, { key: 'submitted', label: `Submitted (${submittedStudents.length})` }, { key: 'violations', label: `Violations (${violationStudents.length})` }].map(t => (
            <button key={t.key} data-testid={`${t.key}-tab`} onClick={() => setActiveTab(t.key)}
              className={`pill-tab ${activeTab === t.key ? 'pill-tab-active' : 'pill-tab-inactive'}`}>{t.label}</button>
          ))}
        </div>

        {/* Student Table */}
        <div className="soft-card p-6 overflow-hidden mb-8">
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
                  {['Student', 'Progress', 'Time', 'Violations', 'Status'].map(h => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            data-testid="extend-time-button"
            onClick={handleExtendTime}
            disabled={!!actionLoading || quizEnded}
            className="soft-card-hover p-6 text-left flex items-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              {actionLoading === 'extend' ? <CircleNotch size={24} weight="bold" className="text-indigo-500 animate-spin" /> : <Plus size={24} weight="duotone" className="text-indigo-500" />}
            </div>
            <div>
              <p className="font-extrabold text-slate-900">Extend Time</p>
              <p className="text-sm font-medium text-slate-400">Add 10 mins for all</p>
            </div>
          </button>

          <button
            data-testid="end-quiz-button"
            onClick={handleEndQuiz}
            disabled={!!actionLoading || quizEnded}
            className="soft-card-hover p-6 text-left flex items-center gap-4 bg-red-50 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              {actionLoading === 'end' ? <CircleNotch size={24} weight="bold" className="text-red-500 animate-spin" /> : <StopCircle size={24} weight="duotone" className="text-red-500" />}
            </div>
            <div>
              <p className="font-extrabold text-red-700">{quizEnded ? 'Quiz Ended' : 'End Quiz Now'}</p>
              <p className="text-sm font-medium text-red-400">Force submit all</p>
            </div>
          </button>

          <button
            data-testid="export-activity-button"
            onClick={handleExportLogs}
            disabled={!students.length}
            className="soft-card-hover p-6 text-left flex items-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition-colors">
              <DownloadSimple size={24} weight="duotone" className="text-teal-500" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900">Export Log</p>
              <p className="text-sm font-medium text-slate-400">Download .xlsx activity</p>
            </div>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LiveMonitor;
