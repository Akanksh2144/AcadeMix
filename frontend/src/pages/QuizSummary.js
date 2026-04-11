import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Trophy, Warning, Code, BookOpen, Minus, CaretDown, CaretUp, Eye } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader';
import { attemptsAPI } from '../services/api';

const QuizSummary = ({ navigate, user, attemptData }) => {
  const [attempt, setAttempt] = useState(attemptData || null);
  const [loading, setLoading] = useState(!attemptData);
  const [expandedQ, setExpandedQ] = useState(new Set());

  useEffect(() => {
    if (attemptData?.id && !attemptData?.results) {
      // We have an attempt ID but no detailed results — fetch them
      const fetchResult = async () => {
        try {
          const { data } = await attemptsAPI.result(attemptData.id);
          setAttempt(data);
        } catch (err) {
          console.error('Failed to fetch attempt result', err);
        }
        setLoading(false);
      };
      fetchResult();
    } else if (attemptData) {
      setAttempt(attemptData);
      setLoading(false);
    }
  }, [attemptData]);

  const toggleExpand = (index) => {
    setExpandedQ(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const expandAll = () => {
    if (!attempt?.results) return;
    if (expandedQ.size === attempt.results.length) {
      setExpandedQ(new Set());
    } else {
      setExpandedQ(new Set(attempt.results.map((_, i) => i)));
    }
  };

  const formatTimeTaken = () => {
    if (!attempt?.started_at || !attempt?.submitted_at) return '—';
    // Use first_interaction_at if available for true time taken, otherwise fallback to started_at
    const start = attempt.first_interaction_at ? new Date(attempt.first_interaction_at) : new Date(attempt.started_at);
    const end = new Date(attempt.submitted_at);
    const diffMs = end - start;
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (pct) => {
    if (pct >= 80) return 'text-emerald-500';
    if (pct >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getGradeBg = (pct) => {
    if (pct >= 80) return 'from-emerald-500 to-teal-500';
    if (pct >= 50) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const formatAnswer = (answer, type) => {
    if (answer === null || answer === undefined) return <span className="italic text-slate-400">Not answered</span>;
    if (type === 'boolean') return answer ? 'True' : 'False';
    if (type === 'coding') return <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono">{String(answer).substring(0, 100)}...</code>;
    if (Array.isArray(answer)) return answer.map(String).join(', ');
    return String(answer);
  };

  const formatCorrectAnswer = (answer, type) => {
    if (answer === null || answer === undefined) return '—';
    if (type === 'boolean') return answer ? 'True' : 'False';
    if (Array.isArray(answer)) return answer.map(String).join(', ');
    return String(answer);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-slate-400">Loading results...</p>
      </div>
    </div>
  );

  if (!attempt) return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-400 font-bold">No attempt data found</p>
        <button onClick={() => navigate('quiz-results')} className="btn-primary mt-4">Go to Results</button>
      </div>
    </div>
  );

  const results = attempt.results || [];
  const correct = results.filter(r => r.is_correct).length;
  const incorrect = results.filter(r => !r.is_correct && r.student_answer !== null && r.student_answer !== undefined).length;
  const unanswered = results.filter(r => r.student_answer === null || r.student_answer === undefined).length;
  const totalMarks = results.reduce((s, r) => s + r.max_marks, 0);
  const scorePct = attempt.percentage || 0;
  const negativeMarks = results.reduce((s, r) => s + (r.marks_awarded < 0 ? r.marks_awarded : 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader
        navigate={navigate} user={user} title={attempt.quiz_title || 'Quiz Summary'}
        subtitle={attempt.quiz_subject || 'Detailed Results'}
        backTo="quiz-results"
        maxWidth="max-w-7xl"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Score Hero Card */}
        <div className="soft-card p-0 overflow-hidden mb-8" style={{animation: 'fadeInUp 0.4s ease'}}>
          <div className={`bg-gradient-to-r ${getGradeBg(scorePct)} p-6 sm:p-10 text-white text-center`}>
            <p className="text-sm font-bold uppercase tracking-widest text-white/70 mb-2">Your Score</p>
            <p className="text-5xl sm:text-7xl font-extrabold mb-1">{scorePct}%</p>
            <p className="text-lg font-bold text-white/80">{attempt.score || 0} / {totalMarks} marks</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-slate-100 dark:divide-slate-700/50">
            {[
              { label: 'Correct', value: correct, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
              { label: 'Incorrect', value: incorrect, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
              { label: 'Unanswered', value: unanswered, icon: Minus, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/10' },
              { label: 'Time Taken', value: formatTimeTaken(), icon: Clock, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-500/10' },
            ].map((stat, i) => (
              <div key={i} className="p-4 sm:p-6 text-center">
                <stat.icon size={22} weight="duotone" className={`${stat.color} mx-auto mb-2`} />
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Extra stats row */}
        {(attempt.violations > 0 || negativeMarks < 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8" style={{animation: 'fadeInUp 0.5s ease'}}>
            {attempt.violations > 0 && (
              <div className="soft-card p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-500/15 rounded-2xl flex items-center justify-center">
                  <Warning size={24} weight="duotone" className="text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-red-500">{attempt.violations}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Violations</p>
                </div>
              </div>
            )}
            {negativeMarks < 0 && (
              <div className="soft-card p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/15 rounded-2xl flex items-center justify-center">
                  <Minus size={24} weight="bold" className="text-rose-500" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-rose-500">{negativeMarks}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Negative Marks</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Question-by-Question Breakdown */}
        <div className="mb-4 flex items-center justify-between" style={{animation: 'fadeInUp 0.55s ease'}}>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">Question Breakdown</h2>
          <button onClick={expandAll}
            className="text-sm font-bold text-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
            <Eye size={16} weight="duotone" />
            {expandedQ.size === results.length ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        <div className="space-y-3">
          {results.map((r, i) => {
            const isExpanded = expandedQ.has(i);
            return (
              <div key={i}
                className={`soft-card overflow-hidden transition-all ${r.is_correct ? 'border-l-4 border-emerald-400' : r.student_answer === null || r.student_answer === undefined ? 'border-l-4 border-slate-300 dark:border-slate-600' : 'border-l-4 border-red-400'}`}
                style={{animation: `fadeInUp ${0.3 + i * 0.04}s ease`}}
                data-testid={`question-result-${i}`}
              >
                {/* Question header - always visible */}
                <button onClick={() => toggleExpand(i)} className="w-full text-left p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    r.is_correct ? 'bg-emerald-50 dark:bg-emerald-500/15' : r.student_answer === null || r.student_answer === undefined ? 'bg-slate-100 dark:bg-slate-700/50' : 'bg-red-50 dark:bg-red-500/15'
                  }`}>
                    {r.is_correct ? (
                      <CheckCircle size={22} weight="fill" className="text-emerald-500" />
                    ) : r.student_answer === null || r.student_answer === undefined ? (
                      <Minus size={22} weight="bold" className="text-slate-400" />
                    ) : (
                      <XCircle size={22} weight="fill" className="text-red-500" />
                    )}
                  </div>

                  {/* Question text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-0.5">Question {i + 1}</p>
                    <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 truncate">{r.question || `Question ${i + 1}`}</p>
                  </div>

                  {/* Marks */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-lg sm:text-xl font-extrabold ${
                      r.marks_awarded > 0 ? 'text-emerald-500' : r.marks_awarded < 0 ? 'text-red-500' : 'text-slate-400'
                    }`}>
                      {r.marks_awarded > 0 ? '+' : ''}{r.marks_awarded}
                    </span>
                    <span className="text-sm font-medium text-slate-400">/ {r.max_marks}</span>
                    {isExpanded ? <CaretUp size={18} className="text-slate-400" /> : <CaretDown size={18} className="text-slate-400" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="pt-4 space-y-3">
                      {/* Question type badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="soft-badge bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-xs">
                          {r.type === 'mcq-single' || r.type === 'mcq' ? 'Multiple Choice' : r.type === 'mcq-multiple' ? 'Multi-Select' : r.type === 'boolean' ? 'True/False' : r.type === 'short' ? 'Short Answer' : r.type === 'coding' ? 'Coding' : r.type}
                        </span>
                        {r.marks_awarded < 0 && (
                          <span className="soft-badge bg-red-50 dark:bg-red-500/15 text-red-500 text-xs">
                            Negative marking applied
                          </span>
                        )}
                      </div>

                      {/* Full question text */}
                      <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{r.question}</p>

                      {/* Answer comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Student's answer */}
                        <div className={`rounded-2xl p-4 ${
                          r.is_correct ? 'bg-emerald-50/50 dark:bg-emerald-500/10' : r.student_answer === null || r.student_answer === undefined ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-red-50/50 dark:bg-red-500/10'
                        }`}>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Your Answer</p>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {r.type === 'coding' && r.student_answer ? (
                              <pre className="text-xs font-mono bg-slate-900 text-green-300 p-3 rounded-xl overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">{String(r.student_answer)}</pre>
                            ) : (
                              formatAnswer(r.student_answer, r.type)
                            )}
                          </div>
                        </div>

                        {/* Correct answer */}
                        <div className="rounded-2xl p-4 bg-emerald-50/50 dark:bg-emerald-500/10">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Correct Answer</p>
                          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                            {r.type === 'coding' && r.correct_answer ? (
                              <p className="font-mono text-xs">Expected output: {String(r.correct_answer)}</p>
                            ) : (
                              formatCorrectAnswer(r.correct_answer, r.type)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom action */}
        <div className="mt-8 text-center pb-8" style={{animation: 'fadeInUp 0.6s ease'}}>
          <button onClick={() => navigate('quiz-results')} className="btn-primary px-8 py-3 text-sm">
            <Trophy size={18} weight="duotone" className="inline mr-2" />
            View All Results
          </button>
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

export default QuizSummary;
