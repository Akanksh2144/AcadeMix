import React, { useState, useEffect, useCallback } from 'react';
import UserProfileModal from '../components/UserProfileModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, GraduationCap, ChartBar, CalendarDots, ClockCountdown, Chalkboard, SignOut, Sun, Moon, FileText, ChatCircleDots, CaretDown, Warning, CheckCircle, XCircle, Clock, BookOpen, UserCircle, Download, Bell } from '@phosphor-icons/react';
import { parentAPI, grievanceAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import DashboardSkeleton from '../components/DashboardSkeleton';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

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

const TABS = [
  { id: 'overview', label: 'Overview', icon: ChartBar },
  { id: 'academics', label: 'Academics', icon: GraduationCap },
  { id: 'attendance', label: 'Attendance', icon: ClockCountdown },
  { id: 'timetable', label: 'Timetable', icon: Chalkboard },
  { id: 'leaves', label: 'Leaves', icon: CalendarDots },
  { id: 'grievances', label: 'Grievances', icon: ChatCircleDots },
];

const statusColor = (status) => {
  switch (status) {
    case 'approved': case 'resolved': return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'rejected': case 'closed': return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400';
    case 'in_review': return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400';
    default: return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }
};

const ParentDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('parent_tab') || 'overview');
  const [showProfile, setShowProfile] = useState(false);
  useEffect(() => { sessionStorage.setItem('parent_tab', activeTab); }, [activeTab]);

  const { isDark, toggle: toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [academics, setAcademics] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [grievanceForm, setGrievanceForm] = useState({ category: 'academic', subject: '', description: '' });
  const [childDropdown, setChildDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifKey = `acadmix_last_notif_parent_${user?.id || 'default'}`;
  const [lastReadTime, setLastReadTime] = useState(() => localStorage.getItem(notifKey) || '1970-01-01T00:00:00.000Z');

  useEffect(() => {
    parentAPI.getChildren().then(r => {
      setChildren(r.data);
      if (r.data.length > 0) setSelectedChild(r.data[0].student_id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadTabData = useCallback(async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      if (activeTab === 'overview' || activeTab === 'academics') {
        const r = await parentAPI.getAcademics(selectedChild);
        setAcademics(r.data);
      }
      if (activeTab === 'overview' || activeTab === 'attendance') {
        const r = await parentAPI.getAttendance(selectedChild);
        setAttendance(r.data);
      }
      if (activeTab === 'timetable') {
        const r = await parentAPI.getTimetable(selectedChild);
        setTimetable(r.data);
      }
      if (activeTab === 'leaves') {
        const r = await parentAPI.getLeaves(selectedChild);
        setLeaves(r.data);
      }
      if (activeTab === 'grievances') {
        const r = await grievanceAPI.getMine();
        setGrievances(r.data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [selectedChild, activeTab]);

  useEffect(() => { loadTabData(); }, [loadTabData]);

  const currentChild = children.find(c => c.student_id === selectedChild);
  const overallAtt = attendance.length > 0
    ? (attendance.reduce((s, a) => s + a.present_count, 0) / Math.max(attendance.reduce((s, a) => s + a.total_count, 0), 1) * 100).toFixed(1)
    : 0;
  const latestCGPA = academics?.semester_grades?.length > 0
    ? academics.semester_grades[academics.semester_grades.length - 1].cgpa
    : null;

  /* ── Derived Notifications ─────────────────────── */
  const notifications = React.useMemo(() => {
    const items = [];
    const now = new Date().toISOString();
    // Attendance alerts
    attendance.filter(a => a.percentage < 75).forEach(a => {
      items.push({ type: 'warning', title: `Low attendance: ${a.subject_code}`, subtitle: `${a.percentage}% — below 75% threshold`, timestamp: now });
    });
    // Leave status updates
    leaves.filter(l => l.status === 'approved' || l.status === 'rejected').forEach(l => {
      items.push({ type: l.status === 'approved' ? 'success' : 'error', title: `Leave ${l.status}`, subtitle: `${l.leave_type} (${l.from_date} → ${l.to_date})`, timestamp: l.updated_at || l.created_at || now });
    });
    // Grievance responses
    grievances.filter(g => g.status === 'resolved' || g.status === 'in_review').forEach(g => {
      items.push({ type: g.status === 'resolved' ? 'success' : 'info', title: `Grievance ${g.status.replace('_', ' ')}`, subtitle: g.subject, timestamp: g.updated_at || g.created_at || now });
    });
    // Overall attendance warning
    if (overallAtt > 0 && overallAtt < 80) {
      items.push({ type: 'warning', title: `Overall attendance: ${overallAtt}%`, subtitle: 'Below 80% threshold — action needed', timestamp: now });
    }
    return items;
  }, [attendance, leaves, grievances, overallAtt]);

  const unreadCount = notifications.filter(n => new Date(n.timestamp) > new Date(lastReadTime)).length;

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && notifications.length > 0) {
      const latestTs = new Date().toISOString();
      setLastReadTime(latestTs);
      localStorage.setItem(notifKey, latestTs);
    }
  };

  const submitGrievance = async () => {
    if (!grievanceForm.subject || !grievanceForm.description) return;
    await grievanceAPI.submit(grievanceForm);
    setGrievanceForm({ category: 'academic', subject: '', description: '' });
    loadTabData();
  };

  const openProgressReport = () => {
    if (!selectedChild) return;
    const token = localStorage.getItem('auth_token');
    window.open(`${API_URL}/api/parent/children/${selectedChild}/progress-report?token=${token}`, '_blank');
  };

  if (loading && children.length === 0) return <DashboardSkeleton />;

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
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors"
                >
                  Mark all as read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-white/5">
                {(!notifications || notifications.length === 0) ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No new notifications.</div>
                ) : (
                  notifications.slice(0, 8).map((item, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        item.type === 'warning' ? 'bg-amber-50 dark:bg-amber-500/15' :
                        item.type === 'error' ? 'bg-red-50 dark:bg-red-500/15' :
                        item.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/15' :
                        'bg-blue-50 dark:bg-blue-500/15'
                      }`}>
                        {item.type === 'warning' ? <Warning size={14} weight="duotone" className="text-amber-500" /> :
                         item.type === 'error' ? <XCircle size={14} weight="duotone" className="text-red-500" /> :
                         item.type === 'success' ? <CheckCircle size={14} weight="duotone" className="text-emerald-500" /> :
                         <Bell size={14} weight="duotone" className="text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Header ──────────────────────────── */}
      <header className="glass-header">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center">
              <Users size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">AcadMix</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Parent</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Child Selector */}
            {children.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setChildDropdown(!childDropdown)}
                  className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-sm font-bold text-slate-700 dark:text-slate-200"
                >
                  <GraduationCap size={16} weight="duotone" className="text-cyan-500" />
                  {currentChild?.name?.split(' ')[0] || 'Select'}
                  <CaretDown size={14} weight="bold" className="text-slate-400" />
                </button>
                <AnimatePresence>
                  {childDropdown && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setChildDropdown(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="absolute right-0 top-full mt-2 z-[61] w-56 bg-white dark:bg-[#1A202C] rounded-xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden"
                      >
                        {children.map(c => (
                          <button
                            key={c.student_id}
                            onClick={() => { setSelectedChild(c.student_id); setChildDropdown(false); }}
                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${
                              selectedChild === c.student_id ? 'bg-cyan-50 dark:bg-cyan-500/10' : ''
                            }`}
                          >
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{c.name}</p>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">{c.relationship} • {c.profile?.department || ''}</p>
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
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

            {/* User Pill */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-white/5 rounded-2xl px-4 py-2">
              <UserCircle size={18} weight="duotone" className="text-cyan-500" />
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user?.name}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parent</p>
              </div>
            </div>

            {/* Logout */}
            <button onClick={onLogout} className="p-2.5 rounded-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 transition-colors" aria-label="Sign out">
              <SignOut size={20} weight="duotone" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ── Hero: Child Info ────────────────────── */}
        {currentChild && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mb-6 sm:mb-8"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
              <span className="gradient-text">{currentChild.name}</span>
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {currentChild.profile?.department || ''} • Batch {currentChild.profile?.batch || ''} • Section {currentChild.profile?.section || ''} • <span className="capitalize">{currentChild.relationship}</span>
            </p>
          </motion.div>
        )}

        {/* ── Tabs ────────────────────────── */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-8 hide-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-[14px] text-xs font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-[#1A202C] text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                <tab.icon size={14} weight={activeTab === tab.id ? 'fill' : 'duotone'} />
                {tab.label}
              </button>
            ))}
          </div>

        {loading ? <DashboardSkeleton /> : (
          <>
            {/* ═══════ OVERVIEW ═══════ */}
            {activeTab === 'overview' && (
              <motion.div variants={containerVariants} initial="hidden" animate="show">
                {/* Stat Cards */}
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                  {[
                    { label: 'Attendance', value: `${overallAtt}%`, sub: overallAtt < 80 ? '⚠️ Below threshold' : 'On track', icon: ClockCountdown, color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', valueColor: overallAtt >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
                    { label: 'Current CGPA', value: latestCGPA?.toFixed(1) || '-', sub: `${academics?.semester_grades?.length || 0} semesters`, icon: GraduationCap, color: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
                    { label: 'Subjects', value: attendance.length || 0, sub: 'this semester', icon: BookOpen, color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                    { label: 'Leave Requests', value: leaves.length || 0, sub: 'total', icon: CalendarDots, color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div key={i} variants={itemVariants} whileHover={cardHover} className="soft-card-hover p-4 sm:p-6 relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{stat.label}</span>
                          <div className={`${stat.color} p-2 sm:p-2.5 rounded-xl`}><Icon size={18} weight="duotone" /></div>
                        </div>
                        <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${stat.valueColor || 'text-slate-900 dark:text-white'}`}>{stat.value}</p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{stat.sub}</p>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* Attendance warnings */}
                {attendance.filter(a => a.percentage < 75).length > 0 && (
                  <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6 mb-6 sm:mb-8 border-l-4 border-red-400">
                    <div className="flex items-center gap-2 mb-3">
                      <Warning size={20} weight="duotone" className="text-red-500" />
                      <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Attendance Alerts</h3>
                    </div>
                    <div className="space-y-2">
                      {attendance.filter(a => a.percentage < 75).map((a, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-500/5">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{a.subject_code}</span>
                          <span className="text-sm font-extrabold text-red-600 dark:text-red-400">{a.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Grade progression */}
                {academics?.semester_grades?.length > 0 && (
                  <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ChartBar size={20} weight="duotone" className="text-indigo-500" />
                      <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Grade Progression</h3>
                    </div>
                    <div className="flex items-end gap-3 h-32">
                      {academics.semester_grades.map((g, i) => {
                        const height = g.sgpa ? Math.max(g.sgpa * 10, 5) : 5;
                        return (
                          <div key={i} className="flex flex-col items-center gap-1 flex-1">
                            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">{g.sgpa || '-'}</span>
                            <div
                              className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-purple-500 transition-all duration-500"
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">S{g.semester}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ═══════ ACADEMICS ═══════ */}
            {activeTab === 'academics' && (
              <motion.div variants={containerVariants} initial="hidden" animate="show">
                {/* Download button */}
                <motion.div variants={itemVariants} className="flex justify-end mb-4">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={openProgressReport}
                    className="btn-primary !px-5 !py-2.5 text-sm flex items-center gap-2"
                  >
                    <Download size={16} weight="bold" />
                    Download Progress Report
                  </motion.button>
                </motion.div>

                {/* Semester Grades */}
                <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap size={20} weight="duotone" className="text-indigo-500" />
                    <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Semester Grades</h3>
                  </div>
                  {academics?.semester_grades?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-white/10">
                            {['Semester', 'Year', 'SGPA', 'CGPA', 'Credits', 'Arrears'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {academics.semester_grades.map((g, i) => (
                            <tr key={i} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">Semester {g.semester}</td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{g.academic_year}</td>
                              <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">{g.sgpa || '-'}</td>
                              <td className="px-4 py-3 font-extrabold text-indigo-600 dark:text-indigo-400">{g.cgpa || '-'}</td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{g.earned_credits || 0}/{g.total_credits || 0}</td>
                              <td className="px-4 py-3">
                                <span className={`text-sm font-extrabold ${g.arrear_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  {g.arrear_count || 0}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 py-8">No grade data available yet</p>
                  )}
                </motion.div>

                {/* Current Registrations */}
                <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen size={20} weight="duotone" className="text-teal-500" />
                    <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Current Registrations</h3>
                  </div>
                  {academics?.current_registrations?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {academics.current_registrations.map((r, i) => (
                        <motion.div key={i} whileHover={cardHover} className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{r.subject_name || r.subject_code}</p>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{r.subject_code} • Sem {r.semester}</p>
                          <span className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${statusColor(r.status)}`}>
                            {r.status}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 py-8">No registrations found</p>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ═══════ ATTENDANCE ═══════ */}
            {activeTab === 'attendance' && (
              <motion.div variants={containerVariants} initial="hidden" animate="show">
                <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ClockCountdown size={20} weight="duotone" className="text-emerald-500" />
                    <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Subject-wise Attendance</h3>
                  </div>
                  {attendance.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-white/10">
                              {['Subject', 'Present', 'Total', 'Percentage'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {attendance.map((a, i) => (
                              <tr key={i} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{a.subject_code}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.present_count}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.total_count}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-extrabold ${
                                    a.percentage >= 75 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                                  }`}>
                                    {a.percentage}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className={`mt-4 p-4 rounded-xl text-center ${
                        overallAtt >= 75 ? 'bg-emerald-50 dark:bg-emerald-500/5' : 'bg-red-50 dark:bg-red-500/5'
                      }`}>
                        <span className={`text-sm font-extrabold ${overallAtt >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          Overall Attendance: {overallAtt}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 py-8">No attendance data available</p>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ═══════ TIMETABLE ═══════ */}
            {activeTab === 'timetable' && (
              <motion.div variants={containerVariants} initial="hidden" animate="show">
                <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Chalkboard size={20} weight="duotone" className="text-purple-500" />
                    <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Weekly Timetable</h3>
                  </div>
                  {timetable.length > 0 ? (() => {
                    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                    const byDay = {};
                    days.forEach(d => { byDay[d] = []; });
                    timetable.forEach(s => { if (byDay[s.day]) byDay[s.day].push(s); });
                    Object.values(byDay).forEach(arr => arr.sort((a, b) => a.period_no - b.period_no));
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {days.map(day => (
                          <div key={day} className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-3">
                            <div className="text-center mb-3">
                              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{day}</span>
                            </div>
                            {byDay[day].length > 0 ? byDay[day].map((s, i) => (
                              <motion.div key={i} whileHover={{ scale: 1.02 }} className="p-2.5 rounded-lg bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 mb-2">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{s.subject_name || s.subject_code}</p>
                                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{s.start_time} - {s.end_time}</p>
                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">{s.faculty_name}</p>
                              </motion.div>
                            )) : (
                              <p className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 py-4">No classes</p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })() : (
                    <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 py-8">No timetable data available</p>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ═══════ LEAVES ═══════ */}
            {activeTab === 'leaves' && (
              <motion.div variants={containerVariants} initial="hidden" animate="show">
                <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarDots size={20} weight="duotone" className="text-amber-500" />
                    <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Leave History</h3>
                  </div>
                  {leaves.length > 0 ? (
                    <div className="space-y-3">
                      {leaves.map((l, i) => (
                        <motion.div key={i} variants={itemVariants} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              l.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-500/10' : l.status === 'rejected' ? 'bg-red-50 dark:bg-red-500/10' : 'bg-amber-50 dark:bg-amber-500/10'
                            }`}>
                              {l.status === 'approved' ? <CheckCircle size={20} weight="duotone" className="text-emerald-500" /> :
                               l.status === 'rejected' ? <XCircle size={20} weight="duotone" className="text-red-500" /> :
                               <Clock size={20} weight="duotone" className="text-amber-500" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">{l.leave_type}</p>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{l.from_date} → {l.to_date}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]">{l.reason}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${statusColor(l.status)}`}>
                            {l.status}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 py-8">No leave records found</p>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ═══════ GRIEVANCES ═══════ */}
            {activeTab === 'grievances' && (
              <motion.div variants={containerVariants} initial="hidden" animate="show">
                {/* Submit Form */}
                <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText size={20} weight="duotone" className="text-cyan-500" />
                    <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Submit a Grievance</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <select
                      value={grievanceForm.category}
                      onChange={e => setGrievanceForm({ ...grievanceForm, category: e.target.value })}
                      className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="academic">Academic</option>
                      <option value="administrative">Administrative</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      placeholder="Subject"
                      value={grievanceForm.subject}
                      onChange={e => setGrievanceForm({ ...grievanceForm, subject: e.target.value })}
                      className="sm:col-span-2 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <textarea
                    placeholder="Describe your grievance in detail..."
                    rows={3}
                    value={grievanceForm.description}
                    onChange={e => setGrievanceForm({ ...grievanceForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-vertical"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={submitGrievance}
                    className="btn-primary !px-6 !py-2.5 text-sm mt-3"
                  >
                    Submit Grievance
                  </motion.button>
                </motion.div>

                {/* My Grievances */}
                <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ChatCircleDots size={20} weight="duotone" className="text-purple-500" />
                    <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">My Grievances</h3>
                  </div>
                  {grievances.length > 0 ? (
                    <div className="space-y-3">
                      {grievances.map((g, i) => (
                        <motion.div key={i} variants={itemVariants} className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{g.subject}</p>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg flex-shrink-0 ml-3 ${statusColor(g.status)}`}>
                              {g.status}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{g.description}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            {g.category} • {g.created_at ? new Date(g.created_at).toLocaleDateString() : ''}
                          </p>
                          {g.resolution_notes && (
                            <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
                              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                <CheckCircle size={12} weight="fill" className="inline mr-1" />
                                Resolution: {g.resolution_notes}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 py-8">No grievances submitted yet</p>
                  )}
                </motion.div>
              </motion.div>
            )}
          </>
        )}
        <AnimatePresence>
        {showProfile && <UserProfileModal user={user} onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
    </div>
    </div>
  );
};

export default ParentDashboard;

