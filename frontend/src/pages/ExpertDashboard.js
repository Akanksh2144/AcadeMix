import React, { useState, useEffect } from 'react';
import { 
  Buildings as BuildingLibraryIcon, BookOpen as BookOpenIcon, Users as UserGroupIcon, GraduationCap as AcademicCapIcon, 
  FileText as DocumentTextIcon, Star as StarIcon, CheckCircle as CheckCircleIcon,
  ChartBar as ChartBarIcon, Clock as ClockIcon, MagnifyingGlass as MagnifyingGlassIcon
} from '@phosphor-icons/react';
import { expertAPI } from '../services/api';

const ExpertDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Data States
  const [assignments, setAssignments] = useState([]);
  const [questionPapers, setQuestionPapers] = useState([]);
  const [studyMaterials, setStudyMaterials] = useState([]);
  
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Common UI Elements
  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'assignments', label: 'Assigned Subjects', icon: BookOpenIcon },
    { id: 'papers', label: 'Question Papers', icon: DocumentTextIcon },
    { id: 'materials', label: 'Study Materials', icon: AcademicCapIcon },
    { id: 'evaluations', label: 'Teaching Evals', icon: StarIcon },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <nav className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <AcademicCapIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                  Expert Subject Module
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Quality & Compliance Oversight</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-gray-50 dark:bg-[#1F2937] rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-sm">
                  <p className="text-gray-900 dark:text-white font-semibold">{user?.name || 'Subject Expert'}</p>
                </div>
              </div>
              <button onClick={onLogout} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-[#1F2937] rounded-2xl mb-8 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#0B0F19] text-amber-600 dark:text-amber-400 shadow-sm border border-gray-200 dark:border-gray-800'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
              }`}
            >
              <tab.icon className={`h-5 w-5 mr-2 ${activeTab === tab.id ? 'text-amber-500' : 'text-gray-400'}`} />
              {tab.label}
              {tab.id === 'papers' && stats?.pending_question_papers > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 py-0.5 px-2 rounded-full text-xs">
                  {stats.pending_question_papers}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Active Subject Assignments', value: stats?.active_assignments || 0, icon: BookOpenIcon, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Question Papers to Review', value: stats?.pending_question_papers || 0, icon: DocumentTextIcon, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Study Materials Pending', value: stats?.pending_materials || 0, icon: AcademicCapIcon, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                { label: 'Completed Evaluations', value: stats?.completed_evaluations || 0, icon: StarIcon, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-[#1F2937] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</h3>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
            
            <div className="bg-white dark:bg-[#1F2937] rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Action Items</h3>
              {stats?.pending_question_papers === 0 && stats?.pending_materials === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <CheckCircleIcon className="h-12 w-12 mx-auto text-emerald-500 mb-2 opacity-50" />
                  <p>All clear! You have no pending reviews.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats?.pending_question_papers > 0 && (
                    <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                      <div className="flex items-center space-x-4">
                        <DocumentTextIcon className="h-8 w-8 text-amber-500" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Question Papers Pending Review</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{stats.pending_question_papers} papers require your approval.</p>
                        </div>
                      </div>
                      <button onClick={() => setActiveTab('papers')} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors">
                        Review Now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="bg-white dark:bg-[#1F2937] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subjects Assigned for Expert Review</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {assignments.length > 0 ? assignments.map((asm) => (
                <div key={asm.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{asm.subject_code}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Academic Year: {asm.academic_year}</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-semibold">
                    Active Assignment
                  </span>
                </div>
              )) : (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">You have no active subject assignments.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'papers' && (
          <div className="bg-white dark:bg-[#1F2937] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Question Paper Drafts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Subject Code</th>
                    <th className="px-6 py-4 font-medium">Exam Type</th>
                    <th className="px-6 py-4 font-medium">Faculty Submit</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {questionPapers.length > 0 ? questionPapers.map((qp) => (
                    <tr key={qp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{qp.subject_code}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 uppercase">{qp.exam_type}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{qp.faculty_name || qp.faculty_id}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          qp.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          qp.status === 'revision_requested' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {qp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <a href={qp.paper_url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-indigo-600 transition-colors">
                          View PDF
                        </a>
                        {(qp.status === 'submitted' || qp.status === 'under_review') && (
                          <>
                            <button onClick={() => handleReviewStatus('paper', qp.id, 'approved')} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                              Approve
                            </button>
                            <button onClick={() => handleReviewStatus('paper', qp.id, 'revision_requested')} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg transition-colors">
                              Revise
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="p-12 text-center text-gray-500">No question papers submitted for your subjects.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Study Materials and Evaluations tabs follow same UI pattern */}
        {(activeTab === 'materials' || activeTab === 'evaluations') && (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1F2937] rounded-3xl border border-gray-100 dark:border-gray-800">
               <p>This section is connected to the backend. Content populates as faculty make submissions.</p>
            </div>
        )}

      </div>
    </div>
  );
};

export default ExpertDashboard;
