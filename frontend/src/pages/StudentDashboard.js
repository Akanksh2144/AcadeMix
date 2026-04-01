import React, { useState, useEffect } from 'react';
import { Clock, Trophy, ChartLine, Fire, BookOpen, Calendar, Target, SignOut, Terminal, ArrowRight, GraduationCap, Play, Medal, Lightning, Warning, Bell, Exam, Briefcase } from '@phosphor-icons/react';
import { analyticsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

/* ── Time-ago helper ──────────────────────────────────── */
const timeAgo = (ts) => {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/* ── Deadline helper ──────────────────────────────────── */
const getDeadlineInfo = (quiz) => {
  const end = quiz.end_date || quiz.deadline;
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  if (diff < 0) return { text: 'Expired', urgent: true };
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return { text: `${hrs}h left`, urgent: true };
  const days = Math.floor(hrs / 24);
  return { text: `${days}d left`, urgent: days <= 2 };
};



/* ── Weak Topic Bar Colors ──────────────────────────────── */
const getBarColor = (score) => {
  if (score >= 70) return '#10b981';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
};

const StudentDashboard = ({ navigate, user, onLogout }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifRead, setNotifRead] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await analyticsAPI.studentDashboard();
        setDashboard(data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, []);

  const stats = [
    { label: 'Avg Quiz Score', value: dashboard?.avg_score ? `${dashboard.avg_score}%` : '-', sub: dashboard?.total_quizzes ? `across ${dashboard.total_quizzes} quizzes` : 'no quizzes yet', icon: Target, color: 'bg-emerald-50 text-emerald-600', gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Quizzes Taken', value: dashboard?.total_quizzes || 0, sub: 'completed', icon: BookOpen, color: 'bg-indigo-50 text-indigo-600', gradient: 'from-indigo-500 to-blue-500' },
    { label: 'Active Quizzes', value: dashboard?.upcoming_quizzes?.length || 0, sub: 'available now', icon: Fire, color: 'bg-rose-50 text-rose-600', gradient: 'from-rose-500 to-pink-500', onClick: () => navigate('available-quizzes') },
    { label: 'Placements', value: 'View', sub: 'Campus drives', icon: Briefcase, color: 'bg-purple-50 text-purple-600', gradient: 'from-purple-500 to-fuchsia-500', onClick: () => navigate('placements') },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-slate-500">Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Notification overlay — rendered at root level so it covers the entire page */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowNotifications(false)}></div>
          <div className="fixed top-16 right-4 sm:right-8 z-[61] w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden" style={{animation: 'fadeInUp 0.15s ease'}}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800">Notifications</h4>
              <button
                onClick={() => { setNotifRead(true); setShowNotifications(false); }}
                className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors"
              >
                Mark all as read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {(dashboard?.activity || []).slice(0, 8).map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.type === 'quiz_result' ? 'bg-emerald-50' : 'bg-indigo-50'
                  }`}>
                    {item.type === 'quiz_result' ? (
                      <Exam size={14} weight="duotone" className="text-emerald-500" />
                    ) : (
                      <Bell size={14} weight="duotone" className="text-indigo-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{item.title}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{item.subtitle} • {timeAgo(item.timestamp)}</p>
                  </div>
                  {item.score !== undefined && (
                    <span className={`text-sm font-extrabold flex-shrink-0 ${
                      item.score >= 60 ? 'text-emerald-600' : item.score >= 40 ? 'text-amber-600' : 'text-red-600'
                    }`}>{item.score?.toFixed(0)}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <BookOpen size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">AcadeMix</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Student</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell */}
            {dashboard?.activity?.length > 0 && (
              <div className="relative">
                <button
                  data-testid="notification-bell"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors relative"
                  aria-label="Notifications"
                >
                  <Bell size={20} weight={showNotifications ? 'fill' : 'duotone'} />
                  {!notifRead && (
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                      {Math.min(dashboard.activity.length, 9)}
                    </div>
                  )}
                </button>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-2">
              <GraduationCap size={18} weight="duotone" className="text-indigo-500" />
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{user?.college_id} • {user?.department} • {user?.section}</p>
              </div>
            </div>
            <button data-testid="logout-button" onClick={onLogout} className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors" aria-label="Sign out">
              <SignOut size={20} weight="duotone" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ── Hero Greeting + Rank Badge ───────────────────────── */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-1">{getGreeting()}, {user?.name?.split(' ')[0]}!</h2>
            <p className="text-sm sm:text-base font-medium text-slate-500">
              {user?.college || 'GNI'} • {user?.department || 'DS'} • Batch {user?.batch || '2022'} • Section {user?.section || 'A'}
            </p>
          </div>
          {/* CGPA Card */}
          <div className="soft-card px-4 py-4 flex items-center gap-4 w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.75rem)] md:w-auto" style={{animation: 'fadeInUp 0.25s ease'}}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0">
              <Trophy size={20} weight="fill" className="text-white sm:hidden" />
              <Trophy size={24} weight="fill" className="text-white hidden sm:block" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">CGPA</p>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{dashboard?.cgpa?.toFixed(1) || '-'} <span className="text-xs sm:text-sm font-bold text-slate-500">/ 10</span></p>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            const Wrapper = stat.onClick ? 'button' : 'div';
            return (
              <Wrapper key={i} onClick={stat.onClick || undefined} className={`soft-card-hover p-4 sm:p-6 relative overflow-hidden group text-left ${stat.onClick ? 'cursor-pointer' : ''}`} data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
                style={{animation: `fadeInUp ${0.2 + i * 0.1}s ease`}}>
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</span>
                  <div className={`${stat.color} p-2 sm:p-2.5 rounded-xl`}><Icon size={18} weight="duotone" /></div>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{stat.value}</p>
                <p className="text-xs font-medium text-slate-500 mt-1">{stat.sub}</p>
                {stat.onClick && <p className="text-xs font-bold text-indigo-600 mt-2 flex items-center gap-1">View all <ArrowRight size={10} weight="bold" /></p>}
              </Wrapper>
            );
          })}
        </div>

        {/* ── Quick Access ────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
          {[
            { id: 'quiz-results', icon: BookOpen, label: 'Quiz Results', sub: 'View all attempts', color: 'indigo', testId: 'view-all-quizzes-button' },
            { id: 'semester-results', icon: Calendar, label: 'Semester Results', sub: 'Check your grades', color: 'teal', testId: 'view-semester-results-button' },
            { id: 'analytics', icon: ChartLine, label: 'Analytics', sub: 'Track performance', color: 'amber', testId: 'view-analytics-button' },
            { id: 'code-playground', icon: Terminal, label: 'Code Playground', sub: 'Practice coding', color: 'purple', testId: 'view-code-playground-button' },
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
                  <p className="text-xs sm:text-sm font-bold text-slate-500 truncate">{item.sub}</p>
                </div>
              </button>
            );
          })}
        </div>



        {/* ── Continue Where You Left Off ──────────────────────── */}
        {dashboard?.in_progress?.length > 0 && (
          <div className="mb-6 sm:mb-8" style={{animation: 'fadeInUp 0.5s ease'}}>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 mb-4">Continue Where You Left Off</h3>
            <div className="space-y-3">
              {dashboard.in_progress.map((attempt) => (
                <div key={attempt.id} className="soft-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-amber-400">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                      <Play size={20} weight="fill" className="text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{attempt.quiz_title || 'Untitled Quiz'}</h4>
                      <p className="text-xs sm:text-sm text-slate-500">
                        {attempt.quiz_subject} • {(attempt.answers || []).filter(a => a !== null).length}/{attempt.total_questions} answered
                      </p>
                    </div>
                  </div>
                  <button
                    data-testid={`resume-quiz-${attempt.quiz_id}`}
                    onClick={() => navigate('quiz-attempt', { id: attempt.quiz_id, title: attempt.quiz_title })}
                    className="btn-primary !px-5 !py-2.5 text-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    Resume <ArrowRight size={16} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}



        {/* ── Bottom Grid: Weak Topics + Activity + Leaderboard ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Weak Topics */}
          <div className="soft-card p-5 sm:p-6" style={{animation: 'fadeInUp 0.65s ease'}}>
            <div className="flex items-center gap-2 mb-5">
              <Warning size={20} weight="duotone" className="text-amber-500" />
              <h3 className="text-lg font-bold tracking-tight text-slate-800">Topic Mastery</h3>
            </div>
            {dashboard?.weak_topics?.length > 0 ? (
              <>
                <div className="h-48 sm:h-52 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.weak_topics} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis type="category" dataKey="subject" width={90} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Avg Score']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
                      <Bar dataKey="avg_score" radius={[0, 6, 6, 0]} barSize={20}>
                        {dashboard.weak_topics.map((entry, i) => (
                          <Cell key={i} fill={getBarColor(entry.avg_score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500"></span>Needs Work</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span>Average</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>Strong</span>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ChartLine size={24} weight="duotone" className="text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-500">Take some quizzes first</p>
                <p className="text-xs text-slate-500 mt-1">Topic analysis will appear after completing quizzes</p>
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="soft-card p-5 sm:p-6" style={{animation: 'fadeInUp 0.7s ease'}}>
            <div className="flex items-center gap-2 mb-5">
              <Lightning size={20} weight="duotone" className="text-indigo-500" />
              <h3 className="text-lg font-bold tracking-tight text-slate-800">Recent Activity</h3>
            </div>
            {dashboard?.activity?.length > 0 ? (
              <div className="space-y-1">
                {dashboard.activity.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.type === 'quiz_result' ? 'bg-emerald-50' : 'bg-indigo-50'
                    }`}>
                      {item.type === 'quiz_result' ? (
                        <Exam size={16} weight="duotone" className="text-emerald-500" />
                      ) : (
                        <Bell size={16} weight="duotone" className="text-indigo-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.subtitle && <span className="text-xs font-medium text-slate-500">{item.subtitle}</span>}
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-medium text-slate-500">{timeAgo(item.timestamp)}</span>
                      </div>
                    </div>
                    {item.score !== undefined && (
                      <span className={`text-sm font-extrabold flex-shrink-0 ${
                        item.score >= 60 ? 'text-emerald-600' : item.score >= 40 ? 'text-amber-600' : 'text-red-600'
                      }`}>{item.score?.toFixed(0)}%</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lightning size={24} weight="duotone" className="text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-500">No activity yet</p>
                <p className="text-xs text-slate-500 mt-1">Your quiz activity will show up here</p>
              </div>
            )}
          </div>

          {/* Leaderboard CTA */}
          <div className="soft-card-hover p-5 sm:p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex flex-col justify-between" style={{animation: 'fadeInUp 0.75s ease'}}>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Trophy size={28} weight="duotone" />
                <div>
                  <h3 className="font-extrabold text-lg sm:text-xl">Leaderboard</h3>
                  <p className="text-xs sm:text-sm font-medium text-white/70">See where you stand</p>
                </div>
              </div>
              {dashboard?.rank && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/70">Your Position</p>
                      <p className="text-4xl font-extrabold">#{dashboard.rank}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white/70">Total Students</p>
                      <p className="text-2xl font-extrabold">{dashboard.total_students}</p>
                    </div>
                  </div>
                  {dashboard.rank <= 3 && (
                    <div className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-300">
                      <Trophy size={16} weight="fill" />
                      {dashboard.rank === 1 ? 'You\'re #1! 🏆' : dashboard.rank === 2 ? 'Almost there! 🥈' : 'Top 3! 🥉'}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button data-testid="view-leaderboard-button" onClick={() => navigate('leaderboard')} className="w-full py-3 bg-white/20 backdrop-blur-sm rounded-xl font-bold text-sm hover:bg-white/30 transition-colors mt-auto">
              View Full Leaderboard
            </button>
          </div>
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

export default StudentDashboard;
