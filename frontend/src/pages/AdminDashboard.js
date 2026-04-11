import React, { useState, useEffect } from 'react';
import UserProfileModal from '../components/UserProfileModal';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Users, ChartBar, GraduationCap, SignOut, Database, Sun, Moon, Bell, Info, UserCircle } from '@phosphor-icons/react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { StudentResultsSearch } from '../components/StudentResultsSearch';
import { analyticsAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import DashboardSkeleton from '../components/DashboardSkeleton';
import AdminExpertManagement from '../components/admin/AdminExpertManagement';
import { Toaster, toast } from 'sonner';

import UserPermissionsManager from '../components/admin/UserPermissionsManager';
import CIATemplateBuilder from '../components/admin/CIATemplateBuilder';
import AdminFinanceModule from '../components/admin/AdminFinanceModule';

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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl dark:bg-[#1A202C] p-3 shadow-lg border border-slate-100 dark:border-slate-700">
        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{label}</p>
        {payload.map((p, i) => (<p key={i} className="text-sm font-medium" style={{ color: p.color }}>{p.name}: {p.value}</p>))}
      </div>
    );
  }
  return null;
};

const AdminDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('admin_tab') || 'overview');
  const [showProfile, setShowProfile] = useState(false);
  useEffect(() => { sessionStorage.setItem('admin_tab', activeTab); }, [activeTab]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDark, toggle: toggleTheme } = useTheme();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifRead, setNotifRead] = useState(false);
  const notifications = [
    { title: 'System Security Updated', desc: 'New schemas applied for isolated partitions.', time: 'Just now' },
    { title: 'New Registration Settings', desc: 'Sections schema applied via alembic.', time: '2 hours ago' }
  ];

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await analyticsAPI.adminDashboard();
        setDashboardData(data);
      } catch (err) { console.error('Failed to load admin dashboard:', err); }
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  const totalStudents = dashboardData?.total_students || 0;
  const totalTeachers = (dashboardData?.total_teachers || 0) + (dashboardData?.total_hods || 0);
  const activeQuizzes = dashboardData?.active_quizzes || 0;
  const deptCount = dashboardData?.departments?.length || 0;

  const stats = [
    { label: 'Total Students', value: totalStudents.toLocaleString(), icon: Users, color: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500' },
    { label: 'Total Teachers', value: totalTeachers.toLocaleString(), icon: GraduationCap, color: 'bg-emerald-50 text-emerald-500' },
    { label: 'Departments', value: deptCount.toLocaleString(), icon: Database, color: 'bg-sky-50 text-sky-500' },
  ];
  const departmentPerformance = (dashboardData?.departments || []).map(d => ({
    dept: d.name, avgScore: 75 + Math.floor(d.count * 2)
  }));
  const enrollmentTrend = [
    { month: 'Aug', students: Math.max(totalStudents - 5, 0) }, { month: 'Sep', students: Math.max(totalStudents - 4, 0) },
    { month: 'Oct', students: Math.max(totalStudents - 3, 0) }, { month: 'Nov', students: Math.max(totalStudents - 2, 0) },
    { month: 'Dec', students: Math.max(totalStudents - 1, 0) }, { month: 'Jan', students: totalStudents },
  ];

  if (loading) return <DashboardSkeleton variant="admin" />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <Toaster position="top-right" richColors />
      <header className="glass-header">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center"><BookOpen size={22} weight="duotone" className="text-white" /></div>
              <div><h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">AcadMix</h1><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Admin</p></div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className="relative p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                aria-label="Notifications"
                data-testid="notification-bell"
              >
                <Bell size={20} weight={showNotifications ? "fill" : "duotone"} />
                {!notifRead && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {notifications.length}
                  </div>
                )}
              </button>
                      {activeTab === 'experts' && (
          <motion.div data-testid="experts-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <AdminExpertManagement />
            </motion.div>
          </motion.div>
        )}
        <AnimatePresence>
                {showNotifications && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[60]"
                      onClick={() => setShowNotifications(false)}
                    ></motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute top-20 right-4 sm:right-8 z-[61] w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 dark:bg-[#1A202C] dark:border-white/[0.06] overflow-hidden"
                    >
                      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col items-start gap-2">
                        <div className="flex w-full items-center justify-between">
                          <h4 className="font-extrabold text-slate-800 dark:text-slate-100">System Notifications</h4>
                          <button onClick={() => { setNotifRead(true); setShowNotifications(false); }} className="text-xs font-bold text-amber-500 hover:text-amber-600 transition-colors">Mark all as read</button>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                        {notifications.map((item, i) => (
                          <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors cursor-pointer text-left">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 bg-amber-50">
                              <Info size={14} weight="duotone" className="text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{item.desc}</p>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2 block">{item.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleTheme}
                className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                aria-label="Toggle theme"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={isDark ? 'dark' : 'light'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    {isDark ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
                  </motion.div>
                </AnimatePresence>
              </motion.button>
              <button onClick={() => setShowProfile(true)} className="hidden sm:flex items-center gap-3 bg-slate-50 dark:bg-white/5 rounded-2xl px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer text-left border border-slate-100 dark:border-white/5">
              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                <UserCircle size={18} weight="duotone" className="text-indigo-500" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{user?.name}</p>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500 leading-tight mt-0.5">{user?.department || 'Admin'} • {user?.role === 'admin' ? 'Administrator' : user?.role}</p>
              </div>
            </button>
              <button data-testid="logout-button" onClick={onLogout} className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors" aria-label="Sign out"><SignOut size={20} weight="duotone" /></button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">College Overview</h2>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400">Manage your institution's academic platform</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-8 hide-scrollbar">
            {[
              { id: 'overview', label: 'Overview' }, 
              { id: 'metrics', label: 'Metrics' },
              { id: 'student-profiles', label: 'Student Profiles' },
              { id: 'results', label: 'Student Results' },
              { id: 'finance', label: 'Fee Invoicing' },
              { id: 'permissions', label: 'Permission Matrix' },
              { id: 'cia-builder', label: 'CIA Engine' },
              { id: 'experts', label: 'Expert Management' }
            ].map(tab => (
              <button 
                key={tab.id} 
                data-testid={`tab-${tab.id}`} 
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-[#1A202C] text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        {activeTab === 'overview' && (
          <motion.div data-testid="overview-content" variants={containerVariants} initial="hidden" animate="show">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div variants={itemVariants} whileHover={cardHover} key={i} className="stat-card" data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
                      <div className={`${stat.color} p-2.5 rounded-xl`}><Icon size={20} weight="duotone" /></div>
                    </div>
                    <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{stat.value}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <motion.button variants={itemVariants} whileHover={cardHover} data-testid="user-management-button" onClick={() => navigate('user-management')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/15 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/30 transition-colors"><Users size={24} weight="duotone" className="text-indigo-500" /></div>
                <div><p className="font-extrabold text-slate-900 dark:text-white">Manage</p><p className="text-sm font-medium text-slate-400">Students, Faculty & Depts</p></div>
              </motion.button>
              <motion.button variants={itemVariants} whileHover={cardHover} data-testid="student-results-button" onClick={() => setActiveTab('results')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
                <div className="w-12 h-12 bg-violet-50 dark:bg-violet-500/15 rounded-xl flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-500/30 transition-colors"><GraduationCap size={24} weight="duotone" className="text-violet-500" /></div>
                <div><p className="font-extrabold text-slate-900 dark:text-white">Student Results</p><p className="text-sm font-medium text-slate-400">Search & view profiles</p></div>
              </motion.button>
              <motion.button variants={itemVariants} whileHover={cardHover} data-testid="analytics-button" onClick={() => navigate('analytics')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/15 rounded-xl flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-500/30 transition-colors"><Database size={24} weight="duotone" className="text-amber-500" /></div>
                <div><p className="font-extrabold text-slate-900 dark:text-white">Analytics</p><p className="text-sm font-medium text-slate-400">Insights & trends</p></div>
              </motion.button>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Department Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="dept" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />
                    <Bar dataKey="avgScore" fill="#6366F1" radius={[8, 8, 0, 0]} name="Avg Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Student Enrollment Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={enrollmentTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="students" stroke="#14B8A6" strokeWidth={3} dot={{ fill: '#14B8A6', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {[{ action: 'New quiz created', user: 'Dr. Sarah Johnson', time: '10 mins ago' },
                    { action: '42 students completed quiz', user: 'DBMS - Normalization', time: '25 mins ago' },
                    { action: 'Semester results uploaded', user: 'Admin', time: '1 hour ago' },
                    { action: '8 new students added', user: 'Admin', time: '2 hours ago' }].map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl" data-testid={`activity-${i}`}>
                      <div><p className="font-bold text-sm text-slate-800 dark:text-slate-100">{a.action}</p><p className="text-xs font-medium text-slate-400">{a.user}</p></div>
                      <span className="text-xs font-medium text-slate-400">{a.time}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="soft-card p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <h4 className="font-extrabold text-xl mb-3">This Month</h4>
                  <div className="space-y-2 text-sm font-medium text-white/90">
                    <p>125 quizzes conducted</p><p>1,248 active students</p><p>College avg: 82.5%</p><p>8 new faculty joined</p>
                  </div>
                </div>
                <div className="soft-card p-6 bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                  <h4 className="font-extrabold text-xl mb-3">Top Department</h4>
                  <p className="text-3xl font-extrabold mb-2">CSE</p>
                  <p className="text-sm font-medium text-white/90">Average Score: 85%</p>
                  <p className="text-sm font-medium text-white/90">320 Students</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}



        {activeTab === 'department-metrics' && (
          <motion.div data-testid="department-metrics-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.h3 variants={itemVariants} className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Department-wise Performance Metrics</motion.h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { name: 'DS', students: 180, avg: 85.2, pass: 92, color: 'indigo' },
                { name: 'CS', students: 165, avg: 83.7, pass: 89, color: 'emerald' },
                { name: 'ET', students: 145, avg: 81.5, pass: 87, color: 'amber' },
                { name: 'AIML', students: 125, avg: 86.1, pass: 93, color: 'purple' }
              ].map((dept) => (
                <motion.div variants={itemVariants} whileHover={cardHover} key={dept.name} className="soft-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{dept.name}</h4>
                    <div className={`w-10 h-10 bg-${dept.color}-100 rounded-xl flex items-center justify-center`}>
                      <span className={`text-${dept.color}-600 font-bold`}>{dept.students}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Score</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{dept.avg}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Pass Rate</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{dept.pass}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
                      <div className={`bg-${dept.color}-500 h-2 rounded-full`} style={{ width: `${dept.pass}%` }}></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <motion.div variants={itemVariants} className="soft-card p-6">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Department Performance Trend</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { month: 'Aug', DS: 82, CS: 80, ET: 78, AIML: 83 },
                  { month: 'Sep', DS: 83, CS: 81, ET: 79, AIML: 84 },
                  { month: 'Oct', DS: 84, CS: 82, ET: 80, AIML: 85 },
                  { month: 'Nov', DS: 85, CS: 83, ET: 81, AIML: 86 },
                  { month: 'Dec', DS: 85.2, CS: 83.7, ET: 81.5, AIML: 86.1 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '14px', fontWeight: '600' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px', fontWeight: '600' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '14px', fontWeight: '600' }} />
                  <Line type="monotone" dataKey="DS" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="CS" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="ET" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="AIML" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'section-metrics' && (
          <motion.div data-testid="section-metrics-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.h3 variants={itemVariants} className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Section-wise Performance Metrics</motion.h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {['DS-1', 'DS-2', 'CS-1', 'CS-2', 'AIML-1', 'AIML-2'].map((section, idx) => (
                <motion.div variants={itemVariants} whileHover={cardHover} key={section} className="soft-card p-6">
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{section}</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/15 rounded-xl text-center">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Students</p>
                      <p className="text-2xl font-extrabold text-indigo-600">{45 - idx * 2}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl text-center">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Avg Score</p>
                      <p className="text-2xl font-extrabold text-emerald-600">{85 - idx}%</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl text-center">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Pass Rate</p>
                      <p className="text-2xl font-extrabold text-amber-600">{90 - idx}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Quizzes Conducted</span>
                      <span className="font-bold text-slate-900 dark:text-white">{12 + idx}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Mid-term Avg</span>
                      <span className="font-bold text-slate-900 dark:text-white">{24 + idx}/30</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Attendance</span>
                      <span className="font-bold text-slate-900 dark:text-white">{92 - idx}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'student-profiles' && (
          <motion.div data-testid="student-profiles-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.h3 variants={itemVariants} className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Student Profiles Management</motion.h3>
            
            <motion.div variants={itemVariants} className="soft-card p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <input 
                  type="text" 
                  placeholder="Search by name, ID, or department..." 
                  className="soft-input flex-1"
                />
                <select className="soft-input w-48">
                  <option>All Departments</option>
                  <option>DS</option>
                  <option>CS</option>
                  <option>ET</option>
                  <option>AIML</option>
                </select>
                <select className="soft-input w-32">
                  <option>All Batches</option>
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                  <option>2021</option>
                </select>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">College ID</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Name</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Department</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Section</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Batch</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Avg Score</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: '22WJ8A6745', name: 'Rajesh Kumar', dept: 'DS', section: 'DS-1', batch: '2024', avg: 85.5, status: 'Active' },
                      { id: '22WJ8A6746', name: 'Priya Sharma', dept: 'DS', section: 'DS-1', batch: '2024', avg: 88.2, status: 'Active' },
                      { id: '22WJ8A6747', name: 'Amit Patel', dept: 'CS', section: 'CS-1', batch: '2024', avg: 82.7, status: 'Active' },
                      { id: '22WJ8A6748', name: 'Sneha Singh', dept: 'ET', section: 'A', batch: '2024', avg: 79.3, status: 'Active' },
                      { id: '22WJ8A6749', name: 'Rahul Verma', dept: 'AIML', section: 'AIML-1', batch: '2024', avg: 91.0, status: 'Active' }
                    ].map((student) => (
                      <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-800/50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-indigo-600">{student.id}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-100">{student.name}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">{student.dept}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">{student.section}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">{student.batch}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`soft-badge ${
                            student.avg >= 85 ? 'bg-emerald-50 text-emerald-600' :
                            student.avg >= 70 ? 'bg-amber-50 text-amber-600' :
                            'bg-red-50 text-red-600'
                          }`}>
                            {student.avg}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="soft-badge bg-emerald-50 text-emerald-600">{student.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'results' && (
          <motion.div data-testid="results-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <StudentResultsSearch user={user} departmentLocked={false} />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'permissions' && (
          <motion.div data-testid="permissions-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <UserPermissionsManager />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'cia-builder' && (
          <motion.div data-testid="cia-builder-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <CIATemplateBuilder />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'finance' && (
          <motion.div data-testid="finance-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <AdminFinanceModule collegeId={user?.college_id} />
            </motion.div>
          </motion.div>
        )}

        <AnimatePresence>
        {showProfile && <UserProfileModal user={user} onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
    </div>
    </div>
  );
};

export default AdminDashboard;

