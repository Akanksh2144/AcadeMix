import React, { useState, useEffect } from 'react';
import { ChartBar, Clock, Users, Trophy, CheckCircle, XCircle, TrendUp, CircleNotch, CaretUp, CaretDown } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader';
import { analyticsAPI } from '../services/api';

const ClassResults = ({ navigate, user }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [quizResults, setQuizResults] = useState({});
  const [midMarks, setMidMarks] = useState({});

  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizDetails, setQuizDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'rollNo', direction: 'asc' });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data } = await analyticsAPI.classResults();
        setAssignedClasses(data.assignedClasses || []);
        setQuizResults(data.quizResults || {});
        setMidMarks(data.midMarks || {});
      } catch (err) {
        console.error("Failed to fetch class analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const currentClass = assignedClasses[activeTab] || null;
  const currentQuizzes = currentClass ? (quizResults[currentClass.class_key] || []) : [];
  const currentMidMarks = currentClass ? (midMarks[currentClass.class_key] || { mid1: null, mid2: null }) : { mid1: null, mid2: null };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };
  
  const sortedDetails = [...quizDetails].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const openQuizDetails = async (quiz) => {
    if (!currentClass) return;
    setSelectedQuiz(quiz);
    setIsQuizModalOpen(true);
    setDetailsLoading(true);
    try {
      const { data } = await analyticsAPI.quizDetails(quiz.id, currentClass.department, currentClass.batch, currentClass.rawSection);
      setQuizDetails(data || []);
    } catch (err) {
      console.error("Failed to load quiz detailed analytics", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader
        navigate={navigate} user={user} title="Class Results & Analytics"
        subtitle="View quiz results and mid-term marks by class"
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <CircleNotch size={48} weight="bold" className="text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Crunching analytics...</p>
          </div>
        ) : !currentClass ? (
          <div className="soft-card p-12 text-center mt-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">No Classes Assigned</h3>
            <p className="text-slate-500 dark:text-slate-400">You don't have any classes assigned to you yet.</p>
          </div>
        ) : (
          <>
            {/* Class Tabs */}
            <div className="soft-card p-2 mb-8">
              <div className="flex items-center gap-2 overflow-x-auto">
                {assignedClasses.map((cls, index) => (
                  <button
                    key={cls.id}
                    onClick={() => setActiveTab(index)}
                    className={`px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${
                      activeTab === index
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{cls.section}</span>
                      <span className="text-xs opacity-70">({cls.totalStudents})</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Class Overview */}
            <div className="soft-card p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{currentClass.section} - {currentClass.subject}</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Batch {currentClass.batch} • {currentClass.totalStudents} Students</p>
                </div>
              </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-500/15 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/150 rounded-xl flex items-center justify-center">
                  <ChartBar size={20} weight="duotone" className="text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Quizzes</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{currentQuizzes.length}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Total conducted</p>
            </div>
            
            <div className="p-4 bg-emerald-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <CheckCircle size={20} weight="duotone" className="text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Completion</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {currentQuizzes.length > 0 
                  ? Math.round((currentQuizzes.reduce((sum, q) => sum + q.completed, 0) / currentQuizzes.reduce((sum, q) => sum + q.totalStudents, 0)) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Average rate</p>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Trophy size={20} weight="duotone" className="text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Avg Score</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {currentQuizzes.length > 0 
                  ? (currentQuizzes.reduce((sum, q) => sum + q.avgScore, 0) / currentQuizzes.length).toFixed(1)
                  : 0}%
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Across all quizzes</p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <TrendUp size={20} weight="duotone" className="text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-purple-600">Pass Rate</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {currentQuizzes.length > 0 
                  ? Math.round(currentQuizzes.reduce((sum, q) => sum + q.passRate, 0) / currentQuizzes.length)
                  : 0}%
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Average across quizzes</p>
            </div>
          </div>
        </div>

        {/* Quiz Results Section */}
        <div className="soft-card p-6 mb-8">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <ChartBar size={24} weight="duotone" className="text-indigo-500" />
            Quiz Results
          </h3>
          
          {currentQuizzes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChartBar size={32} weight="duotone" className="text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No quizzes conducted for this class yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentQuizzes.map((quiz) => (
                <div key={quiz.id} onClick={() => openQuizDetails(quiz)} className="cursor-pointer bg-white dark:bg-[#1A202C] border border-slate-100 dark:border-slate-700 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">{quiz.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        <Clock size={14} weight="duotone" className="inline mr-1" />
                        {quiz.date}
                      </p>
                    </div>
                    <span className={`soft-badge ${
                      quiz.avgScore >= 80 ? 'bg-emerald-50 text-emerald-600' :
                      quiz.avgScore >= 60 ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {quiz.avgScore.toFixed(1)}% Avg
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl dark:bg-[#1A202C] flex items-center justify-center">
                        <Users size={20} weight="duotone" className="text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{quiz.completed}/{quiz.totalStudents}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl dark:bg-[#1A202C] flex items-center justify-center">
                        <Trophy size={20} weight="duotone" className="text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{quiz.avgScore.toFixed(1)}%</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Average Score</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl dark:bg-[#1A202C] flex items-center justify-center">
                        <CheckCircle size={20} weight="duotone" className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{quiz.passRate}%</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Pass Rate</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl dark:bg-[#1A202C] flex items-center justify-center">
                        <TrendUp size={20} weight="duotone" className="text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{quiz.maxScore}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Max Score</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-white rounded-xl dark:bg-[#1A202C]">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Top Performers</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {quiz.topPerformers.map((student, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            idx === 0 ? 'bg-amber-100 text-amber-600' :
                            idx === 1 ? 'bg-slate-200 text-slate-600 dark:text-slate-400' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{student.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{student.score}% • {student.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mid-term Marks Section */}
        <div className="soft-card p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <CheckCircle size={24} weight="duotone" className="text-emerald-500" />
            Mid-term Marks
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mid-1 */}
            <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Mid-Term 1</h4>
                {currentMidMarks.mid1?.submitted > 0 ? (
                  <span className="soft-badge bg-emerald-50 text-emerald-600">
                    {currentMidMarks.mid1.submitted}/{currentMidMarks.mid1.totalStudents} Submitted
                  </span>
                ) : (
                  <span className="soft-badge bg-slate-100 text-slate-500 dark:text-slate-400">Not Started</span>
                )}
              </div>
              
              {currentMidMarks.mid1?.submitted > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-white rounded-xl dark:bg-[#1A202C]">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Average</p>
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {currentMidMarks.mid1.avgMarks.toFixed(1)}/{currentMidMarks.mid1.maxMarks}
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-xl dark:bg-[#1A202C]">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Pass Rate</p>
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{currentMidMarks.mid1.passRate}%</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white rounded-xl dark:bg-[#1A202C]">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Distribution</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-600">Excellent (≥80%)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{currentMidMarks.mid1.distribution.excellent}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-teal-600">Good (60-79%)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{currentMidMarks.mid1.distribution.good}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-amber-600">Average (40-59%)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{currentMidMarks.mid1.distribution.average}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-red-600">Poor (&lt;40%)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{currentMidMarks.mid1.distribution.poor}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <XCircle size={48} weight="duotone" className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No marks entered yet</p>
                </div>
              )}
            </div>

            {/* Mid-2 */}
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Mid-Term 2</h4>
                {currentMidMarks.mid2?.submitted > 0 ? (
                  <span className="soft-badge bg-emerald-50 text-emerald-600">
                    {currentMidMarks.mid2.submitted}/{currentMidMarks.mid2.totalStudents} Submitted
                  </span>
                ) : (
                  <span className="soft-badge bg-slate-100 text-slate-500 dark:text-slate-400">Not Started</span>
                )}
              </div>
              
              {currentMidMarks.mid2?.submitted > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-white rounded-xl dark:bg-[#1A202C]">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Average</p>
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {currentMidMarks.mid2.avgMarks.toFixed(1)}/{currentMidMarks.mid2.maxMarks}
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-xl dark:bg-[#1A202C]">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Pass Rate</p>
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{currentMidMarks.mid2.passRate}%</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white rounded-xl dark:bg-[#1A202C]">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Distribution</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-600">Excellent (≥80%)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{currentMidMarks.mid2.distribution.excellent}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-teal-600">Good (60-79%)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{currentMidMarks.mid2.distribution.good}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-amber-600">Average (40-59%)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{currentMidMarks.mid2.distribution.average}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-red-600">Poor (&lt;40%)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{currentMidMarks.mid2.distribution.poor}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <XCircle size={48} weight="duotone" className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No marks entered yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Quiz Details Modal */}
      {isQuizModalOpen && selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl dark:bg-[#1A202C] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50/50">
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">{selectedQuiz.title}</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span className="flex items-center gap-1"><Clock size={14} weight="bold" /> {selectedQuiz.date}</span>
                  <span>•</span>
                  <span>{selectedQuiz.completed}/{selectedQuiz.totalStudents} Completed</span>
                </p>
              </div>
              <button 
                onClick={() => setIsQuizModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                title="Close"
              >
                <XCircle size={28} weight="fill" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-0 sm:p-4">
              {detailsLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <CircleNotch size={40} weight="bold" className="text-indigo-500 animate-spin mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Fetching student performance...</p>
                </div>
              ) : (
                <div className="border border-slate-100 dark:border-slate-700 sm:rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        {[
                          { label: 'Student', key: 'name' },
                          { label: 'Roll No', key: 'rollNo' },
                          { label: 'Score', key: 'scoreValue' },
                          { label: 'Status', key: 'status' },
                          { label: 'Time Taken', key: 'timeTaken' }
                        ].map((col) => (
                          <th 
                            key={col.key} 
                            onClick={() => handleSort(col.key)}
                            className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-200 transition-colors select-none"
                          >
                            <div className="flex items-center gap-2">
                              {col.label}
                              <div className="flex flex-col opacity-50">
                                <CaretUp size={10} weight="fill" className={sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'text-indigo-600 opacity-100' : ''} />
                                <CaretDown size={10} weight="fill" className={sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'text-indigo-600 opacity-100' : '-mt-[2px]'} />
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sortedDetails.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50 dark:bg-slate-800/50 hover:shadow-sm transition-all duration-200">
                          <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{student.name}</td>
                          <td className="p-4 text-sm font-medium text-slate-500 dark:text-slate-400">{student.rollNo}</td>
                          <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{student.score}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                              student.status === 'Pass' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              student.status === 'Fail' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              student.status === 'In Progress' ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 border border-indigo-100 animate-pulse' :
                              'bg-slate-100 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}>{student.status}</span>
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-500 dark:text-slate-400">{student.timeTaken}</td>
                        </tr>
                      ))}
                      {sortedDetails.length === 0 && (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                            No records found for this quiz.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassResults;
