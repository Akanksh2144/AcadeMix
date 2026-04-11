import React, { useState, useEffect } from 'react';
import UserProfileModal from '../components/UserProfileModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { 
  SignOut, Sun, Moon, Buildings, Handshake, Briefcase, 
  ChalkboardTeacher, ProjectorScreenChart, Star, 
  MapPin, Globe, EnvelopeSimple, Phone, CalendarBlank, ChartBar, Bell, UserCircle 
} from '@phosphor-icons/react';
import { industryAPI, authAPI, setAuthToken } from '../services/api';
import DashboardSkeleton from '../components/DashboardSkeleton';

const fadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function IndustryDashboard({ navigate, user, onLogout }) {
  const { isDark, toggle: toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [showProfile, setShowProfile] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = 0; // Placeholder for future notification fetching

  // Example data pieces
  const [mous, setMous] = useState([]);
  const [projects, setProjects] = useState([]);
  const [drives, setDrives] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, mousRes, projRes] = await Promise.all([
        industryAPI.getDashboard(),
        industryAPI.getMOUs(),
        industryAPI.getProjects()
      ]);
      setDashboardData(dashRes.data);
      setMous(mousRes.data);
      setProjects(projRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const navItems = [
    { id: 'overview', icon: ChartBar, label: 'Overview' },
    { id: 'mous', icon: Handshake, label: 'MOUs' },
    { id: 'recruitment', icon: Briefcase, label: 'Recruitment Drives' },
    { id: 'projects', icon: ProjectorScreenChart, label: 'Collab Projects' },
    { id: 'feedback', icon: Star, label: 'Feedback & NAAC' },
  ];

  if (loading) return <DashboardSkeleton variant="admin" />;

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
                 <div className="p-8 text-center text-slate-500 text-sm">No new notifications.</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Header ──────────────────────────── */}
      <header className="glass-header">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Buildings weight="duotone" className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Industry Portal</h1>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {user.profile_data?.company_name || 'Partner Company'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
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
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
            >
              {isDark ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
            </motion.button>
            {/* Logout */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="p-2.5 rounded-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 transition-colors"
            >
              <SignOut size={20} weight="duotone" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Profile Card */}
        <motion.div 
          initial="hidden" animate="visible" variants={fadeIn}
          className="soft-card mb-8 p-6 flex flex-col md:flex-row items-center gap-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <Buildings size={40} className="text-indigo-600 dark:text-indigo-400" weight="duotone" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              {user.profile_data?.company_name || user.name}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><Globe size={16} /> {user.company?.sector || 'Industry Partner'}</span>
              <span className="flex items-center gap-1.5"><EnvelopeSimple size={16} /> {user.email}</span>
            </div>
          </div>
          <div className="flex-shrink-0 text-center md:text-right">
            <span className="inline-block px-4 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-bold border border-emerald-100 dark:border-emerald-500/20">
              Active Partner
            </span>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-8 hide-scrollbar">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === item.id 
                  ? 'bg-white dark:bg-[#1A202C] text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              <item.icon size={18} weight={activeTab === item.id ? 'fill' : 'duotone'} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Active MOUs", value: dashboardData?.active_mous || 0, icon: Handshake, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10", border: 'border-blue-100 dark:border-blue-500/20' },
                  { label: "Open Drives", value: dashboardData?.drives_requested || 0, icon: Briefcase, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: 'border-emerald-100 dark:border-emerald-500/20' },
                  { label: "Collab Projects", value: dashboardData?.active_projects || 0, icon: ProjectorScreenChart, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10", border: 'border-purple-100 dark:border-purple-500/20' }
                ].map((stat, i) => (
                  <motion.div key={i} variants={fadeIn} className={`soft-card p-6 border-b-4 ${stat.border}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">{stat.value}</h3>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg}`}>
                        <stat.icon size={24} weight="duotone" className={stat.color} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* MOUs TAB */}
            {activeTab === 'mous' && (
              <motion.div variants={fadeIn} className="soft-card p-0 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Active Memorandums</h3>
                    <p className="text-sm text-slate-500">Manage your institutional agreements</p>
                  </div>
                  <button className="btn-primary">Register New MOU</button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/10">
                  {mous.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No MOUs found.</div>
                  ) : mous.map(mou => (
                    <div key={mou.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">{mou.purpose}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Valid until: {mou.valid_until}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${mou.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {mou.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* OTHER TABS OMITTED FOR BREVITY, USING PLACEHOLDERS */}
            {(activeTab === 'recruitment' || activeTab === 'projects' || activeTab === 'feedback') && (
              <motion.div variants={fadeIn} className="soft-card p-12 text-center">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Star size={32} weight="duotone" className="text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Module Under Development</h3>
                <p className="text-slate-500">The full interactive workflow for this section is being deployed.</p>
              </motion.div>
            )}

          </motion.div>
        </AnimatePresence>
        
      </main>
    </div>
  );
}

