import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Buildings, Briefcase, FileText, ChartLineUp, SignOut, DownloadSimple, Users, Trophy, Plus, MapPin, MapTrifold, Books, Student, CheckCircle, XCircle } from '@phosphor-icons/react';
import { tpoAPI } from '../services/api';

const OverviewTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tpoAPI.getStats().then(res => {
      setStats(res.data);
      setLoading(false);
    }).catch(e => setLoading(false));
  }, []);

  if(loading) return <div className="p-8 text-center text-slate-400">Loading metrics...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Training & Placement Overview</h2>
          <p className="text-sm text-slate-500">Key performance metrics and quick actions.</p>
        </div>
        <button onClick={async () => {
          try {
            const res = await tpoAPI.getStats();
            alert("Exporting NAAC Data...");
          } catch {}
        }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold">
          <DownloadSimple weight="bold" /> Export NAAC Data
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={stats?.total_students || 0} icon={<Users className="text-blue-500" size={24} weight="duotone"/>} />
        <StatCard title="Companies Visited" value={stats?.companies_visited || 0} icon={<Buildings className="text-indigo-500" size={24} weight="duotone"/>} />
        <StatCard title="Students Placed" value={stats?.students_placed || 0} icon={<Trophy className="text-amber-500" size={24} weight="duotone"/>} />
        <StatCard title="Highest CTC" value={(stats?.highest_package || 0) + " LPA"} icon={<ChartLineUp className="text-emerald-500" size={24} weight="duotone"/>} />
      </div>
    </motion.div>
  );
};
const StatCard = ({ title, value, icon }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">{icon}</div>
    <div>
      <p className="text-sm font-semibold tracking-wide text-slate-500">{title}</p>
      <h3 className="text-2xl font-black dark:text-white">{value}</h3>
    </div>
  </div>
);

const CompaniesTab = () => {
    const [companies, setCompanies] = useState([]);
    useEffect(() => { tpoAPI.getCompanies().then(res => setCompanies(res.data)).catch(()=>console.log("No companies")); }, []);
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Active Companies</h2>
            {companies.length === 0 ? <p className="text-slate-500">No companies registered.</p> : 
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map(c => (
                    <div key={c.id} className="p-4 border dark:border-slate-700 rounded-xl">
                        <h3 className="font-bold text-lg dark:text-white">{c.name}</h3>
                        <p className="text-sm text-slate-500">{c.industry}</p>
                    </div>
                ))}
            </div>}
        </div>
    );
};

const DrivesTab = () => {
    const [drives, setDrives] = useState([]);
    useEffect(() => { tpoAPI.getDrives().then(res => setDrives(res.data)).catch(()=>(null)); }, []);
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
                <h2 className="text-xl font-bold dark:text-white">Placement Drives</h2>
                <button className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium"><Plus/> New Drive</button>
            </div>
            {drives.length === 0 ? <p className="text-slate-500">No active drives.</p> : drives.map(d => (
                <div key={d.id} className="p-6 bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
                    <div className="flex justify-between">
                        <div>
                            <h3 className="text-lg font-bold dark:text-white">{d.role} (₹{d.package_lpa} LPA)</h3>
                            <p className="text-slate-500">{d.location}</p>
                        </div>
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold h-fit">Active</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const AppsTab = () => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Applicant Tracking System</h2>
            <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <FileText size={48} className="mx-auto mb-2 opacity-50" />
                <p>Select a Placement Drive to view and shortlist applicants.</p>
            </div>
        </div>
    );
};

const TPODashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const TABS = [
    { id: 'overview', label: 'Overview', icon: <ChartLineUp size={20} /> },
    { id: 'companies', label: 'Company Registry', icon: <Buildings size={20} /> },
    { id: 'drives', label: 'Placement Drives', icon: <Briefcase size={20} /> },
    { id: 'apps', label: 'Applications', icon: <FileText size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex">
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">T&P Center</h1>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{user?.name || "T&P Officer"}</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
            <SignOut weight="bold" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 max-h-screen overflow-y-auto p-8 border-l border-white/5 dark:border-none shadow-inner">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'companies' && <CompaniesTab />}
            {activeTab === 'drives' && <DrivesTab />}
            {activeTab === 'apps' && <AppsTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
export default TPODashboard;
