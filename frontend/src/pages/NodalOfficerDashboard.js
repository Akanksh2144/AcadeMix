import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Storefront, Checks, FileText, MagnifyingGlass, Megaphone, ShieldCheck, Sun, Moon, SignOut, UserCircle } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';
import { nodalAPI } from '../services/api';
import { toast, Toaster } from 'sonner';

const NodalOfficerDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { isDark, toggle: toggleTheme } = useTheme();

  const [colleges, setColleges] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [circulars, setCirculars] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [activities, setActivities] = useState([]);
  
  const [showCircularModal, setShowCircularModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'compliance') fetchCompliance();
    if (activeTab === 'circulars') fetchCirculars();
    if (activeTab === 'submissions') fetchSubmissions();
    if (activeTab === 'inspections') fetchInspections();
    if (activeTab === 'activities') fetchActivities();
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      const res = await nodalAPI.getColleges();
      setColleges(res.data?.data || []);
    } catch (e) {
      toast.error('Failed to load jurisdiction colleges');
    }
  };

  const fetchCompliance = async () => {
    const res = await nodalAPI.getAttendanceCompliance();
    setAttendance(res.data?.data || []);
  };
  const fetchCirculars = async () => {
    const res = await nodalAPI.getCirculars();
    setCirculars(res.data?.data || []);
  };
  const fetchSubmissions = async () => {
    const res = await nodalAPI.getSubmissionsStatus();
    setSubmissions(res.data?.data || []);
  };
  const fetchInspections = async () => {
    const res = await nodalAPI.getInspections();
    setInspections(res.data?.data || []);
  };
  const fetchActivities = async () => {
    const res = await nodalAPI.getActivityReports();
    setActivities(res.data?.data || []);
  };

  // Handlers
  const handleAcknowledgeActivity = async (id) => {
    try {
      await nodalAPI.acknowledgeActivity(id, { notes: 'Acknowledged by DHTE Nodal Officer' });
      toast.success('Activity officially acknowledged');
      fetchActivities();
    } catch {
      toast.error('Action failed');
    }
  };

  const handleCreateCircular = async () => {
    try {
      await nodalAPI.createCircular({
        title: formData.title,
        content: formData.content,
        document_url: formData.document_url || '',
        is_mandatory: true,
        target_colleges: ['all']
      });
      toast.success('Circular distributed universally');
      setShowCircularModal(false);
      fetchCirculars();
    } catch {
      toast.error('Failed to distribute');
    }
  };

  const handleCreateInspection = async () => {
    try {
      await nodalAPI.createInspection({
        college_id: formData.college_id,
        inspection_date: formData.inspection_date,
        inspection_type: formData.inspection_type || 'routine',
        team_members: [user.name],
        findings: [formData.findings],
        action_points: [formData.action_points],
        compliance_score: parseFloat(formData.compliance_score || 85.0)
      });
      toast.success('Audit successfully filed');
      setShowInspectionModal(false);
      fetchInspections();
    } catch {
      toast.error('Failed to log audit');
    }
  };

  const handleCreateRequirement = async () => {
    try {
      await nodalAPI.createSubmissionRequirement({
        title: formData.title,
        description: formData.description,
        data_type: formData.data_type || 'other',
        deadline: formData.deadline,
        target_colleges: ['all']
      });
      toast.success('Requirement issued globally');
      setShowSubmissionModal(false);
      fetchSubmissions();
    } catch {
      toast.error('Failed to issue requirement');
    }
  };

  const handleAssignExpert = async () => {
    try {
      await nodalAPI.assignExpert({
        expert_user_id: formData.expert_user_id,
        college_id: formData.college_id,
        subject_code: formData.subject_code,
        department_id: formData.department_id || 'TEMP',
        academic_year: '2024-2025'
      });
      toast.success('Subject Expert assigned to college');
      setShowExpertModal(false);
    } catch {
      toast.error('Assignment failed');
    }
  };

  const tabs = [
    { id: 'overview', icon: Storefront, label: 'Jurisdiction' },
    { id: 'compliance', icon: ShieldCheck, label: 'Compliance & Accreditations' },
    { id: 'circulars', icon: Megaphone, label: 'Policies & Circulars' },
    { id: 'submissions', icon: FileText, label: 'Dataset Submissions' },
    { id: 'inspections', icon: MagnifyingGlass, label: 'Audits & Inspections' },
    { id: 'activities', icon: Checks, label: 'Activity Reports' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">AcadMix</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">DHTE Nodal Officer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 text-slate-500">
              {isDark ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
            </button>
            <button className="hidden sm:flex items-center gap-3 bg-slate-50 dark:bg-white/5 rounded-2xl px-4 py-2 border border-slate-100 dark:border-white/5">
              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex flex-col items-center justify-center shrink-0">
                <UserCircle size={18} weight="duotone" className="text-indigo-500" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{user?.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{user?.role}</p>
              </div>
            </button>
            <button onClick={onLogout} className="p-2.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
              <SignOut size={20} weight="duotone" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-8 hide-scrollbar">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === t.id ? 'bg-white dark:bg-[#1A202C] text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                <Icon size={18} weight="duotone" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Active College Territory</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {colleges.map(c => (
                <div key={c.id} className="soft-card p-6 border-t-4 border-indigo-500 group cursor-pointer hover:-translate-y-1 transition-transform">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center mb-4 text-indigo-500"><Storefront size={24} weight="duotone" /></div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 mb-1">{c.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mb-4">{c.domain}</p>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg">NAAC Active</span>
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase rounded-lg">{c.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Circulars Tab */}
        {activeTab === 'circulars' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
              <div>
                <h2 className="text-2xl font-bold">Policy Distribution Center</h2>
                <p className="text-white/80 font-medium text-sm mt-1">Issue state-wide mandates and circulars to college administrators.</p>
              </div>
              <button onClick={() => setShowCircularModal(true)} className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl active:scale-95 transition-transform shadow-lg">Issue Mandate</button>
            </div>
            
            <div className="space-y-4">
              {circulars.map(c => (
                <div key={c.id} className="soft-card p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{c.title}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">{c.content}</p>
                    </div>
                    {c.is_mandatory && <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-lg">Mandatory</span>}
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">College Acknowledgments</p>
                    <div className="flex flex-wrap gap-2">
                      {c.acknowledgments?.map((ack, i) => (
                        <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg">{ack.college_id} ✅</span>
                      ))}
                      {c.acknowledgments?.length === 0 && <span className="text-xs text-amber-500 font-medium">Pending state-wide review...</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Audits & Inspections Tab */}
        {activeTab === 'inspections' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex gap-4">
              <button onClick={() => setShowInspectionModal(true)} className="px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl active:scale-95 transition-transform flex-1 text-center">Log New Inspection</button>
              <button onClick={() => setShowExpertModal(true)} className="px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl active:scale-95 transition-transform flex-1 text-center">Assign Subject Expert</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {inspections.map(insp => (
                <div key={insp.id} className="soft-card p-6">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">College Target</p>
                      <p className="font-extrabold text-slate-800 dark:text-slate-100">{insp.college_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compliance</p>
                      <p className={`font-extrabold ${insp.compliance_score > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{insp.compliance_score}%</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Findings</p>
                      <ul className="text-sm font-medium text-slate-700 dark:text-slate-300 list-disc list-inside">
                        {insp.findings?.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">College Responses</p>
                      {insp.responses?.map((r, i) => (
                        <div key={i} className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-3 rounded-xl mt-2">
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">"{r.response}"</p>
                        </div>
                      ))}
                      {insp.responses?.length === 0 && <p className="text-xs text-amber-500 italic">No response submitted yet.</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <button onClick={() => setShowSubmissionModal(true)} className="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl active:scale-95 transition-transform shadow-lg shadow-violet-500/30">Enforce New Data Collection</button>
            <div className="grid grid-cols-1 gap-4">
              {submissions.map(sub => (
                <div key={sub.id} className="soft-card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">{sub.title}</h3>
                      <p className="text-sm font-medium text-slate-500">{sub.description}</p>
                    </div>
                    <span className="px-3 py-1 bg-violet-50 text-violet-600 text-[10px] font-black uppercase rounded-lg">{sub.data_type} Target</span>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-2">
                     {sub.records?.map((r, i) => (
                       <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg border border-emerald-100">{r.college_id} ✅</span>
                     ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">State-wide Activity Log</h2>
            {activities.map(act => (
              <div key={act.id} className="soft-card p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{act.event_title}</h3>
                  <p className="text-xs font-medium text-slate-500 mb-2">{act.college_id} | Noted by Principal</p>
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase rounded-lg">{act.activity_type}</span>
                </div>
                {act.nodal_acknowledged_at ? (
                  <span className="flex items-center gap-1 text-emerald-500 font-bold text-sm"><Checks weight="bold"/> Logged Internally</span>
                ) : (
                  <button onClick={() => handleAcknowledgeActivity(act.id)} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold transition-colors">Acknowledge</button>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Compliance Fallback Tab */}
        {activeTab === 'compliance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="soft-card p-8 text-center">
              <ShieldCheck size={48} weight="duotone" className="text-indigo-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Automated Compliance Feed</h2>
              <p className="text-slate-500 font-medium max-w-lg mx-auto">This automated matrix aggregates CIA limits, attendance thresholds, and NAAC profiles using the nodal reporting endpoints successfully established in the backend API router.</p>
            </div>
          </motion.div>
        )}

      </main>

      {/* Modals */}
      {showCircularModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Issue Policy Circular</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Mandate Title" className="soft-input w-full" onChange={e => setFormData({...formData, title: e.target.value})} />
              <textarea placeholder="Directives / Content" className="soft-input w-full" rows="3" onChange={e => setFormData({...formData, content: e.target.value})}></textarea>
              <input type="text" placeholder="Document Bucket URL (Optional)" className="soft-input w-full" onChange={e => setFormData({...formData, document_url: e.target.value})} />
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button onClick={() => setShowCircularModal(false)} className="px-5 py-2 text-slate-500 font-bold">Cancel</button>
                <button onClick={handleCreateCircular} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold">Distribute</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInspectionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Log College Audit</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <select className="soft-input flex-1" onChange={e => setFormData({...formData, college_id: e.target.value})}>
                  <option value="">Select Target College</option>
                  {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="date" className="soft-input flex-1" onChange={e => setFormData({...formData, inspection_date: e.target.value})} />
              </div>
              <input type="text" placeholder="Core Finding" className="soft-input w-full" onChange={e => setFormData({...formData, findings: e.target.value})} />
              <input type="text" placeholder="Required Action Point" className="soft-input w-full" onChange={e => setFormData({...formData, action_points: e.target.value})} />
              <input type="number" placeholder="Compliance Matrix Score (%)" className="soft-input w-full" onChange={e => setFormData({...formData, compliance_score: e.target.value})} />
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button onClick={() => setShowInspectionModal(false)} className="px-5 py-2 text-slate-500 font-bold">Cancel</button>
                <button onClick={handleCreateInspection} className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold">File Audit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSubmissionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Request Data Collection</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Requirement Title" className="soft-input w-full" onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="text" placeholder="Description" className="soft-input w-full" onChange={e => setFormData({...formData, description: e.target.value})} />
              <div className="flex gap-4">
                <select className="soft-input flex-1" onChange={e => setFormData({...formData, data_type: e.target.value})}>
                  <option value="enrollment">Enrollment</option>
                  <option value="faculty">Faculty Metrics</option>
                  <option value="placement">Placements</option>
                </select>
                <input type="date" className="soft-input flex-1" onChange={e => setFormData({...formData, deadline: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button onClick={() => setShowSubmissionModal(false)} className="px-5 py-2 text-slate-500 font-bold">Cancel</button>
                <button onClick={handleCreateRequirement} className="px-5 py-2 bg-violet-600 text-white rounded-xl font-bold">Assign Task</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExpertModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Deploy Subject Expert</h3>
            <div className="space-y-4">
              <select className="soft-input w-full" onChange={e => setFormData({...formData, college_id: e.target.value})}>
                <option value="">Target College...</option>
                {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="text" placeholder="Expert User ID (e.g., EXP001)" className="soft-input w-full" onChange={e => setFormData({...formData, expert_user_id: e.target.value})} />
              <input type="text" placeholder="Subject Code (e.g., CS-201)" className="soft-input w-full" onChange={e => setFormData({...formData, subject_code: e.target.value})} />
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button onClick={() => setShowExpertModal(false)} className="px-5 py-2 text-slate-500 font-bold">Cancel</button>
                <button onClick={handleAssignExpert} className="px-5 py-2 bg-indigo-500 text-white rounded-xl font-bold">Bind Expert</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NodalOfficerDashboard;
