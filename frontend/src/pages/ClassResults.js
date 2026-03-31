import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChartBar, Clock, Users, Trophy, CheckCircle, XCircle, TrendUp } from '@phosphor-icons/react';

const ClassResults = ({ navigate, user }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Mock data - will be replaced with API calls
  const assignedClasses = [
    { 
      id: 1, 
      section: 'DS-1', 
      subject: 'Data Structures',
      batch: '2024',
      totalStudents: 45
    },
    { 
      id: 2, 
      section: 'DS-2', 
      subject: 'Data Structures',
      batch: '2024',
      totalStudents: 42
    },
    { 
      id: 3, 
      section: 'AIML-1', 
      subject: 'Artificial Intelligence',
      batch: '2024',
      totalStudents: 38
    }
  ];

  const quizResults = {
    'DS-1': [
      {
        id: 1,
        title: 'Arrays and Linked Lists',
        date: '2024-01-28',
        totalStudents: 45,
        completed: 43,
        avgScore: 78.5,
        maxScore: 100,
        passRate: 86,
        topPerformers: [
          { name: 'Rajesh Kumar', score: 98, time: '28 mins' },
          { name: 'Priya Sharma', score: 95, time: '32 mins' },
          { name: 'Amit Patel', score: 92, time: '30 mins' }
        ]
      },
      {
        id: 2,
        title: 'Trees and Graphs',
        date: '2024-01-20',
        totalStudents: 45,
        completed: 45,
        avgScore: 72.3,
        maxScore: 100,
        passRate: 82,
        topPerformers: [
          { name: 'Sneha Singh', score: 96, time: '35 mins' },
          { name: 'Rahul Verma', score: 94, time: '38 mins' },
          { name: 'Anjali Reddy', score: 90, time: '33 mins' }
        ]
      }
    ],
    'DS-2': [
      {
        id: 3,
        title: 'Sorting Algorithms',
        date: '2024-01-25',
        totalStudents: 42,
        completed: 40,
        avgScore: 81.2,
        maxScore: 100,
        passRate: 90,
        topPerformers: [
          { name: 'Vikram Joshi', score: 99, time: '25 mins' },
          { name: 'Pooja Gupta', score: 97, time: '27 mins' },
          { name: 'Karan Singh', score: 95, time: '29 mins' }
        ]
      }
    ],
    'AIML-1': []
  };

  const midMarks = {
    'DS-1': {
      mid1: {
        totalStudents: 45,
        submitted: 45,
        avgMarks: 24.5,
        maxMarks: 30,
        passRate: 88,
        distribution: { excellent: 18, good: 15, average: 8, poor: 4 }
      },
      mid2: {
        totalStudents: 45,
        submitted: 43,
        avgMarks: 25.8,
        maxMarks: 30,
        passRate: 91,
        distribution: { excellent: 22, good: 14, average: 5, poor: 2 }
      }
    },
    'DS-2': {
      mid1: {
        totalStudents: 42,
        submitted: 42,
        avgMarks: 26.2,
        maxMarks: 30,
        passRate: 93,
        distribution: { excellent: 20, good: 16, average: 4, poor: 2 }
      },
      mid2: {
        totalStudents: 42,
        submitted: 40,
        avgMarks: 23.1,
        maxMarks: 30,
        passRate: 85,
        distribution: { excellent: 15, good: 17, average: 6, poor: 2 }
      }
    },
    'AIML-1': {
      mid1: {
        totalStudents: 38,
        submitted: 0,
        avgMarks: 0,
        maxMarks: 30,
        passRate: 0,
        distribution: { excellent: 0, good: 0, average: 0, poor: 0 }
      },
      mid2: {
        totalStudents: 38,
        submitted: 0,
        avgMarks: 0,
        maxMarks: 30,
        passRate: 0,
        distribution: { excellent: 0, good: 0, average: 0, poor: 0 }
      }
    }
  };

  useEffect(() => {
    // Simulate API call
    setTimeout(() => setLoading(false), 500);
  }, []);

  const currentClass = assignedClasses[activeTab];
  const currentQuizzes = quizResults[currentClass.section] || [];
  const currentMidMarks = midMarks[currentClass.section] || { mid1: null, mid2: null };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                data-testid="back-button" 
                onClick={() => navigate('teacher-dashboard')} 
                className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <ArrowLeft size={22} weight="duotone" />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Class Results & Analytics</h1>
                <p className="text-sm font-medium text-slate-400">View quiz results and mid-term marks by class</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
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
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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
              <h2 className="text-2xl font-extrabold text-slate-900">{currentClass.section} - {currentClass.subject}</h2>
              <p className="text-sm font-medium text-slate-500">Batch {currentClass.batch} • {currentClass.totalStudents} Students</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-indigo-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                  <ChartBar size={20} weight="duotone" className="text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Quizzes</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{currentQuizzes.length}</p>
              <p className="text-sm text-slate-600 mt-1">Total conducted</p>
            </div>
            
            <div className="p-4 bg-emerald-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <CheckCircle size={20} weight="duotone" className="text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Completion</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {currentQuizzes.length > 0 
                  ? Math.round((currentQuizzes.reduce((sum, q) => sum + q.completed, 0) / currentQuizzes.reduce((sum, q) => sum + q.totalStudents, 0)) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-slate-600 mt-1">Average rate</p>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Trophy size={20} weight="duotone" className="text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Avg Score</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {currentQuizzes.length > 0 
                  ? (currentQuizzes.reduce((sum, q) => sum + q.avgScore, 0) / currentQuizzes.length).toFixed(1)
                  : 0}%
              </p>
              <p className="text-sm text-slate-600 mt-1">Across all quizzes</p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <TrendUp size={20} weight="duotone" className="text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-purple-600">Pass Rate</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {currentQuizzes.length > 0 
                  ? Math.round(currentQuizzes.reduce((sum, q) => sum + q.passRate, 0) / currentQuizzes.length)
                  : 0}%
              </p>
              <p className="text-sm text-slate-600 mt-1">Average across quizzes</p>
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
              <p className="text-slate-500 font-medium">No quizzes conducted for this class yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {currentQuizzes.map((quiz) => (
                <div key={quiz.id} className="p-6 bg-slate-50 rounded-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{quiz.title}</h4>
                      <p className="text-sm text-slate-500 mt-1">
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
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                        <Users size={20} weight="duotone" className="text-slate-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{quiz.completed}/{quiz.totalStudents}</p>
                        <p className="text-xs text-slate-500">Completed</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                        <Trophy size={20} weight="duotone" className="text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{quiz.avgScore.toFixed(1)}%</p>
                        <p className="text-xs text-slate-500">Average Score</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                        <CheckCircle size={20} weight="duotone" className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{quiz.passRate}%</p>
                        <p className="text-xs text-slate-500">Pass Rate</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                        <TrendUp size={20} weight="duotone" className="text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{quiz.maxScore}</p>
                        <p className="text-xs text-slate-500">Max Score</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-white rounded-xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Top Performers</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {quiz.topPerformers.map((student, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            idx === 0 ? 'bg-amber-100 text-amber-600' :
                            idx === 1 ? 'bg-slate-200 text-slate-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{student.name}</p>
                            <p className="text-xs text-slate-500">{student.score}% • {student.time}</p>
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
                <h4 className="text-lg font-bold text-slate-900">Mid-Term 1</h4>
                {currentMidMarks.mid1?.submitted > 0 ? (
                  <span className="soft-badge bg-emerald-50 text-emerald-600">
                    {currentMidMarks.mid1.submitted}/{currentMidMarks.mid1.totalStudents} Submitted
                  </span>
                ) : (
                  <span className="soft-badge bg-slate-100 text-slate-500">Not Started</span>
                )}
              </div>
              
              {currentMidMarks.mid1?.submitted > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-white rounded-xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Average</p>
                      <p className="text-2xl font-extrabold text-slate-900">
                        {currentMidMarks.mid1.avgMarks.toFixed(1)}/{currentMidMarks.mid1.maxMarks}
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Pass Rate</p>
                      <p className="text-2xl font-extrabold text-slate-900">{currentMidMarks.mid1.passRate}%</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white rounded-xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Distribution</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-600">Excellent (≥80%)</span>
                        <span className="font-bold text-slate-900">{currentMidMarks.mid1.distribution.excellent}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-teal-600">Good (60-79%)</span>
                        <span className="font-bold text-slate-900">{currentMidMarks.mid1.distribution.good}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-amber-600">Average (40-59%)</span>
                        <span className="font-bold text-slate-900">{currentMidMarks.mid1.distribution.average}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-red-600">Poor (&lt;40%)</span>
                        <span className="font-bold text-slate-900">{currentMidMarks.mid1.distribution.poor}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <XCircle size={48} weight="duotone" className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No marks entered yet</p>
                </div>
              )}
            </div>

            {/* Mid-2 */}
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-slate-900">Mid-Term 2</h4>
                {currentMidMarks.mid2?.submitted > 0 ? (
                  <span className="soft-badge bg-emerald-50 text-emerald-600">
                    {currentMidMarks.mid2.submitted}/{currentMidMarks.mid2.totalStudents} Submitted
                  </span>
                ) : (
                  <span className="soft-badge bg-slate-100 text-slate-500">Not Started</span>
                )}
              </div>
              
              {currentMidMarks.mid2?.submitted > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-white rounded-xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Average</p>
                      <p className="text-2xl font-extrabold text-slate-900">
                        {currentMidMarks.mid2.avgMarks.toFixed(1)}/{currentMidMarks.mid2.maxMarks}
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Pass Rate</p>
                      <p className="text-2xl font-extrabold text-slate-900">{currentMidMarks.mid2.passRate}%</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white rounded-xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Distribution</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-600">Excellent (≥80%)</span>
                        <span className="font-bold text-slate-900">{currentMidMarks.mid2.distribution.excellent}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-teal-600">Good (60-79%)</span>
                        <span className="font-bold text-slate-900">{currentMidMarks.mid2.distribution.good}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-amber-600">Average (40-59%)</span>
                        <span className="font-bold text-slate-900">{currentMidMarks.mid2.distribution.average}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-red-600">Poor (&lt;40%)</span>
                        <span className="font-bold text-slate-900">{currentMidMarks.mid2.distribution.poor}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <XCircle size={48} weight="duotone" className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No marks entered yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassResults;
