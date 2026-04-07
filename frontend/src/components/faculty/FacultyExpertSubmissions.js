import React, { useState, useEffect } from 'react';
import { facultyPanelAPI } from '../../services/api';
import { FileText, Desktop, Star, Plus } from '@phosphor-icons/react';
import { toast } from 'sonner';

const FacultyExpertSubmissions = () => {
  const [activeTab, setActiveTab] = useState('papers');
  
  const [papers, setPapers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('paper');
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pp, md, ev] = await Promise.all([
        facultyPanelAPI.getQuestionPapers(),
        facultyPanelAPI.getStudyMaterials(),
        facultyPanelAPI.getTeachingEvaluations()
      ]);
      setPapers(pp.data);
      setMaterials(md.data);
      setEvaluations(ev.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    try {
      if (modalType === 'paper') {
        const payload = {
          subject_code: formData.subject_code,
          academic_year: formData.academic_year || '2024-2025',
          semester: parseInt(formData.semester || 1),
          exam_type: formData.exam_type || 'Internal',
          paper_url: formData.paper_url || 'https://example.com/draft_paper.pdf'
        };
        await facultyPanelAPI.submitQuestionPaper(payload);
        toast.success("Question paper submitted to expert");
      } else {
        const payload = {
          subject_code: formData.subject_code,
          title: formData.title,
          description: formData.description || '',
          material_url: formData.material_url || 'https://example.com/material.pdf',
          material_type: formData.material_type || 'notes'
        };
        await facultyPanelAPI.submitStudyMaterial(payload);
        toast.success("Study material submitted");
      }
      setShowModal(false);
      setFormData({});
      fetchData();
    } catch (e) {
      toast.error('Failed to submit');
    }
  };

  return (
    <div className="soft-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Expert Module Hub</h3>
        <div className="flex gap-3">
          <button onClick={() => { setModalType('paper'); setShowModal(true); }} className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-xl font-semibold flex items-center gap-2 text-sm transition-colors">
            <Plus weight="bold" /> New QP Draft
          </button>
          <button onClick={() => { setModalType('material'); setShowModal(true); }} className="px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 rounded-xl font-semibold flex items-center gap-2 text-sm transition-colors">
            <Plus weight="bold" /> Upload Material
          </button>
        </div>
      </div>

      <div className="flex space-x-6 mb-6 border-b border-slate-100 dark:border-white/5 pb-2">
        <button onClick={() => setActiveTab('papers')} className={`pb-2 font-semibold text-sm ${activeTab === 'papers' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Question Papers</button>
        <button onClick={() => setActiveTab('materials')} className={`pb-2 font-semibold text-sm ${activeTab === 'materials' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500'}`}>Study Materials</button>
        <button onClick={() => setActiveTab('evaluations')} className={`pb-2 font-semibold text-sm ${activeTab === 'evaluations' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`}>My Evaluations</button>
      </div>

      {activeTab === 'papers' && (
        <div className="space-y-3">
          {papers.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 rounded-xl flex items-center justify-center"><FileText size={20} weight="duotone" /></div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{p.subject_code} - {p.exam_type}</p>
                  <p className="text-xs text-slate-500">Sem {p.semester} | {p.academic_year}</p>
                  {p.status === 'revision_requested' && p.expert_comments && <p className="text-xs text-red-500 mt-1 font-medium">Expert feedback: {p.expert_comments}</p>}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : p.status === 'revision_requested' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
            </div>
          ))}
          {papers.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No question papers submitted</p>}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-3">
          {materials.map(m => (
            <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 text-purple-500 rounded-xl flex items-center justify-center"><Desktop size={20} weight="duotone" /></div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{m.title} <span className="text-sm text-slate-400">({m.subject_code})</span></p>
                  <p className="text-xs text-slate-500">{m.description || m.material_type}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${m.status === 'expert_approved' ? 'bg-emerald-100 text-emerald-700' : m.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
            </div>
          ))}
          {materials.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No study materials submitted</p>}
        </div>
      )}

      {activeTab === 'evaluations' && (
        <div className="space-y-3">
          {evaluations.map(e => (
            <div key={e.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-slate-800 dark:text-slate-100">Evaluated on {e.evaluation_date}</p>
                <div className="flex items-center gap-2"><Star weight="fill" className="text-emerald-500"/> <span className="font-extrabold text-emerald-500 text-xl">{e.overall_rating.toFixed(1)}/5.0</span></div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg text-center"><p className="text-xs text-slate-500">Methodology</p><p className="font-bold">{e.methodology_rating}</p></div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg text-center"><p className="text-xs text-slate-500">Engagement</p><p className="font-bold">{e.engagement_rating}</p></div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg text-center"><p className="text-xs text-slate-500">Assessment</p><p className="font-bold">{e.assessment_quality_rating}</p></div>
              </div>
              {e.comments && <p className="text-sm border-t border-slate-100 dark:border-white/5 pt-2 mt-2 font-medium text-slate-600 dark:text-slate-400">"{e.comments}"</p>}
            </div>
          ))}
          {evaluations.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No evaluations available yet.</p>}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">{modalType === 'paper' ? 'Submit Question Paper' : 'Upload Study Material'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Subject Code (e.g., CS201)" className="soft-input w-full" onChange={e => setFormData({...formData, subject_code: e.target.value})} />
              {modalType === 'paper' ? (
                <>
                  <input type="text" placeholder="Exam Type (Internal, Final)" className="soft-input w-full" onChange={e => setFormData({...formData, exam_type: e.target.value})} />
                  <div className="flex gap-4">
                    <input type="number" placeholder="Semester" className="soft-input flex-1" onChange={e => setFormData({...formData, semester: e.target.value})} />
                    <input type="text" placeholder="Academic Year" className="soft-input flex-1" onChange={e => setFormData({...formData, academic_year: e.target.value})} />
                  </div>
                  <input type="text" placeholder="Paper URL (optional)" className="soft-input w-full" onChange={e => setFormData({...formData, paper_url: e.target.value})} />
                </>
              ) : (
                <>
                  <input type="text" placeholder="Title" className="soft-input w-full" onChange={e => setFormData({...formData, title: e.target.value})} />
                  <textarea placeholder="Description" className="soft-input w-full py-2" rows="3" onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                  <input type="text" placeholder="Material URL" className="soft-input w-full" onChange={e => setFormData({...formData, material_url: e.target.value})} />
                </>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button onClick={() => setShowModal(false)} className="px-5 py-2 text-slate-500 font-bold">Cancel</button>
                <button onClick={handleCreate} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30">Submit for Review</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyExpertSubmissions;
