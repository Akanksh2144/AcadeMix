import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCircle,
  Briefcase,
  Flask,
  Handshake,
  ChalkboardTeacher,
  ShieldCheck,
  SignOut,
  Sun,
  Moon,
  Bell,
  Plus,
  CheckCircle,
  Clock,
  Buildings,
  CalendarBlank,
  MagnifyingGlass,
  Medal,
} from "@phosphor-icons/react";
import { retiredFacultyAPI, authAPI, setAuthToken } from "../services/api";
import { useTheme } from "../contexts/ThemeContext";
import DashboardSkeleton from "../components/DashboardSkeleton";
import UserProfileModal from "../components/UserProfileModal";

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

const ROLE_LABELS = {
  research_advisor: "Research Advisor",
  board_of_studies: "Board of Studies",
  curriculum_committee: "Curriculum Committee",
  iqac_member: "IQAC Member",
};

const STATUS_COLORS = {
  ongoing: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
};

// ─── Overview Tab ─────────────────────────────────────────────
const OverviewContent = ({ dashboard }) => {
  const stats = [
    { label: "Active Advisory Roles", value: dashboard?.active_advisory_roles ?? "—", icon: Medal, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
    { label: "Ongoing Research", value: dashboard?.ongoing_research ?? "—", icon: Flask, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { label: "Guest Lectures", value: dashboard?.guest_lectures ?? "—", icon: ChalkboardTeacher, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: "Consultancy Engagements", value: dashboard?.total_consultancy ?? "—", icon: Handshake, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
  ];

  const profile = dashboard?.profile || {};

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome Hero */}
      <motion.div variants={itemVariants} className="soft-card p-8 bg-gradient-to-br from-teal-500 to-emerald-600 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-extrabold mb-2">Welcome back, {profile.name || "Professor"}!</h3>
          <p className="text-teal-100 mb-4 max-w-lg">
            Your expertise continues to shape the institution. Track your advisory roles, research projects, and consultancy engagements here.
          </p>
          {profile.specialization && (
            <div className="flex flex-wrap gap-2"> 
              <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-xl text-sm font-bold">{profile.designation_at_retirement || "Professor"}</span>
              <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-xl text-sm font-bold">{profile.specialization}</span>
              {profile.years_of_service && <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-xl text-sm font-bold">{profile.years_of_service} yrs service</span>}
            </div>
          )}
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-1/4 translate-y-1/4">
          <Medal size={240} weight="fill" />
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={i} variants={itemVariants} whileHover={cardHover} className="soft-card p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.bg}`}>
              <s.icon size={24} weight="duotone" className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Services Willing */}
      {profile.services_willing && profile.services_willing.length > 0 && (
        <motion.div variants={itemVariants} className="soft-card p-6">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Services You Offer</h4>
          <div className="flex flex-wrap gap-2">
            {profile.services_willing.map((s, i) => (
              <span key={i} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded-xl text-sm font-bold capitalize">
                {s.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Advisory Roles Tab ───────────────────────────────────────
const AdvisoryContent = ({ roles }) => (
  <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
    {roles.length === 0 ? (
      <motion.div variants={itemVariants} className="soft-card p-12 text-center">
        <Medal size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-semibold">No advisory roles assigned yet</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Contact admin to get appointed to committees</p>
      </motion.div>
    ) : (
      roles.map((r) => (
        <motion.div key={r.id} variants={itemVariants} whileHover={cardHover} className="soft-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                <ShieldCheck size={22} weight="duotone" className="text-indigo-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{ROLE_LABELS[r.role_type] || r.role_type}</h4>
                {r.scope_description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{r.scope_description}</p>}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${r.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
              {r.is_active ? "Active" : "Ended"}
            </span>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-slate-400 dark:text-slate-500 font-semibold">
            <span>From: {r.start_date}</span>
            {r.end_date && <span>To: {r.end_date}</span>}
          </div>
        </motion.div>
      ))
    )}
  </motion.div>
);

// ─── Research Tab ─────────────────────────────────────────────
const ResearchContent = ({ research, onCreateResearch }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", funding_agency: "", start_date: "", status: "ongoing" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onCreateResearch(form);
    setShowForm(false);
    setForm({ title: "", funding_agency: "", start_date: "", status: "ongoing" });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariants} className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Research Projects</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-2">
          <Plus size={16} weight="bold" /> Add Project
        </button>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="soft-card p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project Title *" required className="input-field" />
              <input value={form.funding_agency} onChange={(e) => setForm({ ...form, funding_agency: e.target.value })} placeholder="Funding Agency" className="input-field" />
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required className="input-field" />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="submitted">Submitted</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary !py-2 !px-6 text-sm">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost !py-2 !px-6 text-sm">Cancel</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {research.length === 0 && !showForm ? (
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <Flask size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-semibold">No research projects yet</p>
        </motion.div>
      ) : (
        research.map((r) => (
          <motion.div key={r.id} variants={itemVariants} whileHover={cardHover} className="soft-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{r.title}</h4>
                {r.funding_agency && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Funded by: {r.funding_agency}</p>}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${STATUS_COLORS[r.status] || "bg-slate-100 text-slate-500"}`}>
                {r.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400 dark:text-slate-500 font-semibold">
              <span className="flex items-center gap-1"><CalendarBlank size={14} /> {r.start_date}{r.end_date ? ` → ${r.end_date}` : " → Present"}</span>
              {r.grant_amount && <span className="flex items-center gap-1">₹{r.grant_amount.toLocaleString()}</span>}
              {r.co_investigators?.length > 0 && <span>{r.co_investigators.length} co-investigators</span>}
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
};

// ─── Consultancy Tab ──────────────────────────────────────────
const ConsultancyContent = ({ consultancy, onCreateConsultancy }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_organization: "", topic: "", start_date: "", is_paid: false, fee_amount: null, description: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onCreateConsultancy({ ...form, fee_amount: form.is_paid ? parseFloat(form.fee_amount) || 0 : null });
    setShowForm(false);
    setForm({ client_organization: "", topic: "", start_date: "", is_paid: false, fee_amount: null, description: "" });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariants} className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Consultancy Engagements</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-2">
          <Plus size={16} weight="bold" /> Add Engagement
        </button>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="soft-card p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={form.client_organization} onChange={(e) => setForm({ ...form, client_organization: e.target.value })} placeholder="Client Organization *" required className="input-field" />
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Topic *" required className="input-field" />
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required className="input-field" />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.is_paid} onChange={(e) => setForm({ ...form, is_paid: e.target.checked })} className="w-4 h-4 rounded" /> Paid
                </label>
                {form.is_paid && (
                  <input type="number" value={form.fee_amount || ""} onChange={(e) => setForm({ ...form, fee_amount: e.target.value })} placeholder="Fee (₹)" className="input-field flex-1" />
                )}
              </div>
            </div>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} className="input-field w-full" />
            <div className="flex gap-3">
              <button type="submit" className="btn-primary !py-2 !px-6 text-sm">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost !py-2 !px-6 text-sm">Cancel</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {consultancy.length === 0 && !showForm ? (
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <Handshake size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-semibold">No consultancy engagements yet</p>
        </motion.div>
      ) : (
        consultancy.map((c) => (
          <motion.div key={c.id} variants={itemVariants} whileHover={cardHover} className="soft-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{c.client_organization}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{c.topic}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.is_paid ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                {c.is_paid ? `₹${(c.fee_amount || 0).toLocaleString()}` : "Pro Bono"}
              </span>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-400 dark:text-slate-500 font-semibold">
              <span className="flex items-center gap-1"><CalendarBlank size={14} /> {c.start_date}{c.end_date ? ` → ${c.end_date}` : " → Ongoing"}</span>
            </div>
            {c.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{c.description}</p>}
          </motion.div>
        ))
      )}
    </motion.div>
  );
};

// ─── Profile & Services Tab ───────────────────────────────────
const ProfileContent = ({ dashboard, entitlements }) => {
  const profile = dashboard?.profile || {};
  const ent = entitlements?.entitlements || {};

  const entList = [
    { key: "medical_benefits", label: "Medical Benefits", icon: "🏥" },
    { key: "library_access", label: "Library Access", icon: "📚" },
    { key: "email_access", label: "Email Access", icon: "📧" },
    { key: "campus_facilities", label: "Campus Facilities", icon: "🏛️" },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="soft-card p-6">
        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Profile Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Designation at Retirement", value: profile.designation_at_retirement },
            { label: "Specialization", value: profile.specialization },
            { label: "Retirement Date", value: profile.retirement_date },
            { label: "Years of Service", value: profile.years_of_service ? `${profile.years_of_service} years` : null },
            { label: "Availability Level", value: profile.availability_level },
          ].filter(f => f.value).map((f, i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800/50">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{f.label}</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-200 capitalize">{f.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="soft-card p-6">
        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Entitlements & Benefits</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {entList.map((e) => (
            <div key={e.key} className={`flex items-center gap-3 p-4 rounded-xl border ${ent[e.key] ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-500/5" : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"}`}>
              <span className="text-xl">{e.icon}</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex-1">{e.label}</span>
              {ent[e.key] ? (
                <CheckCircle size={20} weight="fill" className="text-emerald-500" />
              ) : (
                <Clock size={20} className="text-slate-300 dark:text-slate-600" />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {profile.services_willing && profile.services_willing.length > 0 && (
        <motion.div variants={itemVariants} className="soft-card p-6">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Services Offered</h4>
          <div className="flex flex-wrap gap-2">
            {profile.services_willing.map((s, i) => (
              <span key={i} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded-xl text-sm font-bold capitalize">
                {s.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────
const RetiredFacultyDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const { isDark, toggle: toggleTheme } = useTheme();
  const [showProfile, setShowProfile] = useState(false);

  const [roles, setRoles] = useState([]);
  const [research, setResearch] = useState([]);
  const [consultancy, setConsultancy] = useState([]);
  const [entitlements, setEntitlements] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      if (activeTab === "overview") {
        const { data } = await retiredFacultyAPI.dashboard();
        setDashboard(data);
      }
      if (activeTab === "roles") {
        const { data } = await retiredFacultyAPI.myRoles();
        setRoles(data);
      }
      if (activeTab === "research") {
        const { data } = await retiredFacultyAPI.getResearch();
        setResearch(data);
      }
      if (activeTab === "consultancy") {
        const { data } = await retiredFacultyAPI.getConsultancy();
        setConsultancy(data);
      }
      if (activeTab === "profile") {
        const [dRes, eRes] = await Promise.all([
          retiredFacultyAPI.dashboard(),
          retiredFacultyAPI.myEntitlements(),
        ]);
        setDashboard(dRes.data);
        setEntitlements(eRes.data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setFetchError("Failed to fetch data. Access might be restricted.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateResearch = async (data) => {
    try {
      await retiredFacultyAPI.createResearch(data);
      const { data: updated } = await retiredFacultyAPI.getResearch();
      setResearch(updated);
    } catch (err) {
      console.error("Create research error:", err);
    }
  };

  const handleCreateConsultancy = async (data) => {
    try {
      await retiredFacultyAPI.createConsultancy(data);
      const { data: updated } = await retiredFacultyAPI.getConsultancy();
      setConsultancy(updated);
    } catch (err) {
      console.error("Create consultancy error:", err);
    }
  };

  const handleLogout = () => onLogout();

  const tabs = [
    { id: "overview", label: "Overview", icon: Buildings },
    { id: "roles", label: "Advisory Roles", icon: Medal },
    { id: "research", label: "Research", icon: Flask },
    { id: "consultancy", label: "Consultancy", icon: Handshake },
    { id: "profile", label: "Profile & Services", icon: UserCircle },
  ];

  if (loading && !dashboard) return <DashboardSkeleton variant="admin" />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
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
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <Medal size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">AcadMix</h1>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Retired Faculty Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggleTheme} className="icon-btn" title="Toggle theme">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="icon-btn relative" title="Notifications"><Bell size={20} /></button>
            <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center">
                <UserCircle size={20} className="text-teal-600 dark:text-teal-300" weight="duotone" />
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{user?.name}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Retired Faculty</p>
              </div>
            </button>
            <button onClick={handleLogout} className="icon-btn text-rose-500" title="Sign Out"><SignOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {getGreeting()}, <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">{user?.name?.split(" ")[0]}</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">Emeritus Profile • Institutional Engagement</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-500/25"
                  : "bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
              }`}
            >
              <t.icon size={18} weight={activeTab === t.id ? "fill" : "duotone"} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Error Banner */}
        {fetchError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <p className="text-sm font-bold text-red-700 dark:text-red-300">⚠ {fetchError}</p>
          </motion.div>
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && <OverviewContent key="overview" dashboard={dashboard} />}
          {activeTab === "roles" && <AdvisoryContent key="roles" roles={roles} />}
          {activeTab === "research" && <ResearchContent key="research" research={research} onCreateResearch={handleCreateResearch} />}
          {activeTab === "consultancy" && <ConsultancyContent key="consultancy" consultancy={consultancy} onCreateConsultancy={handleCreateConsultancy} />}
          {activeTab === "profile" && <ProfileContent key="profile" dashboard={dashboard} entitlements={entitlements} />}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default RetiredFacultyDashboard;

