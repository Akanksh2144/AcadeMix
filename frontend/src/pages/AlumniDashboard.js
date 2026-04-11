import React, { useState, useEffect } from 'react';
import UserProfileModal from '../components/UserProfileModal';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, GraduationCap, CalendarBlank, SignOut, Sun, Moon, Bell, Info, Medal, ChatDots, MapPin, LinkedinLogo, CheckCircle, UserCircle } from '@phosphor-icons/react';
import { alumniAPI } from '../services/api';
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
const OverviewContent = ({ profile }) => {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="md:col-span-2 soft-card p-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-extrabold mb-2">Welcome back, {profile?.name || 'Alumni'}!</h3>
            <p className="text-indigo-100 mb-6 max-w-lg">
              Your alumni network connects you with thousands of graduates. Update your profile to help students find you for mentorship, or browse the job board for new opportunities.
            </p>
            <div className="flex flex-wrap gap-4">
              <span className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur transition-colors px-4 py-2 rounded-xl text-sm font-bold cursor-pointer">
                <Briefcase size={18} /> Browse Jobs
              </span>
              <span className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur transition-colors px-4 py-2 rounded-xl text-sm font-bold cursor-pointer">
                <CalendarBlank size={18} /> Upcoming Events
              </span>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-1/4 translate-y-1/4">
            <GraduationCap size={240} weight="fill" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="soft-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-extrabold text-slate-900 dark:text-white">Profile Status</h4>
              <div className="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500 p-2 rounded-xl">
                <CheckCircle size={20} weight="fill" />
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span>Completion</span>
                <span className="text-indigo-500">85%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" />
                <span className="text-slate-600 dark:text-slate-400">Basic Information</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" />
                <span className="text-slate-600 dark:text-slate-400">Employment Details</span>
              </div>
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                <span className="text-slate-600 dark:text-slate-400">Social Links</span>
              </div>
            </div>
          </div>
          <button className="w-full mt-6 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors">
            Complete Profile
          </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants} whileHover={cardHover} className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Alumni Network</span>
            <div className="bg-blue-50 dark:bg-blue-500/15 p-2.5 rounded-xl"><User size={20} weight="duotone" className="text-blue-500" /></div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">1,245</p>
          <p className="text-xs font-medium text-slate-400 mt-2">Registered alumni</p>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={cardHover} className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Job Board</span>
            <div className="bg-amber-50 dark:bg-amber-500/15 p-2.5 rounded-xl"><Briefcase size={20} weight="duotone" className="text-amber-500" /></div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">12</p>
          <p className="text-xs font-emerald-500 font-medium mt-2 text-emerald-500">+3 new this week</p>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={cardHover} className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Mentorships</span>
            <div className="bg-rose-50 dark:bg-rose-500/15 p-2.5 rounded-xl"><ChatDots size={20} weight="duotone" className="text-rose-500" /></div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">2</p>
          <p className="text-xs font-medium text-slate-400 mt-2">Active students mentoring</p>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={cardHover} className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Achievements</span>
            <div className="bg-purple-50 dark:bg-purple-500/15 p-2.5 rounded-xl"><Medal size={20} weight="duotone" className="text-purple-500" /></div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">0</p>
          <p className="text-xs font-medium text-slate-400 mt-2">Share your success story</p>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ─── Profile Tab ───────────────────────────────────────────────
const ProfileContent = ({ profile, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  if (isEditing) {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="soft-card p-8 max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Edit Professional Profile</h3>
        <p className="text-sm text-slate-500 mb-8">This information helps students network with you and informs NAAC accreditation reports.</p>
        
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setIsEditing(false); /* API call here */ }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Graduation Year</label>
              <input type="number" defaultValue={profile?.graduation_year || ''} className="input-field" placeholder="e.g. 2024" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Industry</label>
              <input type="text" defaultValue={profile?.industry || ''} className="input-field" placeholder="e.g. Information Technology" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Current Employer</label>
              <input type="text" defaultValue={profile?.current_employer || ''} className="input-field" placeholder="Company Name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Designation</label>
              <input type="text" defaultValue={profile?.current_designation || ''} className="input-field" placeholder="Job Title" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Current Location (City, State)</label>
              <input type="text" defaultValue={profile?.current_location || ''} className="input-field" placeholder="e.g. Hyderabad, TS" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">LinkedIn URL</label>
              <input type="url" defaultValue={profile?.linkedin_url || ''} className="input-field" placeholder="https://linkedin.com/in/..." />
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsEditing(false)} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-3xl mx-auto">
      <motion.div variants={itemVariants} className="soft-card overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        <div className="px-8 pb-8 relative">
          <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-800 shadow-lg absolute -top-12 flex items-center justify-center text-4xl overflow-hidden">
             🎓
          </div>
          
          <div className="flex justify-end mt-4 mb-4">
            <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm">Edit Profile</button>
          </div>
          
          <div className="mt-8">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{profile?.name || 'Alumni'}</h2>
            <p className="text-lg font-medium text-slate-500 flex items-center gap-2 mt-1">
              <Briefcase size={20} weight="duotone" />
              {profile?.current_designation || 'Alumni'} {profile?.current_employer && `at ${profile.current_employer}`}
            </p>
            
            <div className="flex flex-wrap gap-4 mt-6">
              {profile?.current_location && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                  <MapPin size={16} /> {profile.current_location}
                </span>
              )}
              {profile?.graduation_year && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                  <GraduationCap size={16} /> Class of {profile.graduation_year}
                </span>
              )}
              {profile?.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-[#0A66C2] bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 transition-colors">
                  <LinkedinLogo size={16} weight="fill" /> LinkedIn
                </a>
              )}
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Expertise Settings</h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-700">
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white">Available for Mentorship</h5>
                <p className="text-sm text-slate-500">Allow current students to request mentorship sessions</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500"></div>
              </label>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-700 mt-3">
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white">Guest Lectures</h5>
                <p className="text-sm text-slate-500">Willing to give guest lectures to the department</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500"></div>
              </label>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Simple Placeholders for Other Tabs ────────────────────────
