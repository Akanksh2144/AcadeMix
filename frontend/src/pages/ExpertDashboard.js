import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Buildings, BookOpen, Users, GraduationCap, 
  FileText, Star, CheckCircle, ChartBar, 
  Clock, MagnifyingGlass, Sun, Moon, Bell,
  ArrowRight, SignOut, CircleHalfTilt,
  Desktop
} from '@phosphor-icons/react';
import { expertAPI } from '../services/api';
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

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const ExpertDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('expert_tab') || 'overview');
  useEffect(() => { sessionStorage.setItem('expert_tab', activeTab); }, [activeTab]);
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const { isDark, toggle: toggleTheme } = useTheme();
  
  // Data States
  const [assignments, setAssignments] = useState([]);
  const [questionPapers, setQuestionPapers] = useState([]);
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, asmRes, qpRes, matRes] = await Promise.all([
        expertAPI.dashboard(),
        expertAPI.myAssignments(),
        expertAPI.getQuestionPapers(),
        expertAPI.getStudyMaterials()
      ]);
      setStats(dashRes.data);
      setAssignments(asmRes.data);
      setQuestionPapers(qpRes.data);
      setStudyMaterials(matRes.data);
    } catch (error) {
      console.error("Failed to load expert data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewStatus = async (type, id, newStatus) => {
    try {
      if (type === 'paper') {
        await expertAPI.reviewQuestionPaper(id, { status: newStatus, comments: 'Reviewed by expert' });
      } else {
        await expertAPI.reviewStudyMaterial(id, { status: newStatus, comments: 'Reviewed by expert' });
      }
      fetchDashboardData();
    } catch (err) {
      console.error("Review failed", err);
    }
  };

  if (loading) return <DashboardSkeleton variant="admin" />;

  const statCards = [
    { label: 'Active Subject Assignments', value: stats?.active_assignments || 0, sub: 'Currently managed', icon: BookOpen, colorText: 'text-indigo-500 dark:text-indigo-400', colorBg: 'bg-indigo-50 dark:bg-indigo-500/15' },
    { label: 'Question Papers to Review', value: stats?.pending_question_papers || 0, sub: 'Pending action', icon: FileText, colorText: 'text-amber-500 dark:text-amber-400', colorBg: 'bg-amber-50 dark:bg-amber-500/15', alert: stats?.pending_question_papers > 0 },
    { label: 'Study Materials Pending', value: stats?.pending_materials || 0, sub: 'Requires verification', icon: Desktop, colorText: 'text-purple-500 dark:text-purple-400', colorBg: 'bg-purple-50 dark:bg-purple-500/15' },
    { label: 'Completed Evaluations', value: stats?.completed_evaluations || 0, sub: 'Faculty scored', icon: Star, colorText: 'text-emerald-500 dark:text-emerald-400', colorBg: 'bg-emerald-50 dark:bg-emerald-500/15' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      
      {/* ── Header ───────────────────────── */}
      <header className="glass-header">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <CircleHalfTilt size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">AcadMix</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Expert</p>
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
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 transition-colors relative"
            >
              <Bell size={20} weight="duotone" />
              {stats?.pending_question_papers > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {stats.pending_question_papers}
                </div>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-4 py-2 border border-slate-100 dark:border-white/5">
              <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                <GraduationCap size={18} weight="duotone" className="text-amber-500" />
              </div>
              <div className="flex flex-col justify-center text-left">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{user?.name || 'Subject Expert'}</p>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 leading-tight mt-0.5">DHTE Expert</p>
              </div>
            </div>
            <button onClick={onLogout} className="p-2.5 rounded-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 transition-colors" aria-label="Sign out">
              <SignOut size={20} weight="duotone" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* ── Hero Greeting ───────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="mb-6 sm:mb-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            {getGreeting()}, <span className="text-amber-500">{user?.name?.split(' ').pop() || 'Expert'}!</span>
          </h2>
          <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400">
            Subject Matter Expert & Evaluator
          </p>
        </motion.div>

        {/* ── Secondary Nav Tabs ────────────────────── */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-8 hide-scrollbar">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'assignments', label: 'Assigned Subjects' },
            { id: 'papers', label: 'Question Papers', count: stats?.pending_question_papers },
            { id: 'materials', label: 'Study Materials', count: stats?.pending_materials },
            { id: 'evaluations', label: 'Teaching Evals' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#1A202C] text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              {tab.label}
              {tab.count > 0 && activeTab !== tab.id && (
                <span className="flex items-center justify-center w-5 h-5 ml-1.5 text-[10px] font-bold text-white bg-amber-500 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content Area ─────────────────────────── */}
        {activeTab === 'overview' && (
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
              {statCards.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div variants={itemVariants} whileHover={cardHover} key={i}
                    className="stat-card relative overflow-hidden text-left"
                  >
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
                      <div className={`${stat.colorBg} p-2 sm:p-2.5 rounded-xl`}><Icon size={18} weight="duotone" className={stat.colorText} /></div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {stat.value}
                      {stat.alert && <span className="ml-2 inline-block w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>}
                    </p>
                    <p className="text-[10px] sm:text-xs font-medium text-slate-400 mt-1">{stat.sub}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div variants={itemVariants} className="soft-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Action Items</h3>
              </div>
              
              {stats?.pending_question_papers === 0 && stats?.pending_materials === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} weight="duotone" className="text-emerald-500" />
                  </div>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">All caught up!</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">You have no pending reviews at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats?.pending_question_papers > 0 && (
                    <div className="flex items-center justify-between p-5 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                          <FileText size={24} weight="duotone" className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white mb-0.5">Question Papers Pending Review</p>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stats.pending_question_papers} papers submitted by faculty require your approval.</p>
                        </div>
                      </div>
                      <button onClick={() => setActiveTab('papers')} className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-amber-500/20 hover:shadow-md hover:shadow-amber-500/30 active:scale-95">
                        Review Now
                      </button>
                    </div>
                  )}
                  {stats?.pending_materials > 0 && (
                     <div className="flex items-center justify-between p-5 bg-purple-50 dark:bg-purple-500/10 rounded-2xl border border-purple-100 dark:border-purple-500/20 transition-colors">
                     <div className="flex items-center space-x-4">
                       <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
                         <Desktop size={24} weight="duotone" className="text-purple-600 dark:text-purple-400" />
                       </div>
                       <div>
                         <p className="font-extrabold text-slate-900 dark:text-white mb-0.5">Study Materials Pending Review</p>
                         <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stats.pending_materials} materials require quality verification.</p>
                       </div>
                     </div>
                     <button onClick={() => setActiveTab('materials')} className="shrink-0 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-purple-500/20 hover:shadow-md hover:shadow-purple-500/30 active:scale-95">
                       Verify Now
                     </button>
                   </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ── Assignments Tab ──────────────────────── */}
        {activeTab === 'assignments' && (
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants} className="soft-card p-6 border-t-4 border-t-indigo-500">
               <div className="flex items-center justify-between mb-8">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Mapped Scope of Work</h3>
              </div>
              <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                {assignments.length > 0 ? assignments.map((asm) => (
                  <div key={asm.id} className="flex items-center justify-between p-5 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-indigo-100 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                         <BookOpen size={20} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
                       </div>
                       <div>
                         <p className="font-extrabold text-slate-900 dark:text-white">{asm.subject_code}</p>
                         <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Academic Year: {asm.academic_year}</p>
                       </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                )) : (
                  <div className="col-span-2 py-12 text-center">
                    <BookOpen size={32} weight="duotone" className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No active assignment scopes</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Papers Tab ──────────────────────── */}
        {activeTab === 'papers' && (
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants} className="soft-card overflow-hidden border-t-4 border-t-amber-500">
               <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Question Paper Audits</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Subject Code</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Exam Setup</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Draft Author</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {questionPapers.length > 0 ? questionPapers.map((qp) => (
                      <tr key={qp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-extrabold text-slate-900 dark:text-slate-100">{qp.subject_code}</p>
                        </td>
                        <td className="px-6 py-4">
                           <p className="font-bold text-slate-700 dark:text-slate-300 uppercase">{qp.exam_type}</p>
                           <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium mt-0.5">Sem: {qp.semester} • AY: {qp.academic_year}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-indigo-50 dark:bg-indigo-500/10 rounded flex flex-col items-center justify-center">
                              <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400">FA</span>
                            </div>
                            <p className="font-semibold text-slate-700 dark:text-slate-300">{qp.faculty_name || qp.faculty_id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            qp.status === 'approved' ? 'bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                            qp.status === 'revision_requested' ? 'bg-red-100/50 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                            'bg-amber-100/50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          }`}>
                            {qp.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a href={qp.paper_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" title="View Source PDF">
                              <FileText size={18} weight="duotone" />
                            </a>
                            {(qp.status === 'submitted' || qp.status === 'under_review') && (
                              <>
                                <button onClick={() => handleReviewStatus('paper', qp.id, 'revision_requested')} className="px-3 py-1.5 text-[11px] font-bold bg-white dark:bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/30 rounded-xl transition-all shadow-sm">
                                  Revise
                                </button>
                                <button onClick={() => handleReviewStatus('paper', qp.id, 'approved')} className="px-3 py-1.5 text-[11px] font-bold border border-transparent bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 active:scale-95 rounded-xl transition-all">
                                  Approve
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="px-6 py-16 text-center text-slate-400 font-medium">No question papers currently submitted for your domain.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Materials and Evaluations ──────────────── */}
        {(activeTab === 'materials' || activeTab === 'evaluations') && (
            <motion.div variants={containerVariants} initial="hidden" animate="show">
               <motion.div variants={itemVariants} className="soft-card p-16 text-center">
                 <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
                    <ChartBar size={32} weight="duotone" className="text-slate-300 dark:text-slate-600" />
                 </div>
                 <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-200 mb-1">Queue is Empty</h3>
                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-md mx-auto">This section is fully connected to the backend framework. New submissions or evaluations will populate here automatically.</p>
               </motion.div>
            </motion.div>
        )}

      </div>
    </div>
  );
};

export default ExpertDashboard;

