import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendUp, Target, BookOpen, CheckCircle, GraduationCap, ChartBar } from '@phosphor-icons/react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { analyticsAPI } from '../services/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl p-3 shadow-lg border border-slate-100">
        <p className="font-bold text-sm text-slate-800">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-medium" style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = ({ navigate, user, userRole }) => {
  const [activeTab, setActiveTab] = useState('quiz');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const role = userRole || user?.role;

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.id) {
          const { data } = await analyticsAPI.student(user.id);
          setAnalytics(data);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const performanceTrend = [
    { month: 'Aug', quizScore: 75, cgpa: 8.2 }, { month: 'Sep', quizScore: 82, cgpa: 8.3 },
    { month: 'Oct', quizScore: 85, cgpa: 8.4 }, { month: 'Nov', quizScore: 88, cgpa: 8.5 },
    { month: 'Dec', quizScore: 86, cgpa: 8.5 }, { month: 'Jan', quizScore: 90, cgpa: 8.7 },
  ];
  const strengthsWeaknesses = [
    { category: 'Problem Solving', score: 92 }, { category: 'Theory', score: 85 }, { category: 'Coding', score: 88 },
    { category: 'SQL', score: 90 }, { category: 'Networking', score: 78 },
  ];
  const questionTypeAccuracy = [
    { name: 'MCQ', value: 87 }, { name: 'True/False', value: 92 }, { name: 'Short Answer', value: 82 }, { name: 'Coding', value: 85 },
  ];
  const COLORS = ['#6366F1', '#14B8A6', '#F59E0B', '#EC4899'];

  const semesterData = analytics?.semesters || [
    { semester: 1, sgpa: 9.10, cgpa: 9.10 },
    { semester: 2, sgpa: 9.55, cgpa: 9.33 },
    { semester: 3, sgpa: 7.60, cgpa: 8.59 },
  ];

  const subjectAvg = analytics?.subject_averages || {};
  const subjectComparison = Object.entries(subjectAvg).map(([subject, avg]) => ({ subject, quizAvg: avg }));
  if (subjectComparison.length === 0) {
    subjectComparison.push(
      { subject: 'DBMS', quizAvg: 84 }, { subject: 'OS', quizAvg: 82 },
      { subject: 'Networks', quizAvg: 88 }, { subject: 'SE', quizAvg: 86 },
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button data-testid="back-button" onClick={() => navigate(role === 'student' ? 'student-dashboard' : role === 'hod' ? 'hod-dashboard' : role === 'exam_cell' ? 'examcell-dashboard' : role === 'admin' ? 'admin-dashboard' : 'teacher-dashboard')}
              className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors">
              <ArrowLeft size={22} weight="duotone" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Performance Analytics</h1>
              <p className="text-sm font-medium text-slate-400">Comprehensive academic insights</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5 w-fit mb-8" data-testid="analytics-tabs">
          <button
            data-testid="quiz-tab"
            onClick={() => setActiveTab('quiz')}
            className={`pill-tab flex items-center gap-2 ${activeTab === 'quiz' ? 'pill-tab-active' : 'pill-tab-inactive'}`}
          >
            <ChartBar size={18} weight="duotone" />
            Quiz Analytics
          </button>
          <button
            data-testid="semester-tab"
            onClick={() => setActiveTab('semester')}
            className={`pill-tab flex items-center gap-2 ${activeTab === 'semester' ? 'pill-tab-active' : 'pill-tab-inactive'}`}
          >
            <GraduationCap size={18} weight="duotone" />
            Semester Analytics
          </button>
        </div>

        {/* Quiz Analytics Tab */}
        {activeTab === 'quiz' && (
          <div data-testid="quiz-analytics-content">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Overall Score', value: analytics?.avg_score ? `${analytics.avg_score}%` : '86.5%', sub: 'Average across all quizzes', icon: Target, color: 'bg-indigo-50 text-indigo-500', subColor: 'text-emerald-500' },
                { label: 'Quiz Completion', value: `${analytics?.total_quizzes || 24}`, sub: 'Total quizzes taken', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-500' },
                { label: 'Best Score', value: analytics?.best_score ? `${analytics.best_score}%` : '95%', sub: 'Highest quiz score', icon: TrendUp, color: 'bg-sky-50 text-sky-500' },
                { label: 'Improvement', value: '+15%', sub: 'Since start of semester', icon: TrendUp, color: 'bg-amber-50 text-amber-500' },
              ].map((stat, i) => (
                <div key={i} className="soft-card p-6" data-testid={`quiz-${stat.label.toLowerCase().replace(/\s+/g, '-')}-metric`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
                    <div className={`${stat.color} p-2 rounded-xl`}><stat.icon size={18} weight="duotone" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900">{stat.value}</p>
                  <p className={`text-sm font-medium mt-1 ${stat.subColor || 'text-slate-400'}`}>{stat.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Quiz Performance Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.quiz_trend?.length > 0 ? analytics.quiz_trend.map((t, i) => ({ name: `Q${i+1}`, score: t.score })) : performanceTrend.map(p => ({ name: p.month, score: p.quizScore }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={3} dot={{ fill: '#6366F1', r: 5 }} name="Score %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Subject-wise Quiz Average</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subjectComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="subject" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="quizAvg" fill="#6366F1" radius={[8, 8, 0, 0]} name="Quiz Average %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Skills Radar</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={strengthsWeaknesses}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="category" stroke="#64748B" style={{ fontWeight: 'bold', fontSize: '11px' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#CBD5E1" />
                    <Radar name="Score" dataKey="score" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Question Type Accuracy</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={questionTypeAccuracy} cx="50%" cy="50%" labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`} outerRadius={120} dataKey="value" strokeWidth={0}>
                      {questionTypeAccuracy.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="soft-card p-6 bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                <h4 className="text-lg font-bold mb-3">Strengths</h4>
                <ul className="space-y-2 text-sm font-medium text-white/90">
                  <li>Excellent at problem-solving questions (92%)</li>
                  <li>Strong SQL and database concepts</li>
                  <li>Consistent improvement trend</li>
                </ul>
              </div>
              <div className="soft-card p-6 bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                <h4 className="text-lg font-bold mb-3">Areas to Improve</h4>
                <ul className="space-y-2 text-sm font-medium text-white/90">
                  <li>Focus more on networking concepts</li>
                  <li>Practice more short answer questions</li>
                  <li>Review OS process management</li>
                </ul>
              </div>
              <div className="soft-card p-6 bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                <h4 className="text-lg font-bold mb-3">Recommendations</h4>
                <ul className="space-y-2 text-sm font-medium text-white/90">
                  <li>Take practice quizzes on weak topics</li>
                  <li>Aim for 90%+ in next 3 quizzes</li>
                  <li>Join study group for networking</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Semester Analytics Tab */}
        {activeTab === 'semester' && (
          <div data-testid="semester-analytics-content">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Current CGPA', value: analytics?.latest_cgpa?.toFixed(2) || semesterData[semesterData.length - 1]?.cgpa?.toFixed(2) || '-', sub: 'Cumulative GPA', icon: GraduationCap, color: 'bg-indigo-50 text-indigo-500' },
                { label: 'Latest SGPA', value: semesterData[semesterData.length - 1]?.sgpa?.toFixed(2) || '-', sub: `Semester ${semesterData.length}`, icon: Target, color: 'bg-emerald-50 text-emerald-500' },
                { label: 'Semesters', value: semesterData.length, sub: 'Results available', icon: BookOpen, color: 'bg-amber-50 text-amber-500' },
              ].map((stat, i) => (
                <div key={i} className="soft-card p-6" data-testid={`sem-${stat.label.toLowerCase().replace(/\s+/g, '-')}-metric`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
                    <div className={`${stat.color} p-2 rounded-xl`}><stat.icon size={18} weight="duotone" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900">{stat.value}</p>
                  <p className="text-sm font-medium mt-1 text-slate-400">{stat.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">SGPA / CGPA Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={semesterData.map(s => ({ name: `Sem ${s.semester}`, sgpa: s.sgpa, cgpa: s.cgpa }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} domain={[0, 10]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="sgpa" stroke="#6366F1" strokeWidth={3} dot={{ fill: '#6366F1', r: 5 }} name="SGPA" />
                    <Line type="monotone" dataKey="cgpa" stroke="#14B8A6" strokeWidth={3} dot={{ fill: '#14B8A6', r: 5 }} name="CGPA" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Semester-wise SGPA</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={semesterData.map(s => ({ name: `Sem ${s.semester}`, sgpa: s.sgpa }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} domain={[0, 10]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="sgpa" fill="#14B8A6" radius={[8, 8, 0, 0]} name="SGPA" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Semester Details Cards */}
            <h3 className="text-xl font-bold text-slate-800 mb-4">Semester Details</h3>
            <div className="space-y-6">
              {semesterData.map((sem, i) => (
                <div key={i} className="soft-card p-6" data-testid={`semester-detail-${sem.semester}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-slate-800">Semester {sem.semester}</h4>
                    <div className="flex gap-4">
                      <span className="soft-badge bg-indigo-50 text-indigo-600">SGPA: {sem.sgpa?.toFixed(2)}</span>
                      <span className="soft-badge bg-emerald-50 text-emerald-600">CGPA: {sem.cgpa?.toFixed(2)}</span>
                    </div>
                  </div>
                  {sem.subjects && sem.subjects.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-2 px-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Code</th>
                            <th className="text-left py-2 px-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Subject</th>
                            <th className="text-center py-2 px-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Credits</th>
                            <th className="text-center py-2 px-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Grade</th>
                            <th className="text-center py-2 px-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sem.subjects.map((sub, j) => (
                            <tr key={j} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 font-medium text-slate-600">{sub.code}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">{sub.name}</td>
                              <td className="py-2.5 px-3 text-center font-medium text-slate-600">{sub.credits}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`soft-badge ${sub.grade === 'O' ? 'bg-emerald-50 text-emerald-600' : sub.grade === 'A+' ? 'bg-indigo-50 text-indigo-600' : sub.grade === 'A' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {sub.grade}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`text-xs font-bold ${sub.status === 'PASS' ? 'text-emerald-500' : 'text-red-500'}`}>{sub.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
