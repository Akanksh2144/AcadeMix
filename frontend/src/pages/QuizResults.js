import React, { useState, useEffect } from 'react';
import { Trophy, Clock, CheckCircle, XCircle, Target } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { attemptsAPI } from '../services/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) return (
    <div className="bg-white rounded-xl dark:bg-[#1A202C] p-3 shadow-lg border border-slate-100 dark:border-slate-700">
      <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{label}</p>
      {payload.map((p, i) => <p key={i} className="text-sm font-medium" style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  );
  return null;
};

const QuizResults = ({ navigate, user }) => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await attemptsAPI.list();
        setAttempts(data.filter(a => a.status === 'submitted'));
      } catch {}
      setLoading(false);
    };
    fetch();
  }, []);

  const avgScore = attempts.length > 0 ? (attempts.reduce((s, a) => s + (a.percentage || 0), 0) / attempts.length).toFixed(1) : 0;
  const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.percentage || 0)) : 0;
  const avgTime = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => {
    if (a.started_at && a.submitted_at) return s + (new Date(a.submitted_at) - new Date(a.started_at)) / 60000;
    return s;
  }, 0) / attempts.length) : 0;

  const trendData = attempts.slice(-10).map((a, i) => ({ date: `Quiz ${i + 1}`, score: a.percentage || 0 }));
  const subjectMap = {};
  attempts.forEach(a => {
    const sub = a.quiz_subject || 'Other';
    if (!subjectMap[sub]) subjectMap[sub] = [];
    subjectMap[sub].push(a.percentage || 0);
  });
  const topicData = Object.entries(subjectMap).map(([topic, scores]) => ({ topic, accuracy: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }));

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader
        navigate={navigate} user={user} title="Quiz Results"
        subtitle="Your performance overview"
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Quizzes', value: attempts.length, icon: Target, color: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500' },
            { label: 'Avg Score', value: `${avgScore}%`, icon: Trophy, color: 'bg-amber-50 dark:bg-amber-500/15 text-amber-500' },
            { label: 'Best Score', value: `${bestScore}%`, icon: CheckCircle, color: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500' },
            { label: 'Avg Time', value: `${avgTime}m`, icon: Clock, color: 'bg-sky-50 dark:bg-sky-500/15 text-sky-500' },
          ].map((s, i) => (
            <div key={i} className="soft-card p-6" data-testid={`${s.label.toLowerCase().replace(/\s+/g, '-')}-stat`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{s.label}</span>
                <div className={`${s.color} p-2 rounded-xl`}><s.icon size={18} weight="duotone" /></div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {trendData.length > 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="soft-card p-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Performance Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                  <YAxis stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={3} dot={{ fill: '#6366F1', r: 5 }} name="Score" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="soft-card p-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Subject-wise Accuracy</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topicData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="topic" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                  <YAxis stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="accuracy" fill="#6366F1" radius={[8, 8, 0, 0]} name="Accuracy %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="soft-card p-6">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">All Quiz Attempts</h3>
          {attempts.length === 0 ? (
            <p className="text-center text-slate-400 font-medium py-8">No quiz attempts yet. Take a quiz to see results here!</p>
          ) : (
            <div className="space-y-4">
              {attempts.map((a) => (
                <div key={a.id} className="soft-card-hover p-6 cursor-pointer group" data-testid={`quiz-result-${a.id}`}
                  onClick={() => navigate('quiz-summary', a)}>
                  <div className="flex items-start justify-between mb-4">
                    <div><h4 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-500 transition-colors">{a.quiz_title}</h4><p className="text-sm font-medium text-slate-400">{a.quiz_subject}</p></div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{a.percentage}%</p>
                      <p className="text-xs font-medium text-slate-400">{a.score}/{a.total_marks} marks</p>
                    </div>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full" style={{ width: `${a.percentage}%` }}></div>
                  </div>
                  {a.results && (
                    <div className="grid grid-cols-3 gap-4 text-sm font-medium">
                      <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={16} weight="duotone" />{a.results.filter(r => r.is_correct).length} Correct</span>
                      <span className="text-red-500 flex items-center gap-1"><XCircle size={16} weight="duotone" />{a.results.filter(r => !r.is_correct).length} Wrong</span>
                      <span className="text-indigo-500 flex items-center gap-1 group-hover:underline">View Details →</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
