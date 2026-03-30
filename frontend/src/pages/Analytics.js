import React from 'react';
import { ArrowLeft, TrendUp, Target, BookOpen, CheckCircle } from '@phosphor-icons/react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const Analytics = ({ navigate, userRole }) => {
  const performanceTrend = [
    { month: 'Aug', quizScore: 75, cgpa: 8.2 },
    { month: 'Sep', quizScore: 82, cgpa: 8.3 },
    { month: 'Oct', quizScore: 85, cgpa: 8.4 },
    { month: 'Nov', quizScore: 88, cgpa: 8.5 },
    { month: 'Dec', quizScore: 86, cgpa: 8.5 },
    { month: 'Jan', quizScore: 90, cgpa: 8.7 },
  ];

  const subjectComparison = [
    { subject: 'DBMS', quizAvg: 84, semesterMarks: 85 },
    { subject: 'OS', quizAvg: 82, semesterMarks: 78 },
    { subject: 'Networks', quizAvg: 88, semesterMarks: 82 },
    { subject: 'SE', quizAvg: 86, semesterMarks: 88 },
  ];

  const strengthsWeaknesses = [
    { category: 'Problem Solving', score: 92 },
    { category: 'Theory', score: 85 },
    { category: 'Coding', score: 88 },
    { category: 'SQL', score: 90 },
    { category: 'Networking', score: 78 },
  ];

  const questionTypeAccuracy = [
    { name: 'MCQ', value: 87 },
    { name: 'True/False', value: 92 },
    { name: 'Short Answer', value: 82 },
    { name: 'Coding', value: 85 },
  ];

  const COLORS = ['#FF9EC6', '#A1E3D8', '#B4D8E7', '#FDF5A9'];

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Header */}
      <header className="bg-[#FDFCF8] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              data-testid="back-button"
              onClick={() => navigate(userRole === 'student' ? 'student-dashboard' : 'teacher-dashboard')}
              className="neo-button p-2 bg-white"
            >
              <ArrowLeft size={24} weight="bold" />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">Performance Analytics</h1>
              <p className="text-sm font-medium text-[#0A0A0A]/60">Comprehensive academic insights</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="neo-card p-6" data-testid="overall-score-metric">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">Overall Score</span>
              <Target size={20} weight="bold" className="text-[#FF9EC6]" />
            </div>
            <p className="text-3xl font-black">86.5%</p>
            <div className="flex items-center gap-1 mt-2 text-sm font-bold text-[#A1E3D8]">
              <TrendUp size={16} weight="bold" />
              <span>+4.2% from last month</span>
            </div>
          </div>
          <div className="neo-card p-6" data-testid="quiz-completion-metric">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">Quiz Completion</span>
              <CheckCircle size={20} weight="bold" className="text-[#A1E3D8]" />
            </div>
            <p className="text-3xl font-black">96%</p>
            <p className="text-sm font-medium text-[#0A0A0A]/60 mt-2">24 out of 25 quizzes</p>
          </div>
          <div className="neo-card p-6" data-testid="study-hours-metric">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">Study Hours</span>
              <BookOpen size={20} weight="bold" className="text-[#B4D8E7]" />
            </div>
            <p className="text-3xl font-black">142h</p>
            <p className="text-sm font-medium text-[#0A0A0A]/60 mt-2">This semester</p>
          </div>
          <div className="neo-card p-6" data-testid="improvement-rate-metric">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">Improvement</span>
              <TrendUp size={20} weight="bold" className="text-[#FDF5A9]" />
            </div>
            <p className="text-3xl font-black">+15%</p>
            <p className="text-sm font-medium text-[#0A0A0A]/60 mt-2">Since start of sem</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Performance Trend */}
          <div className="neo-card p-6">
            <h3 className="text-xl font-bold mb-4">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceTrend}>
                <CartesianGrid strokeWidth={2} stroke="#0A0A0A" strokeDasharray="0" />
                <XAxis dataKey="month" stroke="#0A0A0A" style={{ fontWeight: 'bold' }} />
                <YAxis stroke="#0A0A0A" style={{ fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{
                    border: '2px solid #0A0A0A',
                    boxShadow: '4px 4px 0px 0px #0A0A0A',
                    borderRadius: 0,
                    fontWeight: 'bold'
                  }}
                />
                <Legend wrapperStyle={{ fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="quizScore" stroke="#FF9EC6" strokeWidth={3} dot={{ fill: '#FF9EC6', r: 6, strokeWidth: 2, stroke: '#0A0A0A' }} name="Quiz Score" />
                <Line type="monotone" dataKey="cgpa" stroke="#A1E3D8" strokeWidth={3} dot={{ fill: '#A1E3D8', r: 6, strokeWidth: 2, stroke: '#0A0A0A' }} name="CGPA (x10)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Subject Comparison */}
          <div className="neo-card p-6">
            <h3 className="text-xl font-bold mb-4">Quiz vs Semester Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectComparison}>
                <CartesianGrid strokeWidth={2} stroke="#0A0A0A" strokeDasharray="0" />
                <XAxis dataKey="subject" stroke="#0A0A0A" style={{ fontWeight: 'bold' }} />
                <YAxis stroke="#0A0A0A" style={{ fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{
                    border: '2px solid #0A0A0A',
                    boxShadow: '4px 4px 0px 0px #0A0A0A',
                    borderRadius: 0,
                    fontWeight: 'bold'
                  }}
                />
                <Legend wrapperStyle={{ fontWeight: 'bold' }} />
                <Bar dataKey="quizAvg" fill="#B4D8E7" stroke="#0A0A0A" strokeWidth={2} name="Quiz Average" />
                <Bar dataKey="semesterMarks" fill="#FF9EC6" stroke="#0A0A0A" strokeWidth={2} name="Semester Marks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Strengths & Weaknesses */}
          <div className="neo-card p-6">
            <h3 className="text-xl font-bold mb-4">Skills Radar</h3>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={strengthsWeaknesses}>
                <PolarGrid stroke="#0A0A0A" strokeWidth={2} />
                <PolarAngleAxis dataKey="category" stroke="#0A0A0A" style={{ fontWeight: 'bold', fontSize: '12px' }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#0A0A0A" />
                <Radar name="Score" dataKey="score" stroke="#FF9EC6" fill="#FF9EC6" fillOpacity={0.6} strokeWidth={3} />
                <Tooltip 
                  contentStyle={{
                    border: '2px solid #0A0A0A',
                    boxShadow: '4px 4px 0px 0px #0A0A0A',
                    borderRadius: 0,
                    fontWeight: 'bold'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Question Type Accuracy */}
          <div className="neo-card p-6">
            <h3 className="text-xl font-bold mb-4">Question Type Accuracy</h3>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={questionTypeAccuracy}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="#0A0A0A"
                  strokeWidth={2}
                >
                  {questionTypeAccuracy.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    border: '2px solid #0A0A0A',
                    boxShadow: '4px 4px 0px 0px #0A0A0A',
                    borderRadius: 0,
                    fontWeight: 'bold'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="neo-card p-6 bg-gradient-to-br from-[#A1E3D8] to-[#B4D8E7]">
            <h4 className="text-lg font-bold mb-3">💪 Strengths</h4>
            <ul className="space-y-2 text-sm font-medium">
              <li>• Excellent at problem-solving questions (92%)</li>
              <li>• Strong SQL and database concepts</li>
              <li>• Consistent improvement trend</li>
            </ul>
          </div>
          <div className="neo-card p-6 bg-gradient-to-br from-[#FDF5A9] to-[#FF9EC6]">
            <h4 className="text-lg font-bold mb-3">🎯 Areas to Improve</h4>
            <ul className="space-y-2 text-sm font-medium">
              <li>• Focus more on networking concepts</li>
              <li>• Practice more short answer questions</li>
              <li>• Review OS process management</li>
            </ul>
          </div>
          <div className="neo-card p-6 bg-gradient-to-br from-[#FF9EC6] to-[#A1E3D8]">
            <h4 className="text-lg font-bold mb-3">💡 Recommendations</h4>
            <ul className="space-y-2 text-sm font-medium">
              <li>• Take practice quizzes on weak topics</li>
              <li>• Aim for 90%+ in next 3 quizzes</li>
              <li>• Join study group for networking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;