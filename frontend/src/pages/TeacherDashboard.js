import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, ChartLine, Users, Eye, SignOut, Clipboard, Calendar, PencilLine, Bell, GraduationCap, ArrowRight, Exam, Fire } from '@phosphor-icons/react';
import { analyticsAPI } from '../services/api';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const timeAgo = (ts) => {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const TeacherDashboard = ({ navigate, user, onLogout }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifRead, setNotifRead] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await analyticsAPI.teacherDashboard();
        setDashboardData(data);
      } catch (err) { console.error('Failed to load teacher dashboard:', err); }
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  const myQuizzes = (dashboardData?.quizzes || []);
  const totalQuizzes = myQuizzes.length;
  const activeQuizzes = myQuizzes.filter(q => q.status === 'active').length;

  const recentActivity = (dashboardData?.recent_submissions || []).slice(0, 8).map((r, i) => ({
    type: 'submission',
    title: r.student_name || 'Student',
    subtitle: `Submitted – ${r.quiz_title || r.quiz_subject || 'Quiz'}`,
    timestamp: r.submitted_at,
    score: r.percentage,
  }));

  const stats = [
    { label: 'Total Quizzes', value: String(totalQuizzes), sub: 'created', icon: Clipboard, color: 'bg-indigo-50 text-indigo-500', gradient: 'from-indigo-500 to-blue-500' },
    { label: 'Active Quizzes', value: String(activeQuizzes), sub: 'live now', icon: Fire, color: 'bg-rose-50 text-rose-500', gradient: 'from-rose-500 to-pink-500', onClick: () => navigate('teacher-quizzes') },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-slate-400">Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Notification overlay */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowNotifications(false)}></div>
          <div className="fixed top-16 right-4 sm:right-8 z-[61] w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden" style={{animation: 'fadeInUp 0.15s ease'}}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800">Recent Activity</h4>
              <button
                onClick={() => { setNotifRead(true); setShowNotifications(false); }}
                className="text-xs font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
              >
                Mark all as read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {recentActivity.length > 0 ? recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-emerald-50">
                    <Exam size={14} weight="duotone" className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{item.title}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">{item.subtitle} • {timeAgo(item.timestamp)}</p>
                  </div>
                  {item.score !== undefined && item.score !== null && (
                    <span className={`text-sm font-extrabold flex-shrink-0 ${
                      item.score >= 60 ? 'text-emerald-500' : item.score >= 40 ? 'text-amber-500' : 'text-red-500'
                    }`}>{item.score?.toFixed(0)}%</span>
                  )}
                </div>
              )) : (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-slate-400">No recent submissions</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <BookOpen size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">AcadeMix</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Faculty</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell */}
            <button
              data-testid="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors relative"
            >
              <Bell size={20} weight={showNotifications ? 'fill' : 'duotone'} />
              {!notifRead && recentActivity.length > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {Math.min(recentActivity.length, 9)}
                </div>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-2">
              <GraduationCap size={18} weight="duotone" className="text-emerald-500" />
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user?.designation || 'Assistant Professor'}</p>
              </div>
            </div>
            <button data-testid="logout-button" onClick={onLogout} className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors" aria-label="Sign out">
              <SignOut size={20} weight="duotone" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ── Hero Greeting ───────────────────────── */}
        <div className="mb-6 sm:mb-8" style={{animation: 'fadeInUp 0.2s ease'}}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-1">
            {getGreeting()}, {user?.name?.split(' ').pop() || 'Faculty'}!
          </h2>
          <p className="text-sm sm:text-base font-medium text-slate-500">
            {user?.designation || 'Assistant Professor'}
          </p>
        </div>

        {/* ── Stat Cards ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            const Wrapper = stat.onClick ? 'button' : 'div';
            return (
              <Wrapper key={i} onClick={stat.onClick || undefined}
                className={`soft-card-hover p-4 sm:p-6 relative overflow-hidden group text-left ${stat.onClick ? 'cursor-pointer' : ''}`}
                data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
                style={{animation: `fadeInUp ${0.2 + i * 0.1}s ease`}}>
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
                  <div className={`${stat.color} p-2 sm:p-2.5 rounded-xl`}><Icon size={18} weight="duotone" /></div>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{stat.value}</p>
                <p className="text-[10px] sm:text-xs font-medium text-slate-400 mt-1">{stat.sub}</p>
                {stat.onClick && <p className="text-[10px] font-bold text-indigo-500 mt-2 flex items-center gap-1">View all <ArrowRight size={10} weight="bold" /></p>}
              </Wrapper>
            );
          })}
        </div>

        {/* ── Quick Actions ────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
          {[
            { id: 'quiz-builder', icon: Plus, label: 'Create Quiz', sub: 'Build from scratch', color: 'indigo', testId: 'create-quiz-button' },
            { id: 'marks-entry', icon: PencilLine, label: 'Marks Entry', sub: 'Mid-term marks', color: 'violet', testId: 'marks-entry-button' },
            { id: 'class-results', icon: ChartLine, label: 'View Results', sub: 'Class-wise analytics', color: 'emerald', testId: 'view-all-results-button' },
            { id: 'student-management', icon: Users, label: 'Students', sub: 'Manage enrollment', color: 'amber', testId: 'manage-students-button' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <button key={item.id} data-testid={item.testId} onClick={() => navigate(item.id)}
                className="soft-card-hover p-4 sm:p-6 text-left flex items-center gap-3 sm:gap-4 group"
                style={{animation: `fadeInUp ${0.4 + i * 0.08}s ease`}}>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-${item.color}-50 rounded-xl flex items-center justify-center group-hover:bg-${item.color}-100 transition-colors`}>
                  <Icon size={22} weight="duotone" className={`text-${item.color}-500`} />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-sm sm:text-base text-slate-900 truncate">{item.label}</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-400 truncate">{item.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default TeacherDashboard;
