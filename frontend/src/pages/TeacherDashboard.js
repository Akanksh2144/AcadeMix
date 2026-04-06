import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, NotePencil, ChartLine, Users, Eye, SignOut, Clipboard, Calendar, CalendarDots, PencilLine, Bell, GraduationCap, ArrowRight, Exam, Fire, Sun, Moon } from '@phosphor-icons/react';
import { analyticsAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import DashboardSkeleton from '../components/DashboardSkeleton';
import AttendanceMarker from '../components/faculty/AttendanceMarker';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const cardHover = {
  scale: 1.02,
  transition: { type: 'spring', stiffness: 400, damping: 17 }
};

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
  return `${Math.floor(hrs / 24)}d ago`;
};

const TeacherDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('teacher_tab') || 'overview');
  useEffect(() => { sessionStorage.setItem('teacher_tab', activeTab); }, [activeTab]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDark, toggle: toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifKey = `acadmix_notif_read_${user?.id || 'default'}`;
  const [notifRead, setNotifReadState] = useState(() => localStorage.getItem(notifKey) === 'true');
  const setNotifRead = (val) => { setNotifReadState(val); localStorage.setItem(notifKey, String(val)); };

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
    { label: 'Total Quizzes', value: String(totalQuizzes), sub: 'created', icon: Clipboard, color: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500 dark:text-indigo-400', gradient: 'from-indigo-500 to-blue-500' },
    { label: 'Active Quizzes', value: String(activeQuizzes), sub: 'live now', icon: Fire, color: 'bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400', gradient: 'from-rose-500 to-pink-500', onClick: () => navigate('teacher-quizzes') },
  ];

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      {/* Notification overlay */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60]" onClick={() => setShowNotifications(false)}></motion.div>
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-16 right-4 sm:right-8 z-[61] w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 dark:bg-[#1A202C] dark:border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100">Recent Activity</h4>
                <button
                  onClick={() => { setNotifRead(true); setShowNotifications(false); }}
                  className="text-xs font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
                >
                  Mark all as read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-white/[0.04]">
                {recentActivity.length > 0 ? recentActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-emerald-50 dark:bg-emerald-500/15">
                      <Exam size={14} weight="duotone" className="text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{item.title}</p>
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <BookOpen size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">AcadMix</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Faculty</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors hidden sm:block"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={isDark ? 'dark' : 'light'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  {isDark ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
            {/* Notification Bell */}
            <button
              data-testid="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 text-slate-500 dark:text-slate-400 transition-colors relative"
            >
              <Bell size={20} weight={showNotifications ? 'fill' : 'duotone'} />
              {!notifRead && recentActivity.length > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {Math.min(recentActivity.length, 9)}
                </div>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-4 py-2">
              <GraduationCap size={18} weight="duotone" className="text-emerald-500" />
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{user?.name}</p>
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="mb-6 sm:mb-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ').pop() || 'Faculty'}!</span>
          </h2>
          <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400">
            {user?.designation || 'Assistant Professor'}
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex bg-white dark:bg-[#1A202C] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 mb-6 sm:mb-8" data-testid="teacher-tabs">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-6 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview' }, 
              { id: 'attendance', label: 'Daily Attendance' }
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <motion.div data-testid="overview-content" variants={containerVariants} initial="hidden" animate="show">
            {/* ── Stat Cards ──────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            const Wrapper = stat.onClick ? motion.button : motion.div;
            return (
              <Wrapper variants={itemVariants} whileHover={cardHover} key={i} onClick={stat.onClick || undefined}
                className={`stat-card relative overflow-hidden group text-left ${stat.onClick ? 'cursor-pointer' : ''}`}
                data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
                  <div className={`${stat.color} p-2 sm:p-2.5 rounded-xl`}><Icon size={18} weight="duotone" /></div>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-[10px] sm:text-xs font-medium text-slate-400 mt-1">{stat.sub}</p>
                {stat.onClick && <p className="text-[10px] font-bold text-indigo-500 mt-2 flex items-center gap-1">View all <ArrowRight size={10} weight="bold" /></p>}
              </Wrapper>
            );
          })}
            </div>

        {/* ── Quick Actions ────────────────────────── */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-5 mb-6 sm:mb-8">
          {[
            { id: 'attendance-marker', icon: Clipboard, label: 'Attendance', sub: 'Mark daily roster', colorBg: 'bg-emerald-50 dark:bg-emerald-500/15 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/25', colorText: 'text-emerald-500 dark:text-emerald-400', testId: 'attendance-marker-button' },
            { id: 'quiz-builder', icon: NotePencil, label: 'Create Quiz', sub: 'Build from scratch', colorBg: 'bg-indigo-50 dark:bg-indigo-500/15 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/25', colorText: 'text-indigo-500 dark:text-indigo-400', testId: 'create-quiz-button' },
            { id: 'marks-entry', icon: PencilLine, label: 'Marks Entry', sub: 'Mid-term marks', colorBg: 'bg-violet-50 dark:bg-violet-500/15 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/25', colorText: 'text-violet-500 dark:text-violet-400', testId: 'marks-entry-button' },
            { id: 'class-results', icon: ChartLine, label: 'View Results', sub: 'Class-wise analytics', colorBg: 'bg-sky-50 dark:bg-sky-500/15 group-hover:bg-sky-100 dark:group-hover:bg-sky-500/25', colorText: 'text-sky-500 dark:text-sky-400', testId: 'view-all-results-button' },
            { id: 'student-management', icon: Users, label: 'Students', sub: 'Manage enrollment', colorBg: 'bg-amber-50 dark:bg-amber-500/15 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/25', colorText: 'text-amber-500 dark:text-amber-400', testId: 'manage-students-button' },
            { id: 'quiz-calendar', icon: CalendarDots, label: 'Calendar', sub: 'Quiz schedule', colorBg: 'bg-rose-50 dark:bg-rose-500/15 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/25', colorText: 'text-rose-500 dark:text-rose-400', testId: 'quiz-calendar-button' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button variants={itemVariants} whileHover={cardHover} key={item.id} data-testid={item.testId} onClick={() => navigate(item.id)}
                className="soft-card-hover p-4 sm:p-6 text-left flex items-center gap-3 sm:gap-4 group">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors ${item.colorBg}`}>
                  <Icon size={22} weight="duotone" className={item.colorText} />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">{item.label}</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 truncate">{item.sub}</p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Activity Feed + Quiz Summary ─────────── */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Recent Submissions */}
          <motion.div variants={itemVariants} className="lg:col-span-3 soft-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Recent Submissions</h3>
              <button onClick={() => navigate('teacher-quizzes')} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                View all <ArrowRight size={12} weight="bold" />
              </button>
            </div>
            <div className="space-y-1">
              {recentActivity.length > 0 ? recentActivity.slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-50 dark:bg-emerald-500/15">
                    <Exam size={14} weight="duotone" className="text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">{item.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.score !== undefined && item.score !== null && (
                      <span className={`text-sm font-extrabold ${
                        item.score >= 60 ? 'text-emerald-500' : item.score >= 40 ? 'text-amber-500' : 'text-red-500'
                      }`}>{item.score?.toFixed(0)}%</span>
                    )}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{timeAgo(item.timestamp)}</span>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <Clipboard size={22} weight="duotone" className="text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No submissions yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Create a quiz to get started</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Active Quizzes Summary */}
          <motion.div variants={itemVariants} className="lg:col-span-2 soft-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">My Quizzes</h3>
              <button onClick={() => navigate('teacher-quizzes')} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                Manage <ArrowRight size={12} weight="bold" />
              </button>
            </div>
            <div className="space-y-2">
              {myQuizzes.slice(0, 5).map((q, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => navigate('teacher-quizzes')}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    q.status === 'active' ? 'bg-emerald-500' : q.status === 'scheduled' ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{q.title}</p>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 capitalize">{q.subject} · {q.status}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    q.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                    q.status === 'scheduled' ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>{q.attempt_count || 0} attempts</span>
                </div>
              ))}
              {myQuizzes.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No quizzes yet</p>
                  <button onClick={() => navigate('quiz-builder')} className="mt-2 text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors">Create your first quiz →</button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
          </motion.div>
        )}

        {activeTab === 'attendance' && (
          <motion.div data-testid="attendance-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <AttendanceMarker user={user} />
            </motion.div>
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default TeacherDashboard;