const JobBoardContent = () => (
  <motion.div variants={containerVariants} initial="hidden" animate="show" className="soft-card p-12 text-center max-w-4xl mx-auto">
    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
      <Briefcase size={36} weight="duotone" className="text-slate-400" />
    </div>
    <h4 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">Alumni Job Board</h4>
    <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">Post internal job referrals from your company to help current students, or browse openings posted by fellow alumni.</p>
    <button className="btn-primary">Post a Job Referral</button>
  </motion.div>
);

const MentorshipsContent = () => (
  <motion.div variants={containerVariants} initial="hidden" animate="show" className="soft-card p-12 text-center max-w-4xl mx-auto">
    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
      <ChatDots size={36} weight="duotone" className="text-slate-400" />
    </div>
    <h4 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">Student Mentorship</h4>
    <p className="text-sm text-slate-400 mb-6">You have no pending mentorship requests from students.</p>
    <p className="text-xs font-bold text-indigo-500">Ensure "Available for Mentorship" is enabled in your profile.</p>
  </motion.div>
);

const EventsContent = () => (
  <motion.div variants={containerVariants} initial="hidden" animate="show" className="soft-card p-12 text-center max-w-4xl mx-auto">
    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
      <CalendarBlank size={36} weight="duotone" className="text-slate-400" />
    </div>
    <h4 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">Upcoming Events</h4>
    <p className="text-sm text-slate-400 text-center">There are no upcoming alumni events or reunions scheduled at the moment.</p>
  </motion.div>
);

// ─── Main Dashboard ────────────────────────────────────────────
const AlumniDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('alumni_tab') || 'overview');
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { isDark, toggle: toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => { 
    sessionStorage.setItem('alumni_tab', activeTab); 
  }, [activeTab]);

  useEffect(() => {
    alumniAPI.getProfile()
      .then(res => {
        setProfileData({ ...res.data.profile, name: res.data.name });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <DashboardSkeleton variant="admin" />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <header className="glass-header">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center"><GraduationCap size={22} weight="fill" className="text-white" /></div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">AcadMix</h1>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Alumni Network</p>
              </div>
            </div>
            
            {/* Right side controls matching styling from other dashboards */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} weight={showNotifications ? "fill" : "duotone"} />
              </button>
              
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
              </button>
              
              <span className="btn-ghost !px-4 !py-2 text-sm">{profileData?.name || 'Alumni'}</span>
              <button onClick={onLogout} className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors" aria-label="Sign out">
                <SignOut size={20} weight="duotone" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">Alumni Center</h2>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400">Connect, mentor, and explore opportunities</p>
        </motion.div>

        {/* Tab Navigation consistent with all Dashboards */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-8 hide-scrollbar">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'profile', label: 'My Profile' },
              { id: 'jobs', label: 'Job Board' },
              { id: 'mentorship', label: 'Mentorships' },
              { id: 'events', label: 'Events' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-[#1A202C] text-pink-600 dark:text-pink-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        {/* Tab Content Router */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && <OverviewContent key="overview" profile={profileData} />}
          {activeTab === 'profile' && <ProfileContent key="profile" profile={profileData} onUpdate={setProfileData} />}
          {activeTab === 'jobs' && <JobBoardContent key="jobs" />}
          {activeTab === 'mentorship' && <MentorshipsContent key="mentorship" />}
          {activeTab === 'events' && <EventsContent key="events" />}
        </AnimatePresence>
        <AnimatePresence>
        {showProfile && <UserProfileModal user={user} onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
    </div>
    </div>
  );
};

export default AlumniDashboard;

