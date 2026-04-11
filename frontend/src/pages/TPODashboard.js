import React, { useState, useEffect } from 'react';
import UserProfileModal from '../components/UserProfileModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Buildings, Briefcase, FileText, ChartLineUp, SignOut, DownloadSimple, Users, Trophy, Plus, Sun, Moon, Bell, Info, BookOpen, UserCircle } from '@phosphor-icons/react';
import { tpoAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import DashboardSkeleton from '../components/DashboardSkeleton';

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

// ─── Overview Tab ──────────────────────────────────────────────
const OverviewContent = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tpoAPI.getStats().then(res => { setStats(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton variant="tpo" />;

  const metrics = [
    { label: 'Total Students', value: stats?.total_students || 0, icon: Users, color: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500' },
    { label: 'Companies Visited', value: stats?.companies_visited || 0, icon: Buildings, color: 'bg-sky-50 dark:bg-sky-500/15 text-sky-500' },
    { label: 'Students Placed', value: stats?.students_placed || 0, icon: Trophy, color: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500' },
    { label: 'Highest CTC', value: (stats?.highest_package || 0) + ' LPA', icon: ChartLineUp, color: 'bg-amber-50 dark:bg-amber-500/15 text-amber-500' },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div variants={itemVariants} whileHover={cardHover} key={i} className="stat-card">
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
        <motion.div variants={itemVariants} className="soft-card p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <h4 className="font-extrabold text-xl mb-3">Placement Season</h4>
          <div className="space-y-2 text-sm font-medium text-white/90">
            <p>{stats?.total_drives || 0} drives conducted</p>
            <p>{stats?.students_placed || 0} students placed</p>
            <p>Avg CTC: {stats?.avg_package || 0} LPA</p>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="soft-card p-6 bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <h4 className="font-extrabold text-xl mb-3">Top Recruiter</h4>
          <p className="text-3xl font-extrabold mb-2">{stats?.top_company || '—'}</p>
          <p className="text-sm font-medium text-white/90">Highest offers this season</p>
        </motion.div>
        <motion.div variants={itemVariants} whileHover={cardHover} className="soft-card-hover p-6 flex items-center gap-4 group cursor-pointer">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/15 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <DownloadSimple size={24} weight="duotone" className="text-amber-500" />
          </div>
          <div>
            <p className="font-extrabold text-slate-900 dark:text-white">Export NAAC Report</p>
            <p className="text-sm font-medium text-slate-400">Download placement data as Excel</p>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// ─── Companies Tab ─────────────────────────────────────────────
const CompaniesContent = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tpoAPI.getCompanies().then(res => { setCompanies(res.data.data || res.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton variant="content-cards" />;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Company Directory</h3>
        <button className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors">
          <Plus size={18} weight="bold" /> Add Company
        </button>
      </motion.div>

      {companies.length === 0 ? (
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Buildings size={36} weight="duotone" className="text-slate-400" />
          </div>
          <h4 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">No companies registered yet</h4>
          <p className="text-sm text-slate-400">Add your first recruiting company to get started.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.map((c, i) => (
            <motion.div variants={itemVariants} whileHover={cardHover} key={c.id} className="soft-card p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Buildings size={24} weight="duotone" className="text-indigo-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-lg text-slate-900 dark:text-white truncate">{c.name}</h4>
                  <p className="text-sm font-medium text-slate-400 mt-0.5">{c.industry || 'Technology'}</p>
                  {c.website && <p className="text-xs text-indigo-500 mt-1 truncate">{c.website}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ─── Drives Tab ────────────────────────────────────────────────
const DrivesContent = () => {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tpoAPI.getDrives().then(res => { setDrives(res.data.data || res.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton variant="content-list" />;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Placement Drives</h3>
        <button className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors">
          <Plus size={18} weight="bold" /> Create Drive
        </button>
      </motion.div>

      {drives.length === 0 ? (
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase size={36} weight="duotone" className="text-slate-400" />
          </div>
          <h4 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">No active placement drives</h4>
          <p className="text-sm text-slate-400">Create your first drive to start the placement process.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {drives.map((d, i) => (
            <motion.div variants={itemVariants} whileHover={cardHover} key={d.id} className="soft-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/15 rounded-xl flex items-center justify-center">
                    <Briefcase size={24} weight="duotone" className="text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">{d.role || 'Role TBD'}</h4>
                    <p className="text-sm font-medium text-slate-400">{d.location || 'Location TBD'} • ₹{d.package_lpa || '—'} LPA</p>
                  </div>
                </div>
                <span className={`soft-badge ${d.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {d.status || 'Active'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const ApplicationsContent = () => {
  const [drives, setDrives] = useState([]);
  const [selectedDrive, setSelectedDrive] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tpoAPI.getDrives().then(res => { 
        const d = res.data.data || res.data || [];
        setDrives(d);
        if (d.length > 0) setSelectedDrive(d[0].id);
        setLoading(false); 
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
      if (selectedDrive) {
          tpoAPI.getApplicants(selectedDrive).then(res => setApplicants(res.data.data || res.data || []));
      }
  }, [selectedDrive]);

  if (loading) return <DashboardSkeleton variant="content-list" />;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Applicant Tracking</h3>
        <select value={selectedDrive} onChange={e => setSelectedDrive(e.target.value)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none">
             {drives.length === 0 && <option value="">No Drives Available</option>}
             {drives.map(d => <option key={d.id} value={d.id}>{d.role} (₹{d.package_lpa} LPA)</option>)}
        </select>
      </motion.div>

      {applicants.length === 0 ? (
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={36} weight="duotone" className="text-slate-400" />
          </div>
          <h4 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">Select a placement drive</h4>
          <p className="text-sm text-slate-400">Choose an active drive to view and shortlist applicants.</p>
        </motion.div>
      ) : (
          <div className="space-y-4">
              {applicants.map(app => (
                  <motion.div variants={itemVariants} whileHover={cardHover} key={app.id} className="soft-card p-4 sm:p-6 flex items-center justify-between">
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                                  {app.student_name}
                              </h4>
                              {app.telemetry_strikes >= 3 && (
                                  <div title="Integrity Risk: Multiple external paste attempts detected" className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/20 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest border border-amber-200 dark:border-amber-500/30">
                                      🚩 <span>{app.telemetry_strikes} Strikes</span>
                                  </div>
                              )}
                          </div>
                          <p className="text-sm font-medium text-slate-400">{app.email}</p>
                      </div>
                      <span className={`soft-badge ${app.status === 'shortlisted' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500'}`}>
                          {app.status || 'applied'}
                      </span>
                  </motion.div>
              ))}
          </div>
      )}
    </motion.div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────
const TPODashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('tpo_tab') || 'overview');
  const [showProfile, setShowProfile] = useState(false);
  useEffect(() => { sessionStorage.setItem('tpo_tab', activeTab); }, [activeTab]);
  const { isDark, toggle: toggleTheme } = useTheme();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifRead, setNotifRead] = useState(false);
  const notifications = [
    { title: 'New Company Registered', desc: 'TCS has been added to the company directory.', time: 'Just now' },
    { title: 'Drive Applications Open', desc: 'Infosys drive received 45 applications.', time: '1 hour ago' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <header className="glass-header">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Briefcase size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">AcadMix</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Training & Placement</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-full bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell size={20} weight={showNotifications ? "fill" : "duotone"} />
                {!notifRead && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {notifications.length}
                  </div>
                )}
              </button>
            </div>
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
                      <button onClick={() => { setNotifRead(true); setShowNotifications(false); }} className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">Mark all as read</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-white/5">
                      {notifications.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 bg-blue-50 dark:bg-blue-500/15">
                            <Info size={14} weight="duotone" className="text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5 block">{item.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

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
            <button onClick={() => setShowProfile(true)} className="hidden sm:flex items-center gap-3 bg-slate-50 dark:bg-white/5 rounded-2xl px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer text-left border border-slate-100 dark:border-white/5">
              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                <UserCircle size={18} weight="duotone" className="text-indigo-500" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{user?.name}</p>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500 leading-tight mt-0.5">{user?.department || 'T&P'} • {user?.section || 'Placement Officer'}</p>
              </div>
            </button>

            {/* Logout */}
            <button onClick={onLogout} className="p-2.5 rounded-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 transition-colors" aria-label="Sign out">
              <SignOut size={20} weight="duotone" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">Placement Cell</h2>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400">Manage companies, drives, and student placements</p>
        </motion.div>

        {/* Tabs — matching Admin/HOD pill-style */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-8 hide-scrollbar">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'companies', label: 'Companies' },
              { id: 'drives', label: 'Placement Drives' },
              { id: 'applications', label: 'Applications' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-[#1A202C] text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && <OverviewContent key="overview" />}
          {activeTab === 'companies' && <CompaniesContent key="companies" />}
          {activeTab === 'drives' && <DrivesContent key="drives" />}
          {activeTab === 'applications' && <ApplicationsContent key="applications" />}
        </AnimatePresence>
        <AnimatePresence>
        {showProfile && <UserProfileModal user={user} onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
    </div>
    </div>
  );
};

export default TPODashboard;

