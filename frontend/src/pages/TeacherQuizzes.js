import React, { useState, useEffect } from 'react';
import { Eye, Calendar, Users, ChartLine, Clipboard, PencilLine, Fire } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader';
import { analyticsAPI } from '../services/api';

const statusStyle = {
  active: 'bg-emerald-50 text-emerald-600',
  ended: 'bg-slate-100 text-slate-500 dark:text-slate-400',
  scheduled: 'bg-amber-50 text-amber-600',
  draft: 'bg-purple-50 text-purple-600',
};

const statusLabel = { active: 'Active', ended: 'Ended', scheduled: 'Scheduled', draft: 'Draft' };

const TeacherQuizzes = ({ navigate, user }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await analyticsAPI.teacherDashboard();
        setQuizzes(data.quizzes || []);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = quizzes.filter(q => {
    if (filter === 'active') return q.status === 'active';
    if (filter === 'ended') return q.status === 'ended';
    if (filter === 'draft') return q.status === 'draft';
    return true;
  });

  const activeCount = quizzes.filter(q => q.status === 'active').length;
  const endedCount = quizzes.filter(q => q.status === 'ended').length;

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-slate-400">Loading quizzes...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader
        navigate={navigate} user={user} title="My Quizzes"
        subtitle={`${activeCount} active • ${endedCount} ended • ${quizzes.length} total`}
        maxWidth="max-w-7xl"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 sm:mb-8" style={{animation: 'fadeInUp 0.2s ease'}}>
          {[
            { key: 'all', label: `All (${quizzes.length})` },
            { key: 'active', label: `Active (${activeCount})` },
            { key: 'ended', label: `Ended (${endedCount})` },
            { key: 'draft', label: `Drafts` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                filter === tab.key
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quiz Cards */}
        {filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((quiz, i) => {
              const qId = quiz.id;
              const status = quiz.status || 'active';
              const attemptCount = quiz.attempt_count || 0;
              const activeCount = quiz.active_count || 0;
              const totalStudents = attemptCount + activeCount;
              const avgScore = quiz.avg_score || 0;
              const date = quiz.created_at ? new Date(quiz.created_at).toLocaleDateString('en-CA') : '';

              return (
                <div key={qId} className="soft-card overflow-hidden" style={{animation: `fadeInUp ${0.25 + i * 0.05}s ease`}}>
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-lg text-slate-900 mb-1 truncate">{quiz.title}</h3>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
                          <Calendar size={15} weight="duotone" />
                          <span>{date}</span>
                          {quiz.subject && <span>• {quiz.subject}</span>}
                        </div>
                      </div>
                      <span className={`soft-badge ${statusStyle[status] || 'bg-slate-100 text-slate-500 dark:text-slate-400'}`}>
                        {statusLabel[status] || status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Students</p>
                        <p className="text-xl font-extrabold text-slate-900 dark:text-white">{totalStudents}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Completed</p>
                        <p className="text-xl font-extrabold text-slate-900 dark:text-white">{attemptCount}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Avg Score</p>
                        <p className="text-xl font-extrabold text-slate-900 dark:text-white">{avgScore > 0 ? `${avgScore}%` : '-'}</p>
                      </div>
                    </div>

                    {totalStudents > 0 && (
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${totalStudents > 0 ? (attemptCount / totalStudents) * 100 : 0}%` }}></div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {status === 'active' && (
                        <button data-testid={`live-monitor-${qId}`} onClick={() => navigate('live-monitor', quiz)} className="btn-primary flex-1 text-sm">
                          <Eye size={16} weight="bold" className="inline mr-1.5" /> Live Monitor
                        </button>
                      )}
                      {status === 'ended' && (
                        <button onClick={() => navigate('quiz-results')} className="btn-secondary flex-1 text-sm">
                          <ChartLine size={16} weight="bold" className="inline mr-1.5" /> View Results
                        </button>
                      )}
                      {(status === 'draft' || status === 'scheduled') && (
                        <button onClick={() => navigate('quiz-builder', quiz)} className="btn-ghost flex-1 text-sm">
                          <PencilLine size={16} weight="bold" className="inline mr-1.5" /> Edit Quiz
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="soft-card p-12 sm:p-16 text-center" style={{animation: 'fadeInUp 0.3s ease'}}>
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clipboard size={36} weight="duotone" className="text-slate-400" />
            </div>
            <h3 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">
              {filter === 'active' ? 'No active quizzes' : filter === 'ended' ? 'No ended quizzes' : 'No quizzes yet'}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {filter === 'all' ? 'Create your first quiz to get started' : 'Try a different filter'}
            </p>
            {filter === 'all' && (
              <button onClick={() => navigate('quiz-builder')} className="btn-primary text-sm">Create Your First Quiz</button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default TeacherQuizzes;
