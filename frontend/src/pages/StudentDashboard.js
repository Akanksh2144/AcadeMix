import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Trophy, ChartLine, Fire, BookOpen, Calendar, Target, SignOut, Terminal, ArrowRight, GraduationCap, Play, Medal, Lightning, Warning, Bell, Exam, Briefcase, Sun, Moon } from '@phosphor-icons/react';
import { analyticsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import DashboardSkeleton from '../components/DashboardSkeleton';
import Lottie from 'lottie-react';
import { searchEmptyAnimation, sleepAnimation } from '../assets/lottieAnimations';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

/* ── Time-ago helper ──────────────────────────────────── */
const timeAgo = (ts) => {
  if (!ts) return '';
  const parsedTs = ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
  const diff = Date.now() - new Date(parsedTs).getTime();
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

/* ── Framer Motion Variants ─────────────────────────────── */
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

const StudentDashboard = ({ navigate, user, onLogout }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const { isDark, toggle: toggleTheme } = useTheme();

  const notifKey = `acadmix_last_notif_${user?.id || 'default'}`;
  const [lastReadTime, setLastReadTime] = useState(() => localStorage.getItem(notifKey) || '1970-01-01T00:00:00.000Z');
  
  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && dashboard?.activity?.length > 0) {
      // Mark as read by storing the latest timestamp
      const latestTs = dashboard.activity[0].timestamp || new Date().toISOString();
      setLastReadTime(latestTs);
      localStorage.setItem(notifKey, latestTs);
    }
  };

  const unreadCount = dashboard?.activity?.filter(a => new Date(a.timestamp) > new Date(lastReadTime)).length || 0;

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
    { label: 'Avg Quiz Score', value: dashboard?.avg_score ? `${dashboard.avg_score}%` : '-', sub: dashboard?.total_quizzes ? `across ${dashboard.total_quizzes} quizzes` : 'no quizzes yet', icon: Target, color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Quizzes Taken', value: dashboard?.total_quizzes || 0, sub: 'completed', icon: BookOpen, color: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', gradient: 'from-indigo-500 to-blue-500' },
    { label: 'Active Quizzes', value: dashboard?.upcoming_quizzes?.length || 0, sub: 'available now', icon: Fire, color: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400', gradient: 'from-rose-500 to-pink-500', onClick: () => navigate('available-quizzes') },
    { label: 'Placements', value: 'View', sub: 'Campus drives', icon: Briefcase, color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400', gradient: 'from-purple-500 to-fuchsia-500', onClick: () => navigate('placements') },
  ];

  /* ── Skeleton screen while loading ─────────────────────── */
  if (loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      {/* Notification overlay */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setShowNotifications(false)}></div>
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="fixed top-16 right-4 sm:right-8 z-[61] w-80 sm:w-96 bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100">Notifications</h4>
                <button
                  onClick={() => { setNotifRead(true); setShowNotifications(false); }}
                  className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors"
                >
                  Mark all as read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-white/5">
                {(dashboard?.activity || []).slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.type === 'quiz_result' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-indigo-50 dark:bg-indigo-500/15'
                    }`}>
                      {item.type === 'quiz_result' ? (
                        <Exam size={14} weight="duotone" className="text-emerald-500" />
                      ) : (
                        <Bell size={14} weight="duotone" className="text-indigo-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{item.subtitle} • {timeAgo(item.timestamp)}</p>
                    </div>
                    {item.score !== undefined && (
                      <span className={`text-sm font-extrabold flex-shrink-0 ${
                        item.score >= 60 ? 'text-emerald-600' : item.score >= 40 ? 'text-amber-600' : 'text-red-600'
                      }`}>{item.score?.toFixed(0)}%</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Header ──────────────────────────── */}
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <BookOpen size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">AcadMix</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Student</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={isDark ? 'dark' : 'light'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  {isDark ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>

            {/* Notification Bell */}
            {dashboard?.activity?.length > 0 && (
              <div className="relative">
                <button
                  data-testid="notification-bell"
                  onClick={handleBellClick}
                  className="p-2.5 rounded-full bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors relative"
                  aria-label="Notifications"
                >
                  <Bell size={20} weight={showNotifications ? 'fill' : 'duotone'} />
                  {unreadCount > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                      {Math.min(unreadCount, 9)}
                    </div>
                  )}
                </button>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-white/5 rounded-2xl px-4 py-2">
              <GraduationCap size={18} weight="duotone" className="text-indigo-500" />
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user?.name}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{user?.college_id} • {user?.department} • {user?.section}</p>
              </div>
            </div>
            <button data-testid="logout-button" onClick={onLogout} className="p-2.5 rounded-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 transition-colors" aria-label="Sign out">
              <SignOut size={20} weight="duotone" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ── Hero Greeting + CGPA ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
        >
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">{getGreeting()}, {user?.name?.split(' ')[0]}!</h2>
            <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400">
              {user?.college || 'GNI'} • {user?.department || 'DS'} • Batch {user?.batch || '2026'} • Section {user?.section || 'A'}
            </p>
          </div>
          <motion.div whileHover={cardHover} className="soft-card px-4 py-4 flex items-center gap-4 w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.75rem)] md:w-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0">
              <Trophy size={20} weight="fill" className="text-white sm:hidden" />
              <Trophy size={24} weight="fill" className="text-white hidden sm:block" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">CGPA</p>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{dashboard?.cgpa?.toFixed(1) || '-'} <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">/ 10</span></p>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Stat Cards (Spring Physics) ───────────────── */}
        <motion.div
          variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8"
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={cardHover}
                onClick={stat.onClick || undefined}
                className={`soft-card-hover p-4 sm:p-6 relative overflow-hidden group text-left ${stat.onClick ? 'cursor-pointer' : ''}`}
                data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{stat.label}</span>
                  <div className={`${stat.color} p-2 sm:p-2.5 rounded-xl`}><Icon size={18} weight="duotone" /></div>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{stat.sub}</p>
                {stat.onClick && <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1">View all <ArrowRight size={10} weight="bold" /></p>}
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Quick Access (Spring Stagger) ─────────────── */}
        <motion.div
          variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8"
        >
          {[
            { id: 'quiz-results', icon: BookOpen, label: 'Quiz Results', sub: 'View all attempts', iconBg: 'bg-indigo-50 dark:bg-indigo-500/10 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20', iconText: 'text-indigo-500', testId: 'view-all-quizzes-button' },
            { id: 'semester-results', icon: Calendar, label: 'Semester Results', sub: 'Check your grades', iconBg: 'bg-teal-50 dark:bg-teal-500/10 group-hover:bg-teal-100 dark:group-hover:bg-teal-500/20', iconText: 'text-teal-500', testId: 'view-semester-results-button' },
            { id: 'analytics', icon: ChartLine, label: 'Analytics', sub: 'Track performance', iconBg: 'bg-amber-50 dark:bg-amber-500/10 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20', iconText: 'text-amber-500', testId: 'view-analytics-button' },
            { id: 'code-playground', icon: Terminal, label: 'Code Playground', sub: 'Practice coding', iconBg: 'bg-purple-50 dark:bg-purple-500/10 group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20', iconText: 'text-purple-500', testId: 'view-code-playground-button' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <motion.button key={item.id} variants={itemVariants} whileHover={cardHover} whileTap={{ scale: 0.97 }}
                data-testid={item.testId} onClick={() => navigate(item.id)}
                className="soft-card-hover p-4 sm:p-6 text-left flex items-center gap-3 sm:gap-4 group"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors ${item.iconBg}`}>
                  <Icon size={22} weight="duotone" className={item.iconText} />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">{item.label}</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 truncate">{item.sub}</p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Continue Where You Left Off ──────────────── */}
        <AnimatePresence>
          {dashboard?.in_progress?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="mb-6 sm:mb-8"
            >
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-white mb-4">Continue Where You Left Off</h3>
              <div className="space-y-3">
                {dashboard.in_progress.map((attempt) => (
                  <motion.div key={attempt.id} whileHover={{ x: 4 }} className="soft-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-amber-400">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
                        <Play size={20} weight="fill" className="text-amber-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{attempt.quiz_title || 'Untitled Quiz'}</h4>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
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
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bottom Grid: Weak Topics + Activity + Leaderboard ── */}
        <motion.div
          variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8"
        >
          {/* Weak Topics */}
          <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Warning size={20} weight="duotone" className="text-amber-500" />
              <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Topic Mastery</h3>
            </div>
            {dashboard?.weak_topics?.length > 0 ? (
              <>
                <div className="h-48 sm:h-52 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.weak_topics} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
                      <YAxis type="category" dataKey="subject" width={90} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#475569', fontWeight: 600 }} />
                      <Tooltip 
                        cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white dark:bg-[#1A202C] rounded-xl p-3 shadow-lg shadow-indigo-500/10 dark:shadow-none border border-slate-100 dark:border-slate-800">
                                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1.5">{label}</p>
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor: payload[0].payload.fill || payload[0].color }}></span>
                                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    Avg Score: <span className="font-bold text-slate-900 dark:text-white">{payload[0].value}%</span>
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />
                      <Bar dataKey="avg_score" radius={[0, 6, 6, 0]} barSize={20}>
                        {dashboard.weak_topics.map((entry, i) => (
                          <Cell key={i} fill={getBarColor(entry.avg_score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500"></span>Needs Work</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span>Average</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>Strong</span>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto mb-3">
                  <Lottie animationData={searchEmptyAnimation} loop autoplay />
                </div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Take some quizzes first</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Topic analysis will appear after completing quizzes</p>
              </div>
            )}
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lightning size={20} weight="duotone" className="text-indigo-500" />
              <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Recent Activity</h3>
            </div>
            {dashboard?.activity?.length > 0 ? (
              <div className="space-y-1">
                {dashboard.activity.slice(0, 6).map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.type === 'quiz_result' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-indigo-50 dark:bg-indigo-500/15'
                    }`}>
                      {item.type === 'quiz_result' ? (
                        <Exam size={16} weight="duotone" className="text-emerald-500" />
                      ) : (
                        <Bell size={16} weight="duotone" className="text-indigo-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 pr-2">
                        {item.subtitle && <span>{item.subtitle} <span className="mx-1 text-slate-400 dark:text-slate-500">•</span></span>}
                        <span className="whitespace-nowrap">{timeAgo(item.timestamp)}</span>
                      </div>
                    </div>
                    {item.score !== undefined && (
                      <span className={`text-sm font-extrabold flex-shrink-0 ${
                        item.score >= 60 ? 'text-emerald-600' : item.score >= 40 ? 'text-amber-600' : 'text-red-600'
                      }`}>{item.score?.toFixed(0)}%</span>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto mb-3">
                  <Lottie animationData={sleepAnimation} loop autoplay />
                </div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No activity yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Your quiz activity will show up here</p>
              </div>
            )}
          </motion.div>

          {/* Leaderboard CTA */}
          <motion.div variants={itemVariants} whileHover={cardHover}
            className="soft-card-hover p-5 sm:p-6 bg-gradient-to-br from-indigo-500 to-purple-600 !border-transparent text-white flex flex-col justify-between"
          >
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
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentDashboard;
