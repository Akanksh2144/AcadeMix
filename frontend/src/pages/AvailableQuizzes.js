import React, { useState, useEffect } from 'react';
import { Clock, BookOpen, Fire, Play, CheckCircle } from '@phosphor-icons/react';
import { analyticsAPI } from '../services/api';
import PageHeader from '../components/PageHeader';

const getDeadlineInfo = (quiz) => {
  const end = quiz.end_date || quiz.deadline;
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  if (diff < 0) return { text: 'Expired', urgent: true };
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return { text: `${hrs}h left`, urgent: true };
  const days = Math.floor(hrs / 24);
  return { text: `${days}d left`, urgent: days <= 2 };
};

const AvailableQuizzes = ({ navigate, user }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await analyticsAPI.studentDashboard();
        setQuizzes(data.upcoming_quizzes || []);
        setInProgress(data.in_progress || []);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-slate-400">Loading quizzes...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader
        navigate={navigate} user={user} title="Available Quizzes"
        subtitle={`${quizzes.length} active quiz${quizzes.length !== 1 ? 'zes' : ''}`}
        maxWidth="max-w-7xl"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* In Progress */}
        {inProgress.length > 0 && (
          <div className="mb-6 sm:mb-8" style={{animation: 'fadeInUp 0.3s ease'}}>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Play size={20} weight="fill" className="text-amber-500" /> Continue Where You Left Off
            </h3>
            <div className="space-y-3">
              {inProgress.map((attempt) => (
                <div key={attempt.id} className="soft-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-amber-400">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/15 rounded-xl flex items-center justify-center">
                      <Play size={20} weight="fill" className="text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{attempt.quiz_title || 'Untitled Quiz'}</h4>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {attempt.quiz_subject} • {(attempt.answers || []).filter(a => a !== null).length}/{attempt.total_questions} answered
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('quiz-attempt', { id: attempt.quiz_id, title: attempt.quiz_title })}
                    className="btn-primary !px-5 !py-2.5 text-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Quizzes */}
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Fire size={20} weight="duotone" className="text-rose-500" /> Active Quizzes
        </h3>
        <div className="space-y-3 sm:space-y-4">
          {quizzes.map((quiz, i) => {
            const deadline = getDeadlineInfo(quiz);
            return (
              <div key={quiz.id} className="soft-card-hover p-5 sm:p-6" style={{animation: `fadeInUp ${0.3 + i * 0.06}s ease`}}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1 truncate">{quiz.title}</h4>
                    <p className="text-sm font-medium text-slate-400">{quiz.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    {deadline && (
                      <span className={`soft-badge ${deadline.urgent ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {deadline.urgent && <Clock size={12} weight="bold" className="mr-1 inline" />}
                        {deadline.text}
                      </span>
                    )}
                    <span className="soft-badge bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 whitespace-nowrap">{quiz.total_marks} marks</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5"><Clock size={15} weight="duotone" /><span>{quiz.duration_mins} min</span></div>
                  <div className="flex items-center gap-1.5"><BookOpen size={15} weight="duotone" /><span>{quiz.question_count || '?'} questions</span></div>
                </div>
                {quiz.already_attempted ? (
                  <div className="w-full text-center py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-2">
                    <CheckCircle size={18} weight="bold" /> Already Submitted
                  </div>
                ) : (
                  <button onClick={() => navigate('quiz-attempt', quiz)} className="btn-primary w-full text-sm">
                    Start Quiz
                  </button>
                )}
              </div>
            );
          })}
          {quizzes.length === 0 && (
            <div className="soft-card p-10 sm:p-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen size={28} weight="duotone" className="text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-bold mb-1">No active quizzes right now</p>
              <p className="text-sm text-slate-400">Quizzes will appear here when your teacher publishes them</p>
            </div>
          )}
        </div>
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

export default AvailableQuizzes;
