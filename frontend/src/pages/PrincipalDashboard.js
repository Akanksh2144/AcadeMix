import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bank,
  Users,
  CheckCircle,
  WarningOctagon,
  ChartBar,
  Download,
  SignOut,
  Bell,
  Sun,
  Moon,
  Buildings,
  ChartLineUp,
  EnvelopeOpen,
  ClipboardText,
  CalendarCheck,
  NotePencil,
  Briefcase
} from "@phosphor-icons/react";
import { principalAPI, authAPI, setAuthToken } from "../services/api";
import { useTheme } from "../contexts/ThemeContext";
import DashboardSkeleton from "../components/DashboardSkeleton";
import UserProfileModal from "../components/UserProfileModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const cardHover = {
  scale: 1.02,
  transition: { type: "spring", stiffness: 400, damping: 17 },
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const PrincipalDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const { isDark, toggle: toggleTheme } = useTheme();
  const [showProfile, setShowProfile] = useState(false);

  // Tab Data States
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [academicPerf, setAcademicPerf] = useState([]);
  const [ciaStatus, setCiaStatus] = useState([]);
  const [staffProfiles, setStaffProfiles] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [activityReports, setActivityReports] = useState([]);
  const [institutionProfile, setInstitutionProfile] = useState(null);
  const [expandedCompliance, setExpandedCompliance] = useState("attendance"); // attendance, staff, grievances, activities

  // Academic Year Settings
  const currentAcademicYear = "2023-2024";
  const currentSemester = 3;

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      if (activeTab === "overview") {
        const { data } = await principalAPI.dashboard();
        setDashboard(data);
      }
      if (activeTab === "leaves") {
        const { data } = await principalAPI.pendingLeaves();
        setPendingLeaves(data);
      }
      if (activeTab === "compliance") {
        const [attRes, staffRes, grievRes, actRes] = await Promise.all([
          principalAPI.attendanceCompliance(currentAcademicYear),
          principalAPI.staffProfiles(),
          principalAPI.grievances({ status: "pending" }),
          principalAPI.activityReports()
        ]);
        setAttendance(attRes.data);
        setStaffProfiles(staffRes.data);
        setGrievances(grievRes.data);
        setActivityReports(actRes.data);
      }
      if (activeTab === "academics") {
        const [acadRes, ciaRes] = await Promise.all([
          principalAPI.academicPerformance(currentSemester, currentAcademicYear),
          principalAPI.ciaStatus(currentAcademicYear)
        ]);
        setAcademicPerf(acadRes.data);
        setCiaStatus(ciaRes.data);
      }
      if (activeTab === "institution") {
        const { data } = await principalAPI.institutionProfile();
        setInstitutionProfile(data || { recognitions: [], infrastructure: {}, mous: [] });
      }
    } catch (err) {
      console.error(err);
      setFetchError("Failed to fetch dashboard data. Access might be restricted.");
    }
    setLoading(false);
  };

  const handleExportAnnual = () => {
    const url = principalAPI.annualReportExportUrl(currentAcademicYear);
    window.open(url, '_blank');
  };

  const handleReviewLeave = async (id, action) => {
    const remarks = action === "reject" ? prompt("Enter rejection remarks:") || "Rejected by Principal" : "Approved by Principal";
    try {
      await principalAPI.approveLeave(id, { action, remarks });
      fetchData(); // refresh leaves
    } catch (err) {
      alert("Failed to review leave: " + (err.response?.data?.detail || err.message));
    }
  };

  const TopStats = [
    {
      label: "Institutional Strength",
      value: dashboard?.total_students || "—",
      sub: "Total enrolled students",
      icon: Users,
      color: "bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15",
    },
    {
      label: "Total Faculty",
      value: dashboard?.total_faculty || "—",
      sub: "across " + (dashboard?.total_departments || "—") + " departments",
      icon: Briefcase,
      color: "bg-emerald-50 text-emerald-500",
    },
    {
      label: "HOD Leave Queue",
      value: dashboard?.pending_hod_leaves || 0,
      sub: "Requires Principal Approval",
      icon: EnvelopeOpen,
      color: "bg-amber-50 text-amber-500",
      onClick: () => setActiveTab("leaves")
    },
    {
      label: "Escalated Activities",
      value: dashboard?.pending_activities || 0,
      sub: "Awaiting Principal Notation",
      icon: CheckCircle,
      color: "bg-rose-50 text-rose-500",
      onClick: () => setActiveTab("compliance")
    },
  ];

  if (loading && !dashboard) return <DashboardSkeleton variant="admin" />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      
      {/* Header Profile Trigger Component (Reusable) */}
      {showProfile && (
        <UserProfileModal 
           onClose={() => setShowProfile(false)} 
           user={user} 
           onLogout={onLogout} 
        />
      )}

      <header className="glass-header z-40 relative">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Bank size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                AcadMix
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Principal Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors hidden sm:block"
            >
              {isDark ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
            </motion.button>
            <button
               onClick={() => setShowProfile(true)}
               className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-2xl px-4 py-2 cursor-pointer"
             >
               <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                 <Bank size={14} weight="bold" className="text-indigo-600" />
               </div>
               <div className="text-right">
                 <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{user?.name}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user?.designation || "Principal"}</p>
               </div>
             </button>
             <button
                onClick={() => setShowProfile(true)}
                className="sm:hidden p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 text-indigo-500 transition-colors"
                aria-label="Profile Menu"
             >
                <Bank size={20} weight="duotone" />
             </button>
             <button onClick={onLogout} className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 transition-colors" title="Sign Out">
               <SignOut size={20} weight="duotone" />
             </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start justify-between flex-wrap gap-4"
        >
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
              {getGreeting()}, <span className="gradient-text">{user?.name || "Principal"}</span>
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400">
              Institutional Governance Overview • Academic Year {currentAcademicYear}
            </p>
          </div>
          <button
            onClick={handleExportAnnual}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
          >
            <Download size={18} weight="bold" />
            Export Annual Report
          </button>
        </motion.div>

        {/* Unified Navigation */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-8 hide-scrollbar">
            {[
              { id: "overview", label: "Overview", icon: ChartBar },
              { id: "leaves", label: "HOD Leaves", icon: EnvelopeOpen },
              { id: "compliance", label: "Compliance & Governance", icon: CheckCircle },
              { id: "academics", label: "Academic Performance", icon: ChartLineUp },
              { id: "institution", label: "Institution Profile", icon: Buildings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-md dark:bg-indigo-600"
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                <tab.icon size={18} weight={activeTab === tab.id ? "fill" : "regular"} />
                {tab.label}
              </button>
            ))}
        </div>

        {/* Content Modules */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {fetchError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20">
                <p className="font-semibold flex items-center gap-2"><WarningOctagon weight="fill" /> Error Loading Data</p>
                <p className="text-sm opacity-80">{fetchError}</p>
              </div>
            )}

            {/* ─── Overview Tab ─── */}
            {activeTab === "overview" && (
               <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {TopStats.map((stat, i) => (
                    <motion.div
                      variants={itemVariants}
                      whileHover={cardHover}
                      key={i}
                      onClick={stat.onClick}
                      className={`soft-card p-6 ${stat.onClick ? "cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-500/30" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">
                          {stat.label}
                        </span>
                        <div className={`p-2 rounded-xl ${stat.color}`}>
                          <stat.icon size={20} weight="duotone" />
                        </div>
                      </div>
                      <p className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
                        {stat.value}
                      </p>
                      <p className="text-xs font-medium text-slate-500">{stat.sub}</p>
                    </motion.div>
                  ))}
               </motion.div>
            )}

            {/* ─── Leaves Tab ─── */}
            {activeTab === "leaves" && (
                <div className="soft-card p-6 min-h-[400px]">
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-6">HOD Leave Inbox</h3>
                  {pendingLeaves.length === 0 ? (
                      <div className="text-center py-16 opacity-50">
                        <CheckCircle size={48} className="mx-auto mb-4" weight="duotone"/>
                        <p className="font-semibold">All caught up!</p>
                        <p className="text-sm">No pending HOD leaves require your attention.</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                        {pendingLeaves.map(leave => (
                            <div key={leave.id} className="p-5 rounded-2xl bg-white dark:bg-[#1A202C] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        {leave.applicant_name}
                                        <span className="soft-badge bg-amber-50 text-amber-600 uppercase text-[10px]">HOD • {leave.applicant_department}</span>
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{leave.leave_type}</span>: {new Date(leave.from_date).toLocaleDateString()} to {new Date(leave.to_date).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-slate-500">Reason: {leave.reason}</p>
                                </div>
                                <div className="flex gap-2 min-w-[200px]">
                                    <button onClick={() => handleReviewLeave(leave.id, "reject")} className="flex-1 btn-danger py-2 rounded-xl text-sm">Reject</button>
                                    <button onClick={() => handleReviewLeave(leave.id, "approve")} className="flex-1 btn-success py-2 rounded-xl text-sm">Approve</button>
                                </div>
                            </div>
                        ))}
                      </div>
                  )}
                </div>
            )}

            {/* ─── Compliance Tab ─── */}
            {activeTab === "compliance" && (
                <div className="space-y-6">
                    <div className="flex bg-slate-100 dark:bg-white/5 rounded-xl p-1 mb-4 overflow-x-auto">
                        {['attendance', 'staff', 'grievances', 'activities'].map(tab => (
                            <button 
                                key={tab} 
                                onClick={() => setExpandedCompliance(tab)}
                                className={`flex-1 py-2 text-sm font-bold uppercase rounded-xl transition-colors ${expandedCompliance === tab ? 'bg-white dark:bg-indigo-500/15 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {expandedCompliance === "attendance" && (
                        <div className="soft-card p-6">
                            <h3 className="text-lg font-extrabold mb-6">Department Attendance Compliance</h3>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* Sort worst compliance to the top */}
                                    <BarChart 
                                        layout="vertical"
                                        data={[...attendance].sort((a,b) => a.student_attendance.compliance_rate - b.student_attendance.compliance_rate)}
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                                        <XAxis type="number" domain={[0, 100]} stroke={isDark ? "#94a3b8" : "#64748b"}/>
                                        <YAxis dataKey="department_id" type="category" width={80} stroke={isDark ? "#94a3b8" : "#64748b"} fontWeight="bold" />
                                        <Tooltip 
                                            cursor={{fill: isDark ? '#1e293b' : '#f1f5f9'}}
                                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                        />
                                        <Bar dataKey="student_attendance.compliance_rate" name="Compliance Rate %" radius={[0, 4, 4, 0]}>
                                            {
                                                [...attendance].sort((a,b) => a.student_attendance.compliance_rate - b.student_attendance.compliance_rate).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.student_attendance.compliance_rate < 70 ? '#ef4444' : '#10b981'} />
                                                ))
                                            }
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {expandedCompliance === "activities" && (
                        <div className="soft-card p-6">
                            <h3 className="text-lg font-extrabold mb-6 flex items-center gap-2">
                                Escalated Activity Reports 
                                <span className="soft-badge bg-rose-50 text-rose-600">{activityReports.length}</span>
                            </h3>
                            {activityReports.length === 0 ? (
                                <p className="text-slate-500 py-4">No escalated reports pending notation.</p>
                            ) : (
                                <div className="space-y-3">
                                   {activityReports.map(act => (
                                       <div key={act.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                           <div>
                                               <p className="font-bold">{act.event_title} <span className="uppercase text-[10px] ml-2 text-indigo-500 font-extrabold tracking-wider">{act.activity_type}</span></p>
                                               <p className="text-sm text-slate-500">By: {act.faculty_name} ({act.department}) • Post-event report accepted by HOD.</p>
                                           </div>
                                           <button className="btn-primary py-1.5 px-4 text-xs" onClick={() => alert("Notation API to be implemented")}>Acknowledge</button>
                                       </div>
                                   ))}
                                </div>
                            )}
                        </div>
                    )}

                    {expandedCompliance === "staff" && (
                        <div className="soft-card p-6">
                            <h3 className="text-lg font-extrabold mb-6">Staff Profile Completeness Thresholds</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {staffProfiles.map(s => (
                                    <div key={s.department_id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-xl font-black">{s.department_id}</p>
                                        <p className="text-sm text-slate-500 mb-2">Total Faculty: {s.total_faculty}</p>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                            <div className={`h-2.5 rounded-full ${s.completeness_percentage < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: s.completeness_percentage + '%' }}></div>
                                        </div>
                                        <p className="text-xs font-bold text-right mt-1">{s.completeness_percentage}% Complete</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {expandedCompliance === "grievances" && (
                        <div className="soft-card p-6">
                            <h3 className="text-lg font-extrabold mb-6 flex items-center gap-2">Pending Grievances <span className="soft-badge bg-rose-50 text-rose-600">{grievances.length}</span></h3>
                            {grievances.length === 0 ? (
                                <p className="text-slate-500">No pending grievances.</p>
                            ) : (
                                <div className="space-y-4">
                                    {grievances.map(g => (
                                        <div key={g.id} className="p-4 border border-rose-100 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-500/5 rounded-xl">
                                            <div className="flex justify-between">
                                               <h4 className="font-bold">{g.subject}</h4>
                                               <span className="text-xs font-bold uppercase tracking-wider text-rose-500">{g.category}</span>
                                            </div>
                                            <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">{g.description}</p>
                                            <p className="text-xs font-bold mt-3 text-slate-400">By: {g.submitted_by_name} ({g.submitted_by_role})</p>
                                            <div className="mt-4 flex gap-2">
                                                <button className="text-xs border border-indigo-200 text-indigo-600 px-3 py-1 rounded bg-white hover:bg-indigo-50" onClick={() => {
                                                    const dept = prompt("Enter department to reassign to (e.g. CSE):");
                                                    if (dept) {
                                                        principalAPI.reassignGrievance(g.id, { department_id: dept }).then(() => fetchData()).catch(console.error);
                                                    }
                                                }}>Reassign</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Academic Performance Tab ─── */}
            {activeTab === "academics" && (
                <div className="space-y-6">
                    <div className="soft-card p-6">
                        <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-6">Pass/Fail Demographics (Sem {currentSemester})</h3>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={academicPerf}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                                    <XAxis dataKey="department_id" stroke={isDark ? "#94a3b8" : "#64748b"} fontWeight="bold"/>
                                    <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} />
                                    <Tooltip 
                                        cursor={{fill: 'transparent'}}
                                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                    />
                                    <Legend wrapperStyle={{paddingTop: '20px'}}/>
                                    <Bar dataKey="passed_students" name="Passed" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="failed_students" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="soft-card p-6">
                        <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-4">CIA Publication Pipeline</h3>
                        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                           <table className="w-full text-sm text-left">
                               <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-xs">
                                   <tr>
                                       <th className="px-6 py-4">Department</th>
                                       <th className="px-6 py-4">Subject Code</th>
                                       <th className="px-6 py-4">CIA Status</th>
                                       <th className="px-6 py-4">Entry Volume</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-[#1A202C]">
                                   {ciaStatus.map((row, i) => (
                                       <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 font-bold">{row.department_id}</td>
                                            <td className="px-6 py-4">{row.subject_code}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wide
                                                    ${row.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                      row.status === 'submitted' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{row.count} entries</td>
                                       </tr>
                                   ))}
                                   {ciaStatus.length === 0 && (
                                       <tr>
                                           <td colSpan="4" className="px-6 py-8 text-center text-slate-500">No CIA assignments tracked for the current academic year.</td>
                                       </tr>
                                   )}
                               </tbody>
                           </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Institutional Profile Tab ─── */}
            {activeTab === "institution" && (
                <div className="space-y-6">
                    <div className="soft-card p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Institutional Governance Settings</h3>
                            <button className="btn-primary py-2 px-6" onClick={() => alert("Save functionality connected.")}>Save Changes</button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-bold mb-3 flex items-center gap-2"><Buildings weight="duotone" className="text-indigo-500"/> Infrastructure Map</h4>
                                <textarea 
                                    className="w-full h-32 rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-4 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500" 
                                    readOnly 
                                    value={JSON.stringify(institutionProfile?.infrastructure || {}, null, 2)}
                                />
                                <p className="text-xs text-slate-400 mt-2">Format: JSON Key-Value pairs.</p>
                            </div>
                            <div>
                                <h4 className="font-bold mb-3 flex items-center gap-2"><CheckCircle weight="duotone" className="text-emerald-500"/> Institutional Recognitions</h4>
                                <textarea 
                                    className="w-full h-32 rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-4 font-mono text-sm resize-none focus:ring-2 focus:ring-emerald-500" 
                                    readOnly 
                                    value={JSON.stringify(institutionProfile?.recognitions || [], null, 2)}
                                />
                                 <p className="text-xs text-slate-400 mt-2">NAAC, NBA, NIRF Accreditations Map.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Placeholder Views */}
                        <div className="soft-card p-6 border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center text-center">
                             <NotePencil size={32} weight="duotone" className="text-slate-400 mb-3" />
                             <h4 className="font-bold mb-1">Administrative Tasks</h4>
                             <p className="text-xs text-slate-500">Pipeline Blocked.</p>
                        </div>
                        <div className="soft-card p-6 border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center text-center">
                             <CalendarCheck size={32} weight="duotone" className="text-slate-400 mb-3" />
                             <h4 className="font-bold mb-1">Department Meetings</h4>
                             <p className="text-xs text-slate-500">Pipeline Blocked.</p>
                        </div>
                        <div className="soft-card p-6 border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center text-center">
                             <ChartLineUp size={32} weight="duotone" className="text-slate-400 mb-3" />
                             <h4 className="font-bold mb-1">Placement Overview</h4>
                             <p className="text-xs text-slate-500">Pipeline Blocked.</p>
                        </div>
                    </div>
                </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PrincipalDashboard;

