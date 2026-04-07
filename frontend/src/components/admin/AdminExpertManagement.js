import React, { useState, useEffect } from 'react';
import { adminPhase1API } from '../../services/api';
import { UserCircle, BookOpen, Plus } from '@phosphor-icons/react';
import { toast } from 'sonner';

const AdminExpertManagement = () => {
  const [experts, setExperts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchExperts();
  }, []);

  const fetchExperts = async () => {
    try {
      const res = await adminPhase1API.getExperts();
      setExperts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async () => {
    try {
      await adminPhase1API.assignExpert({
        expert_user_id: formData.expert_user_id,
        subject_code: formData.subject_code,
        department_id: formData.department_id || 'TEMP_DEPT_01',
        academic_year: formData.academic_year || '2024-2025'
      });
      toast.success("Expert assigned successfully");
      setShowModal(false);
      setFormData({});
      // Note: In a complete implementation, we might fetch assignments per expert here
    } catch (e) {
      toast.error('Failed to assign expert');
    }
  };

  return (
    <div className="soft-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Expert Management</h3>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl font-semibold flex items-center gap-2 text-sm transition-colors shadow-lg shadow-slate-900/20 active:scale-95">
          <Plus weight="bold" /> Assign Subject to Expert
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Expert Profile</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {experts.map(e => (
              <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <UserCircle size={20} weight="duotone" className="text-slate-500" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-slate-100">{e.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">#{e.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{e.email}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg tracking-wider">Expert</span></td>
              </tr>
            ))}
            {experts.length === 0 && <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-500">No experts found in the system.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Assign Subject</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Expert</label>
                <select className="soft-input w-full" onChange={e => setFormData({...formData, expert_user_id: e.target.value})}>
                  <option value="">Choose an expert...</option>
                  {experts.map(ex => <option key={ex.id} value={ex.id}>{ex.name} ({ex.id})</option>)}
                  <option value="EXP001">Dr. S. K. Sharma (EXP001)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject Code</label>
                <input type="text" placeholder="e.g., CS-101" className="soft-input w-full" onChange={e => setFormData({...formData, subject_code: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button onClick={() => setShowModal(false)} className="px-5 py-2 text-slate-500 font-bold">Cancel</button>
                <button onClick={handleAssign} className="px-5 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-slate-900/20">Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExpertManagement;
