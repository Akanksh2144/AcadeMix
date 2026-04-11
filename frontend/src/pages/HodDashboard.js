import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Users,
  ClipboardText,
  CheckCircle,
  Clock,
  SignOut,
  Plus,
  Trash,
  UserPlus,
  ChartLine,
  Eye,
  GraduationCap,
  X,
  Bell,
  CalendarDots,
  PresentationChart,
  Megaphone,
  Calendar,
  WarningOctagon,
  ChartBar,
  Download,
  Sun,
  Moon,
} from "@phosphor-icons/react";
import { facultyAPI, examCellAPI, marksAPI } from "../services/api";
import { StudentResultsSearch } from "../components/StudentResultsSearch";
import AlertModal from "../components/AlertModal";
import WorkloadMatrix from "../components/hod/WorkloadMatrix";
import TimetableManager from "../components/hod/TimetableManager";
import AnnouncementBoard from "../components/hod/AnnouncementBoard";
import AtRiskAlerts from "../components/hod/AtRiskAlerts";
import AnalyticsDashboard from "../components/hod/AnalyticsDashboard";
import ExportReports from "../components/hod/ExportReports";
import FacultyActivityLog from "../components/hod/FacultyActivityLog";
import HODClassInChargeTab from "../components/hod/HODClassInChargeTab";
import HODMentorTab from "../components/hod/HODMentorTab";
import HODProgressionTab from "../components/hod/HODProgressionTab";
import HODLeaveApprovalsTab from "../components/hod/HODLeaveApprovalsTab";
import { useTheme } from "../contexts/ThemeContext";
import DashboardSkeleton from "../components/DashboardSkeleton";
import { mockSubjects } from "../lib/constants";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
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

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = new Date() - new Date(dateStr);
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const HodDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("hod_tab") || "overview",
  );
  const [showProfile, setShowProfile] = useState(false);
  useEffect(() => {
    sessionStorage.setItem("hod_tab", activeTab);
  }, [activeTab]);
  const [analyticsTab, setAnalyticsTab] = useState("quiz");
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [facultySubView, setFacultySubView] = useState("assignments");
  const [dashboard, setDashboard] = useState(null);
  const [alertModal, setAlertModal] = useState({
    open: false,
    title: "",
    message: "",
    type: "info",
  });
  const showAlert = (title, message, type = "info") =>
    setAlertModal({ open: true, title, message, type });
  const closeAlert = () => setAlertModal((prev) => ({ ...prev, open: false }));
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    type: "warning",
    onConfirm: null,
  });
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const { isDark, toggle: toggleTheme } = useTheme();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    teacher_id: "",
    subject_code: "",
    subject_name: "",
    department: user?.department || "ET",
    batch: "2026",
    section: "DS",
    semester: 3,
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const notifKey = `acadmix_notif_read_${user?.id || "default"}`;
  const [notifRead, setNotifReadState] = useState(
    () => localStorage.getItem(notifKey) === "true",
  );
  const setNotifRead = (val) => {
    setNotifReadState(val);
    localStorage.setItem(notifKey, String(val));
  };



  // ET department encompasses all sections, show all subjects
  const departmentSubjects = mockSubjects;

  const [subjectSearch, setSubjectSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      if (activeTab === "overview") {
        const { data } = await examCellAPI.hodDashboard();
        setDashboard(data);
      }
      if (activeTab === "faculty" || activeTab === "overview") {
        const [a, t] = await Promise.all([
          facultyAPI.assignments(),
          facultyAPI.teachers(),
        ]);
        setAssignments(a.data);
        setTeachers(t.data);
      }
      if (activeTab === "review") {
        const { data } = await marksAPI.submissions();
        setSubmissions(data);
      }
    } catch (err) {
      console.error("HOD Dashboard fetch error:", err);
      setFetchError(err?.response?.data?.detail || err?.message || "Failed to load dashboard data. Please check if the backend is running.");
    }
    setLoading(false);
    setInitialLoading(false);
  };

  const handleSubjectSelect = (subject) => {
    setNewAssignment({
      ...newAssignment,
      subject_code: subject.code,
      subject_name: subject.name,
      semester: subject.semester,
    });
    setSubjectSearch(subject.code);
    setShowSubjectDropdown(false);
  };

  const handleTeacherSelect = (teacher) => {
    setNewAssignment({ ...newAssignment, teacher_id: teacher.id });
    setTeacherSearch(teacher.name);
    setShowTeacherDropdown(false);
  };

  const handleClearSubject = () => {
    setSubjectSearch("");
    setNewAssignment({
      ...newAssignment,
      subject_code: "",
      subject_name: "",
      semester: 3,
    });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest("[data-dropdown-container]")) {
        setShowSubjectDropdown(false);
        setShowTeacherDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSubjects = departmentSubjects.filter(
    (s) =>
      s.code.toLowerCase().includes(subjectSearch.toLowerCase()) ||
      s.name.toLowerCase().includes(subjectSearch.toLowerCase()),
  );

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.college_id.toLowerCase().includes(teacherSearch.toLowerCase()),
  );

  const handleAddAssignment = async () => {
    try {
      await facultyAPI.createAssignment(newAssignment);
      setShowAddForm(false);
      setNewAssignment({
        ...newAssignment,
        teacher_id: "",
        subject_code: "",
        subject_name: "",
      });
      fetchData();
    } catch (err) {
      showAlert(
        "Assignment Error",
        err.response?.data?.detail || "Failed to create assignment",
        "danger",
      );
    }
  };

  const handleDeleteAssignment = async (id) => {
    setConfirmModal({
      open: true,
      title: "Remove Assignment",
      message: "Are you sure you want to remove this assignment?",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        try {
          await facultyAPI.deleteAssignment(id);
          fetchData();
        } catch {}
      },
    });
  };

  const handleReview = async (entryId, action) => {
    const remarks =
      action === "reject" ? prompt("Enter rejection remarks:") || "" : "";
    try {
      await marksAPI.review(entryId, { action, remarks });
      fetchData();
    } catch (err) {
      showAlert(
        "Review Failed",
        err.response?.data?.detail || "Review failed",
        "danger",
      );
    }
  };

  const recentActivity = (dashboard?.recent_submissions || [])
    .slice(0, 10)
    .map((r, i) => ({
      type: r.activity_type || "submission",
      title:
        r.activity_type === "results_published"
          ? "Semester Results"
          : r.teacher_name || "Teacher",
      subtitle:
        r.activity_type === "results_published"
          ? `Published: ${r.batch} - Sem ${r.semester}`
          : `Marks for ${r.subject_code || "Subject"}`,
      timestamp: r.published_at || r.submitted_at || r.created_at,
      status: r.status,
    }));

  const stats = [
        {
          label: "Teachers",
          value: dashboard ? String(dashboard.total_teachers) : "—",
          sub: "in department",
          icon: Users,
          color: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500",
          gradient: "from-indigo-500 to-blue-500",
          onClick: () => setActiveTab("faculty"),
        },
        {
          label: "Students",
          value: dashboard ? String(dashboard.total_students) : "—",
          sub: "enrolled",
          icon: BookOpen,
          color: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500",
          gradient: "from-emerald-500 to-teal-500",
          onClick: () => setActiveTab("results"),
        },
        {
          label: "Analytics",
          value: "2",
          sub: "reports",
          icon: ChartLine,
          color: "bg-purple-50 dark:bg-purple-500/15 text-purple-500",
          gradient: "from-purple-500 to-fuchsia-500",
          onClick: () => setActiveTab("analytics"),
        },
        {
          label: "Pending Reviews",
          value: dashboard ? String(dashboard.pending_reviews) : "—",
          sub: "needs action",
          icon: Clock,
          color: "bg-rose-50 dark:bg-rose-500/15 text-rose-500",
          gradient: "from-rose-500 to-pink-500",
          onClick: () => setActiveTab("review"),
        },
        {
          label: "Timetable",
          value: "6",
          sub: "periods/day",
          icon: Calendar,
          color: "bg-blue-50 dark:bg-blue-500/15 text-blue-500",
          gradient: "from-blue-500 to-cyan-500",
          onClick: () => setActiveTab("timetable"),
        },
        {
          label: "Announcements",
          value: "—",
          sub: "board",
          icon: Megaphone,
          color: "bg-violet-50 dark:bg-violet-500/15 text-violet-500",
          gradient: "from-violet-500 to-purple-500",
          onClick: () => setActiveTab("announcements"),
        },
        {
          label: "At-Risk",
          value: "!",
          sub: "student alerts",
          icon: WarningOctagon,
          color: "bg-red-50 dark:bg-red-500/15 text-red-500",
          gradient: "from-red-500 to-orange-500",
          onClick: () => setActiveTab("at-risk"),
        },
        {
          label: "Activity Log",
          value: "📋",
          sub: "audit trail",
          icon: ClipboardText,
          color: "bg-slate-100 dark:bg-slate-500/15 text-slate-500 dark:text-slate-400",
          gradient: "from-slate-500 to-slate-700",
          onClick: () => setActiveTab("activity-log"),
        },
      ];

  if (initialLoading) return <DashboardSkeleton variant="hod" />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      {/* Notification overlay */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              onClick={() => setShowNotifications(false)}
            ></motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-16 right-4 sm:right-8 z-[61] w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 dark:bg-[#1A202C] dark:border-white/[0.06] overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100">
                  Recent Activity
                </h4>
                <button
                  onClick={() => {
                    setNotifRead(true);
                    setShowNotifications(false);
                  }}
                  className="text-xs font-bold text-amber-500 hover:text-amber-600 transition-colors"
                >
                  Mark all as read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {recentActivity.length > 0 ? (
                  recentActivity.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setActiveTab("review");
                        setShowNotifications(false);
                      }}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 bg-amber-50">
                        <ClipboardText
                          size={14}
                          weight="duotone"
                          className="text-amber-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                          {item.subtitle} • {timeAgo(item.timestamp)}
                        </p>
                      </div>
                      {item.status && (
                        <span
                          className={`text-xs font-bold flex-shrink-0 ${
                            item.status === "approved"
                              ? "text-emerald-500"
                              : item.status === "submitted"
                                ? "text-amber-500"
                                : "text-red-500"
                          }`}
                        >
                          {item.status.charAt(0).toUpperCase() +
                            item.status.slice(1)}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-slate-400">
                      No recent submissions
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <header className="glass-header border-b border-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <PresentationChart
                size={22}
                weight="duotone"
                className="text-white"
              />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                AcadMix
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                HOD Workspace
              </p>
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
                <motion.div
                  key={isDark ? "dark" : "light"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {isDark ? (
                    <Sun size={20} weight="duotone" />
                  ) : (
                    <Moon size={20} weight="duotone" />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.button>
            {/* Notification Bell */}
            <button
              data-testid="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 text-slate-500 dark:text-slate-400 transition-colors relative"
            >
              <Bell size={20} weight={showNotifications ? "fill" : "duotone"} />
              {!notifRead && recentActivity.length > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {Math.min(recentActivity.length, 9)}
                </div>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-4 py-2">
              <GraduationCap
                size={18}
                weight="duotone"
                className="text-amber-500"
              />
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {user?.name}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {user?.designation || "Head of Department"}
                </p>
              </div>
            </div>
            <button
              data-testid="logout-button"
              onClick={onLogout}
              className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-500 transition-colors"
              aria-label="Sign out"
            >
              <SignOut size={20} weight="duotone" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ── Hero Greeting ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mb-6 sm:mb-8 flex items-start justify-between"
        >
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              {getGreeting()},{" "}
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                {user?.name?.split(" ").pop() || "HOD"}!
              </span>
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400">
              {user?.designation || "Head of Department"} •{" "}
              {user?.department || "DS"} Department
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowExportPanel(!showExportPanel)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1A202C] border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:shadow-md text-slate-600 dark:text-slate-400 hover:text-indigo-600 text-sm font-semibold transition-all shadow-sm"
            >
              <Download size={16} weight="duotone" />
              Export
            </button>
            {showExportPanel && (
              <div className="absolute right-0 top-full mt-2 z-50 w-[480px] bg-white rounded-2xl dark:bg-[#1A202C] shadow-2xl border border-slate-200 dark:border-slate-700 p-1 animate-in">
                <div className="flex items-center justify-between p-4 pb-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">
                    Export Reports
                  </h4>
                  <button
                    onClick={() => setShowExportPanel(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  <ExportReports
                    students={[]}
                    assignments={assignments}
                    submissions={submissions}
                    compact={true}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Unified Navigation */}
        <div className="flex overflow-x-auto gap-1 p-1 bg-slate-100/80 dark:bg-white/[0.04] rounded-2xl mb-8 hide-scrollbar backdrop-blur-sm border border-slate-200/50 dark:border-white/[0.06]">
            {[
              { id: "overview", label: "Overview" },
              { id: "marks-entry", label: "Marks Entry" },
              { id: "review", label: "Mark Reviews" },
              { id: "quizzes", label: "Quizzes" },
              { id: "faculty", label: "Faculty Management" },
              { id: "results", label: "Student Management" },
              { id: "mentors", label: "Mentors" },
              { id: "class-in-charge", label: "Class In-Charge" },
              { id: "progression", label: "Student Progression" },
              { id: "leave-approvals", label: "Leave Approvals" },
            ].map((tab) => (
              <button
                key={tab.id}
                data-testid={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-slate-800 to-slate-900 dark:from-white dark:to-slate-100 text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 dark:shadow-white/10"
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-white/[0.06]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            data-testid="overview-content"
          >
            {fetchError && (
              <motion.div variants={itemVariants} className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center gap-3">
                <WarningOctagon size={20} weight="duotone" className="text-rose-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Failed to load dashboard data</p>
                  <p className="text-xs text-rose-500 dark:text-rose-400 mt-0.5">{fetchError}</p>
                </div>
                <button onClick={() => fetchData()} className="text-xs font-bold text-rose-600 hover:text-rose-800 dark:text-rose-300 px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 transition-colors">Retry</button>
              </motion.div>
            )}
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 mb-8"
            >
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                const Wrapper = stat.onClick ? motion.button : motion.div;
                return (
                  <Wrapper
                    variants={itemVariants}
                    whileHover={cardHover}
                    key={i}
                    onClick={stat.onClick || undefined}
                    className={`stat-card relative overflow-hidden group text-left backdrop-blur-sm border border-white/60 dark:border-white/[0.06] hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 ${stat.onClick ? "cursor-pointer" : ""}`}
                    data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">
                        {stat.label}
                      </span>
                      <div className={`${stat.color} p-2 sm:p-2.5 rounded-xl`}>
                        <Icon size={18} weight="duotone" />
                      </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {stat.value}
                    </p>
                    <p className="text-[10px] sm:text-xs font-medium text-slate-400 mt-1">
                      {stat.sub}
                    </p>
                  </Wrapper>
                );
              })}
            </motion.div>

            {/* Pending Reviews */}
            {dashboard?.recent_submissions?.length > 0 && (
              <motion.div variants={itemVariants} className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                  Recent Submissions
                </h3>
                <div className="space-y-3">
                  {dashboard.recent_submissions.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">
                          {s.teacher_name} - {s.subject_name}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {s.exam_type?.toUpperCase()} | {s.batch} {s.section} |{" "}
                          {s.entries?.length} students
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("review")}
                        className="btn-primary !px-4 !py-2 text-sm"
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Marks Entry */}
        {activeTab === "marks-entry" && (
          <div data-testid="marks-entry-content">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  My Marks Entry
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enter marks for your assigned subjects
                </p>
              </div>
            </div>

            {/* My Assignments */}
            <div className="mb-6">
              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4">
                My Assigned Subjects
              </h4>
              {assignments.filter((a) => a.teacher_id === user?.id).length >
              0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments
                    .filter((a) => a.teacher_id === user?.id)
                    .map((assignment) => (
                      <div key={assignment.id} className="soft-card p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h5 className="font-bold text-slate-900 text-lg">
                              {assignment.subject_code}
                            </h5>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              {assignment.subject_name}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="soft-badge bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600">
                                {assignment.section}
                              </span>
                              <span className="soft-badge bg-purple-50 text-purple-600">
                                Batch {assignment.batch}
                              </span>
                              <span className="soft-badge bg-teal-50 text-teal-600">
                                Sem {assignment.semester}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 mt-4">
                          <button
                            onClick={() => navigate("marks-entry", assignment)}
                            className="btn-primary w-full !py-2 text-sm"
                          >
                            Enter Marks (Mid-1 / Mid-2)
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="soft-card p-12 text-center">
                  <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardText
                      size={40}
                      weight="duotone"
                      className="text-slate-400"
                    />
                  </div>
                  <h5 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
                    No Subjects Assigned
                  </h5>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No subjects are assigned for the current semester.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Faculty Management */}
        {activeTab === "faculty" && (
          <div data-testid="faculty-content">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-white/[0.04] rounded-2xl p-1.5 border border-slate-200/50 dark:border-white/[0.06]">
                <button
                  onClick={() => setFacultySubView("assignments")}
                  className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${facultySubView === "assignments" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-300"}`}
                >
                  Assignments
                </button>
                <button
                  onClick={() => setFacultySubView("workload")}
                  className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${facultySubView === "workload" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-300"}`}
                >
                  Workload Matrix
                </button>
              </div>
              {facultySubView === "assignments" && (
                <button
                  data-testid="add-assignment-button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="btn-primary !px-4 !py-2.5 text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <UserPlus size={18} weight="duotone" /> Add Assignment
                </button>
              )}
            </div>

            {facultySubView === "workload" && (
              <WorkloadMatrix teachers={teachers} assignments={assignments} />
            )}

            {facultySubView === "assignments" && (
              <>
                {showAddForm && (
                  <div
                    className="soft-card p-6 mb-6"
                    data-testid="add-assignment-form"
                  >
                    <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                      New Faculty Assignment
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Teacher Dropdown with Search */}
                      <div className="relative" data-dropdown-container>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                          Teacher
                        </label>
                        <input
                          data-testid="teacher-search-input"
                          type="text"
                          value={teacherSearch}
                          onFocus={() => setShowTeacherDropdown(true)}
                          onChange={(e) => {
                            setTeacherSearch(e.target.value);
                            setShowTeacherDropdown(true);
                          }}
                          placeholder="Search teacher..."
                          className="soft-input w-full"
                        />
                        {showTeacherDropdown && (
                          <div className="absolute z-10 mt-1 w-full bg-white rounded-xl dark:bg-[#1A202C] shadow-lg border border-slate-100 dark:border-slate-700 max-h-60 overflow-y-auto">
                            {filteredTeachers.length > 0 ? (
                              filteredTeachers.map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => handleTeacherSelect(t)}
                                  className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:bg-indigo-500/15 transition-colors border-b border-slate-50 last:border-0"
                                  type="button"
                                >
                                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                    {t.name}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {t.college_id} - {t.department}
                                  </p>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-slate-400">
                                No teachers found
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Subject Code Dropdown with Search */}
                      <div className="relative" data-dropdown-container>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                          Subject Code
                        </label>
                        <div className="relative">
                          <input
                            data-testid="subject-code-search"
                            type="text"
                            value={subjectSearch}
                            onFocus={() => setShowSubjectDropdown(true)}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSubjectSearch(value);
                              setShowSubjectDropdown(true);
                              // Clear subject name if input is cleared
                              if (!value) {
                                setNewAssignment({
                                  ...newAssignment,
                                  subject_code: "",
                                  subject_name: "",
                                  semester: 3,
                                });
                              }
                            }}
                            placeholder="Search subject code..."
                            className="soft-input w-full pr-10"
                          />
                          {subjectSearch && (
                            <button
                              onClick={handleClearSubject}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 transition-colors"
                              type="button"
                            >
                              <X
                                size={16}
                                weight="bold"
                                className="text-slate-400"
                              />
                            </button>
                          )}
                        </div>
                        {showSubjectDropdown && (
                          <div className="absolute z-10 mt-1 w-full bg-white rounded-xl dark:bg-[#1A202C] shadow-lg border border-slate-100 dark:border-slate-700 max-h-60 overflow-y-auto">
                            {filteredSubjects.length > 0 ? (
                              filteredSubjects.map((s) => (
                                <button
                                  key={s.code}
                                  onClick={() => handleSubjectSelect(s)}
                                  className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:bg-indigo-500/15 transition-colors border-b border-slate-50 last:border-0"
                                  type="button"
                                >
                                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                    {s.code}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {s.name} - Sem {s.semester}
                                  </p>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-slate-400">
                                No subjects found
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Subject Name (Read-only, auto-populated) */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                          Subject Name
                        </label>
                        <input
                          data-testid="subject-name-display"
                          value={newAssignment.subject_name}
                          readOnly
                          placeholder="Auto-filled from code"
                          className="soft-input w-full bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed text-slate-600 dark:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      {/* Department (Read-only for HOD) */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                          Department
                        </label>
                        <input
                          value={newAssignment.department}
                          readOnly
                          className="soft-input w-full bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed text-slate-600 dark:text-slate-400"
                        />
                      </div>

                      {/* Batch Dropdown */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                          Batch
                        </label>
                        <select
                          data-testid="batch-select"
                          value={newAssignment.batch}
                          onChange={(e) =>
                            setNewAssignment({
                              ...newAssignment,
                              batch: e.target.value,
                            })
                          }
                          className="soft-input w-full"
                        >
                          <option value="2026">2026</option>
                          <option value="2025">2025</option>
                          <option value="2024">2024</option>
                          <option value="2023">2023</option>
                        </select>
                      </div>

                      {/* Section Dropdown */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                          Section
                        </label>
                        <select
                          data-testid="section-select"
                          value={newAssignment.section}
                          onChange={(e) =>
                            setNewAssignment({
                              ...newAssignment,
                              section: e.target.value,
                            })
                          }
                          className="soft-input w-full"
                        >
                          <option value="DS">DS</option>
                          <option value="CS">CS (Cyber Security)</option>
                          <option value="IT">IT</option>
                          <option value="AIML">AIML</option>
                          <option value="CSE">CSE</option>
                          <option value="CSM">CSM</option>
                          <option value="CSD">CSD</option>
                          <option value="CSC">CSC</option>
                          <option value="ECE">ECE</option>
                        </select>
                      </div>

                      {/* Semester (Auto-filled from subject) */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                          Semester
                        </label>
                        <input
                          type="number"
                          value={newAssignment.semester}
                          readOnly
                          className="soft-input w-full bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed text-slate-600 dark:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        data-testid="save-assignment-button"
                        onClick={handleAddAssignment}
                        className="btn-primary !py-2.5 text-sm"
                        disabled={
                          !newAssignment.teacher_id ||
                          !newAssignment.subject_code
                        }
                      >
                        Save Assignment
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setSubjectSearch("");
                          setTeacherSearch("");
                        }}
                        className="btn-ghost !py-2.5 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="soft-card p-5 flex items-center justify-between"
                      data-testid={`assignment-${a.id}`}
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">
                          {a.teacher_name}
                        </p>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          {a.subject_code} - {a.subject_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          Batch {a.batch} | Section {a.section} | Sem{" "}
                          {a.semester}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-500 transition-colors"
                      >
                        <Trash size={18} weight="duotone" />
                      </button>
                    </div>
                  ))}
                  {assignments.length === 0 && (
                    <div className="soft-card p-8 text-center">
                      <p className="text-slate-400 font-medium">
                        No faculty assignments yet
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Mark Reviews */}
        {activeTab === "review" && (
          <div data-testid="review-content">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
              Mark Submissions
            </h3>
            <div className="space-y-4">
              {submissions.map((s) => (
                <div
                  key={s.id}
                  className="soft-card p-6"
                  data-testid={`submission-${s.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-bold text-lg text-slate-800 dark:text-slate-100">
                        {s.subject_name} ({s.subject_code})
                      </p>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        By: {s.teacher_name} | {s.exam_type?.toUpperCase()} |
                        Batch {s.batch} Sec {s.section}
                      </p>
                      <p className="text-xs text-slate-400">
                        {s.entries?.length} students | Max: {s.max_marks} marks
                      </p>
                    </div>
                    <span
                      className={`soft-badge ${s.status === "submitted" ? "bg-amber-50 text-amber-600" : s.status === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
                    >
                      {s.status}
                    </span>
                  </div>
                  {s.entries && s.entries.length > 0 && (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                            <th className="text-left py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest w-12">
                              #
                            </th>
                            <th className="text-left py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">
                              College ID
                            </th>
                            <th className="text-left py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">
                              Student Name
                            </th>
                            <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest w-32">
                              Marks / {s.max_marks}
                            </th>
                            <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest w-28">
                              Percentage
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.entries.map((e, i) => {
                            const marks = e.marks ?? null;
                            const pct =
                              marks !== null && s.max_marks > 0
                                ? ((marks / s.max_marks) * 100).toFixed(1)
                                : null;
                            return (
                              <tr
                                key={i}
                                className="border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-800/50/50 transition-colors"
                              >
                                <td className="py-3 px-4 text-sm text-slate-400">
                                  {i + 1}
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                                  {e.college_id}
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-100">
                                  {e.student_name}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {marks ?? "-"}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {pct !== null ? (
                                    <span
                                      className={`text-sm font-bold ${parseFloat(pct) >= 60 ? "text-emerald-600" : parseFloat(pct) >= 40 ? "text-amber-600" : "text-red-600"}`}
                                    >
                                      {pct}%
                                    </span>
                                  ) : (
                                    <span className="text-sm text-slate-300">
                                      -
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                            Total Students:{" "}
                            <span className="text-slate-900 dark:text-white">
                              {s.entries.length}
                            </span>
                          </p>
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                            Avg Marks:{" "}
                            <span className="text-slate-900 dark:text-white">
                              {s.entries.filter((e) => e.marks !== null)
                                .length > 0
                                ? (
                                    s.entries.reduce(
                                      (sum, e) => sum + (e.marks ?? 0),
                                      0,
                                    ) /
                                    s.entries.filter((e) => e.marks !== null)
                                      .length
                                  ).toFixed(1)
                                : "-"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {s.revision_history && s.revision_history.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {s.revision_history.map((rev, ri) => (
                        <div
                          key={ri}
                          className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200/60"
                        >
                          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-amber-600 text-[10px] font-bold">
                              ✏️
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-800">
                              Revised by {rev.reviser_name}
                              <span className="font-normal text-amber-600 ml-2 text-xs">
                                {rev.revised_at
                                  ? new Date(rev.revised_at).toLocaleString()
                                  : ""}
                              </span>
                            </p>
                            <p className="text-sm text-amber-700 mt-0.5">
                              Reason: {rev.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {s.status === "submitted" && (
                    <div className="flex gap-3 mt-3">
                      <button
                        data-testid={`approve-${s.id}`}
                        onClick={() => handleReview(s.id, "approve")}
                        className="btn-primary !py-2 text-sm flex items-center gap-2"
                      >
                        <CheckCircle size={16} weight="duotone" /> Approve
                      </button>
                      <button
                        data-testid={`reject-${s.id}`}
                        onClick={() => handleReview(s.id, "reject")}
                        className="btn-ghost !py-2 text-sm text-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {s.review_remarks && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Remarks: {s.review_remarks}
                    </p>
                  )}
                </div>
              ))}
              {submissions.length === 0 && (
                <div className="soft-card p-8 text-center">
                  <p className="text-slate-400 font-medium">
                    No submissions to review
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Teachers Page */}
        {activeTab === "teachers" && (
          <div data-testid="teachers-content">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Teachers List
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage teachers in {user?.department || "DS"} department
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teachers.length > 0 ? (
                teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="soft-card p-6 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl">
                        {teacher.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-lg">
                          {teacher.name}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {teacher.college_id} • {teacher.email}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {teacher.department} Department • {teacher.college}
                        </p>
                      </div>
                    </div>
                    <span className="soft-badge bg-emerald-50 text-emerald-600">
                      Active
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-2 soft-card p-12 text-center">
                  <p className="text-slate-400 font-medium">
                    No teachers found
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Page */}
        {activeTab === "analytics" && (
          <div data-testid="analytics-content">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Department Analytics
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Performance insights for {user?.department || "DS"} department
                </p>
              </div>
            </div>

            {/* Analytics Tabs */}
            <div className="mb-6">
              <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-white/[0.04] rounded-xl p-1.5 w-fit border border-slate-200/50 dark:border-white/[0.06]">
                <button
                  onClick={() => setAnalyticsTab("quiz")}
                  className={`pill-tab ${analyticsTab === "quiz" ? "pill-tab-active" : "pill-tab-inactive"}`}
                >
                  Quiz Analytics
                </button>
                <button
                  onClick={() => setAnalyticsTab("semester")}
                  className={`pill-tab ${analyticsTab === "semester" ? "pill-tab-active" : "pill-tab-inactive"}`}
                >
                  Semester Analytics
                </button>
              </div>
            </div>

            {/* Quiz Analytics */}
            {analyticsTab === "quiz" && (
              <div className="space-y-6">
                <div className="soft-card p-6">
                  <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                    Department Quiz Performance
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-indigo-50 dark:bg-indigo-500/15 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-1">
                        Avg Score
                      </p>
                      <p className="text-3xl font-extrabold text-indigo-700">
                        78.5%
                      </p>
                    </div>
                    <div className="bg-teal-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-1">
                        Total Attempts
                      </p>
                      <p className="text-3xl font-extrabold text-teal-700">
                        1,248
                      </p>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">
                        Completion Rate
                      </p>
                      <p className="text-3xl font-extrabold text-amber-700">
                        94%
                      </p>
                    </div>
                  </div>

                  <h5 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Section-wise Performance
                  </h5>
                  <div className="space-y-3">
                    {["DS", "CS", "IT", "AIML", "CSE", "CSM", "CSD", "ECE"].map(
                      (section) => {
                        const score = 75 + Math.floor(Math.random() * 15);
                        return (
                          <div
                            key={section}
                            className="flex items-center gap-4"
                          >
                            <span className="soft-badge bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 !w-24">
                              {section}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                  Avg Score
                                </span>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                  {score}%
                                </span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-teal-400 rounded-full transition-all duration-500"
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Semester Analytics */}
            {analyticsTab === "semester" && (
              <div className="space-y-6">
                <div className="soft-card p-6">
                  <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                    Department Semester Performance
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-purple-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-1">
                        Avg SGPA
                      </p>
                      <p className="text-3xl font-extrabold text-purple-700">
                        8.2
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">
                        Pass Rate
                      </p>
                      <p className="text-3xl font-extrabold text-emerald-700">
                        96%
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">
                        First Class
                      </p>
                      <p className="text-3xl font-extrabold text-blue-700">
                        78%
                      </p>
                    </div>
                    <div className="bg-rose-50 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-1">
                        Distinction
                      </p>
                      <p className="text-3xl font-extrabold text-rose-700">
                        45%
                      </p>
                    </div>
                  </div>

                  <h5 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Section-wise Semester Results
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                          <th className="text-left py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">
                            Section
                          </th>
                          <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">
                            Students
                          </th>
                          <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">
                            Avg SGPA
                          </th>
                          <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">
                            Pass %
                          </th>
                          <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">
                            First Class %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          "DS",
                          "CS",
                          "IT",
                          "AIML",
                          "CSE",
                          "CSM",
                          "CSD",
                          "ECE",
                        ].map((section) => {
                          const avgSgpa = (7.5 + Math.random() * 1.5).toFixed(
                            2,
                          );
                          const passRate = 92 + Math.floor(Math.random() * 8);
                          const firstClass =
                            70 + Math.floor(Math.random() * 20);
                          return (
                            <tr
                              key={section}
                              className="border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-800/50/50 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <span className="soft-badge bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600">
                                  {section}
                                </span>
                              </td>
                              <td className="text-center py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                                {section === "DS-1" ? 10 : 8}
                              </td>
                              <td className="text-center py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                                {avgSgpa}
                              </td>
                              <td className="text-center py-3 px-4">
                                <span
                                  className={`soft-badge ${passRate >= 95 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                                >
                                  {passRate}%
                                </span>
                              </td>
                              <td className="text-center py-3 px-4">
                                <span className="soft-badge bg-blue-50 text-blue-600">
                                  {firstClass}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "results" && (
          <div data-testid="results-content">
            <StudentResultsSearch user={user} departmentLocked={true} />
          </div>
        )}

        {activeTab === "timetable" && (
          <div data-testid="timetable-content">
            <TimetableManager user={user} mockSubjects={departmentSubjects} />
          </div>
        )}

        {activeTab === "announcements" && (
          <div data-testid="announcements-content">
            <AnnouncementBoard user={user} />
          </div>
        )}

        {activeTab === "analytics" && (
          <div data-testid="analytics-content">
            <AnalyticsDashboard />
          </div>
        )}

        {activeTab === "at-risk" && (
          <div data-testid="at-risk-content">
            <AtRiskAlerts user={user} />
          </div>
        )}

        {activeTab === "activity-log" && (
          <div data-testid="activity-log-content">
            <FacultyActivityLog submissions={submissions} />
          </div>
        )}

        {activeTab === "class-in-charge" && (
          <div data-testid="class-in-charge-content">
            <HODClassInChargeTab />
          </div>
        )}

        {activeTab === "mentors" && (
          <div data-testid="mentors-content">
            <HODMentorTab departmentId={user?.scope?.department} />
          </div>
        )}

        {activeTab === "progression" && (
          <div data-testid="progression-content">
            <HODProgressionTab departmentId={user?.scope?.department} />
          </div>
        )}

        {activeTab === "leave-approvals" && (
          <div data-testid="leave-approvals-content">
            <HODLeaveApprovalsTab />
          </div>
        )}

        {/* Quizzes tab — HOD as faculty */}
        {activeTab === "quizzes" && (
          <div data-testid="quizzes-content">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                  Quiz Management
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Create and monitor quizzes for your assigned classes
                </p>
              </div>
              <button
                onClick={() => navigate("quiz-builder")}
                className="btn-primary !px-5 !py-2.5 text-sm flex items-center gap-2"
              >
                <span className="text-lg">+</span> Create New Quiz
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Quiz Card */}
              <button
                onClick={() => navigate("quiz-builder")}
                className="soft-card-hover p-8 text-left flex items-center gap-5 group border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/15 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors flex-shrink-0">
                  <span className="text-3xl">📝</span>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Create Quiz
                  </p>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                    Build a new quiz with MCQ, short answer, or coding questions
                  </p>
                </div>
              </button>
              {/* Quiz Analytics Card */}
              <button
                onClick={() => navigate("class-results")}
                className="soft-card-hover p-8 text-left flex items-center gap-5 group border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors flex-shrink-0">
                  <span className="text-3xl">📊</span>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Quiz Analytics
                  </p>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                    View class-wise results, pass rates, and student performance
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
      <AlertModal
        open={alertModal.open}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        onConfirm={closeAlert}
        onCancel={closeAlert}
      />
      <AlertModal
        open={confirmModal.open}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
      />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default HodDashboard;

