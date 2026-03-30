import React, { useState, useEffect } from 'react';
import { Clock, Trophy, ChartLine, Fire, BookOpen, Calendar, Target, SignOut } from '@phosphor-icons/react';
import { analyticsAPI, quizzesAPI } from '../services/api';

const StudentDashboard = ({ navigate, user, onLogout }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await analyticsAPI.studentDashboard();
        setDashboard(data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, []);

  const stats = [
    { label: 'CGPA', value: dashboard?.cgpa?.toFixed(1) || '-', icon: Trophy, color: 'bg-amber-50 text-amber-600' },
    { label: 'Avg Quiz Score', value: dashboard?.avg_score ? `${dashboard.avg_score}%` : '-', icon: Target, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Quizzes Taken', value: dashboard?.total_quizzes || 0, icon: BookOpen, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Active Quizzes', value: dashboard?.upcoming_quizzes?.length || 0, icon: Fire, color: 'bg-rose-50 text-rose-600' },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <BookOpen size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">QuizPortal</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Student</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="btn-ghost !px-4 !py-2 text-sm" data-testid="profile-button">{user?.name}</span>
            <button data-testid="logout-button" onClick={onLogout} className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors">
              <SignOut size={20} weight="duotone" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-2">Welcome Back, {user?.name?.split(' ')[0]}!</h2>
          <p className="text-base font-medium text-slate-500">Here's what's happening with your academics today</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="soft-card-hover p-6" data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
                  <div className={`${stat.color} p-2.5 rounded-xl`}><Icon size={20} weight="duotone" /></div>
                </div>
                <p className="text-3xl font-extrabold tracking-tight text-slate-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          <button data-testid="view-all-quizzes-button" onClick={() => navigate('quiz-results')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors"><BookOpen size={24} weight="duotone" className="text-indigo-500" /></div>
            <div><p className="font-extrabold text-slate-900">My Quizzes</p><p className="text-sm font-medium text-slate-400">View all attempts</p></div>
          </button>
          <button data-testid="view-semester-results-button" onClick={() => navigate('semester-results')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition-colors"><Calendar size={24} weight="duotone" className="text-teal-500" /></div>
            <div><p className="font-extrabold text-slate-900">Semester Results</p><p className="text-sm font-medium text-slate-400">Check your grades</p></div>
          </button>
          <button data-testid="view-analytics-button" onClick={() => navigate('analytics')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors"><ChartLine size={24} weight="duotone" className="text-amber-500" /></div>
            <div><p className="font-extrabold text-slate-900">Analytics</p><p className="text-sm font-medium text-slate-400">Track performance</p></div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Quizzes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold tracking-tight text-slate-800">Available Quizzes</h3>
              <span className="soft-badge bg-indigo-50 text-indigo-600">{dashboard?.upcoming_quizzes?.length || 0} Active</span>
            </div>
            <div className="space-y-4">
              {(dashboard?.upcoming_quizzes || []).map((quiz) => (
                <div key={quiz.id} className="soft-card-hover p-6" data-testid={`upcoming-quiz-${quiz.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 mb-1">{quiz.title}</h4>
                      <p className="text-sm font-medium text-slate-400">{quiz.subject}</p>
                    </div>
                    <span className="soft-badge bg-amber-50 text-amber-600">{quiz.total_marks} marks</span>
                  </div>
                  <div className="flex items-center gap-4 mb-4 text-sm font-medium text-slate-500">
                    <div className="flex items-center gap-1.5"><Clock size={15} weight="duotone" /><span>{quiz.duration_mins} min</span></div>
                    <div className="flex items-center gap-1.5"><BookOpen size={15} weight="duotone" /><span>{quiz.questions?.length || '?'} questions</span></div>
                  </div>
                  <button data-testid={`start-quiz-${quiz.id}`} onClick={() => navigate('quiz-attempt', quiz)} className="btn-primary w-full text-sm">
                    Start Quiz
                  </button>
                </div>
              ))}
              {(!dashboard?.upcoming_quizzes || dashboard.upcoming_quizzes.length === 0) && (
                <div className="soft-card p-8 text-center"><p className="text-slate-400 font-medium">No active quizzes available</p></div>
              )}
            </div>
          </div>

          {/* Recent Results */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold tracking-tight text-slate-800">Recent Results</h3>
              <button data-testid="view-all-results-button" onClick={() => navigate('quiz-results')} className="text-sm font-bold text-indigo-500 hover:text-indigo-600">View All</button>
            </div>
            <div className="space-y-4">
              {(dashboard?.recent_results || []).map((result) => (
                <div key={result.id} className="soft-card-hover p-6" data-testid={`recent-result-${result.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 mb-1">{result.quiz_title}</h4>
                      <p className="text-sm font-medium text-slate-400">{result.quiz_subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-slate-900">{result.percentage}%</p>
                      <p className="text-xs font-medium text-slate-400">{result.score}/{result.total_marks}</p>
                    </div>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full" style={{ width: `${result.percentage}%` }}></div>
                  </div>
                </div>
              ))}
              {(!dashboard?.recent_results || dashboard.recent_results.length === 0) && (
                <div className="soft-card p-8 text-center"><p className="text-slate-400 font-medium">No quiz results yet</p></div>
              )}
            </div>

            <div className="mt-6 soft-card-hover p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Trophy size={32} weight="duotone" />
                <div><h4 className="font-extrabold text-xl">Leaderboard</h4><p className="text-sm font-medium text-white/70">See where you stand</p></div>
              </div>
              <button data-testid="view-leaderboard-button" onClick={() => navigate('leaderboard')} className="w-full py-2.5 bg-white/20 backdrop-blur-sm rounded-xl font-bold text-sm hover:bg-white/30 transition-colors">
                View Leaderboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
