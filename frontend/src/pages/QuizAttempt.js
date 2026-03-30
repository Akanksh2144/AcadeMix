import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Warning, Camera, CheckCircle, XCircle } from '@phosphor-icons/react';
import { attemptsAPI, quizzesAPI } from '../services/api';

const QuizAttempt = ({ quizData, navigate, user }) => {
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!quizData?.id) { navigate('student-dashboard'); return; }
      try {
        const { data: quizDetail } = await quizzesAPI.get(quizData.id);
        setQuiz(quizDetail);
        setTimeRemaining((quizDetail.duration_mins || 60) * 60);
        const { data: att } = await attemptsAPI.start(quizData.id);
        setAttempt(att);
        const saved = {};
        (att.answers || []).forEach((a, i) => { if (a !== null) saved[i] = a; });
        setAnswers(saved);
        setViolations(att.violations || 0);
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to start quiz');
        navigate('student-dashboard');
      }
      setLoading(false);
    };
    init();
  }, [quizData, navigate]);

  // Timer
  useEffect(() => {
    if (!attempt || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = async (questionIndex, answer) => {
    setAnswers({ ...answers, [questionIndex]: answer });
    if (attempt?.id) {
      try {
        await attemptsAPI.answer(attempt.id, { question_index: questionIndex, answer });
      } catch {}
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!window.confirm('Are you sure you want to submit?')) return;
    setSubmitting(true);
    try {
      const { data } = await attemptsAPI.submit(attempt.id);
      navigate('quiz-results');
    } catch (err) {
      alert(err.response?.data?.detail || 'Submit failed');
    }
    setSubmitting(false);
  };

  if (loading || !quiz) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const questions = quiz.questions || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 p-4 rounded-b-2xl" data-testid="violation-warning">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <Warning size={24} weight="duotone" className="text-white" />
            <p className="text-white font-bold">Tab Switch Detected! ({violations} violations)</p>
          </div>
        </div>
      )}

      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{quiz.title}</h1>
            <p className="text-sm font-medium text-slate-400">{quiz.subject} &bull; {quiz.total_marks} marks</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-amber-50 px-4 py-2 rounded-2xl flex items-center gap-2" data-testid="quiz-timer">
              <Clock size={22} weight="duotone" className="text-amber-500" />
              <span className={`text-xl font-extrabold ${timeRemaining < 300 ? 'text-red-600' : 'text-amber-600'}`}>{formatTime(timeRemaining)}</span>
            </div>
            <div className="bg-red-50 px-4 py-2 rounded-2xl flex items-center gap-2" data-testid="violation-counter">
              <Warning size={22} weight="duotone" className="text-red-500" />
              <span className="text-xl font-extrabold text-red-600">{violations}</span>
            </div>
            <div className="bg-emerald-50 px-4 py-2 rounded-2xl flex items-center gap-2" data-testid="proctoring-status">
              <Camera size={22} weight="duotone" className="text-emerald-500" />
              <span className="text-sm font-bold text-emerald-600">Active</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="soft-card p-6 sticky top-24">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Questions</h3>
              <div className="grid grid-cols-5 lg:grid-cols-3 gap-2">
                {questions.map((q, i) => (
                  <button key={i} data-testid={`question-nav-${i + 1}`} onClick={() => setCurrentQuestion(i)}
                    className={`aspect-square rounded-xl font-bold text-sm transition-all ${
                      currentQuestion === i ? 'bg-indigo-500 text-white shadow-md' :
                      answers[i] !== undefined ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>{i + 1}</button>
                ))}
              </div>
              <div className="mt-6 space-y-2.5 text-sm">
                <div className="flex items-center gap-2.5"><div className="w-4 h-4 bg-indigo-500 rounded-md"></div><span className="font-medium text-slate-500">Current</span></div>
                <div className="flex items-center gap-2.5"><div className="w-4 h-4 bg-emerald-100 rounded-md"></div><span className="font-medium text-slate-500">Answered</span></div>
                <div className="flex items-center gap-2.5"><div className="w-4 h-4 bg-slate-100 rounded-md"></div><span className="font-medium text-slate-500">Not Answered</span></div>
              </div>
              <p className="text-sm font-medium text-slate-400 mt-4 text-center">{Object.keys(answers).length}/{questions.length} answered</p>
              <button data-testid="submit-quiz-button" onClick={handleSubmit} disabled={submitting} className="btn-primary w-full mt-4 text-sm disabled:opacity-60">
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-3">
            {questions[currentQuestion] && (
              <div className="soft-card p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Question {currentQuestion + 1} of {questions.length}</span>
                    <h2 className="text-lg font-bold text-slate-800 mt-1">
                      {questions[currentQuestion].type === 'mcq' && 'Multiple Choice'}
                      {questions[currentQuestion].type === 'boolean' && 'True / False'}
                      {questions[currentQuestion].type === 'short' && 'Short Answer'}
                    </h2>
                  </div>
                  <span className="soft-badge bg-amber-50 text-amber-600">{questions[currentQuestion].marks} marks</span>
                </div>

                <p className="text-lg font-medium text-slate-700 leading-relaxed mb-8 select-none">{questions[currentQuestion].question}</p>

                {questions[currentQuestion].type === 'mcq' && (
                  <div className="space-y-3">
                    {(questions[currentQuestion].options || []).map((option, i) => (
                      <button key={i} data-testid={`option-${i}`} onClick={() => handleAnswer(currentQuestion, i)}
                        className={`w-full text-left p-4 rounded-2xl font-medium transition-all select-none ${
                          answers[currentQuestion] === i ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}>
                        <span className="font-bold mr-3 text-sm">{String.fromCharCode(65 + i)}.</span>{option}
                      </button>
                    ))}
                  </div>
                )}

                {questions[currentQuestion].type === 'boolean' && (
                  <div className="flex gap-4">
                    <button data-testid="true-button" onClick={() => handleAnswer(currentQuestion, true)}
                      className={`flex-1 p-6 rounded-2xl font-bold text-lg transition-all ${answers[currentQuestion] === true ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                      <CheckCircle size={32} weight="duotone" className="mx-auto mb-2" />TRUE
                    </button>
                    <button data-testid="false-button" onClick={() => handleAnswer(currentQuestion, false)}
                      className={`flex-1 p-6 rounded-2xl font-bold text-lg transition-all ${answers[currentQuestion] === false ? 'bg-rose-50 text-rose-700 ring-2 ring-rose-500' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                      <XCircle size={32} weight="duotone" className="mx-auto mb-2" />FALSE
                    </button>
                  </div>
                )}

                {questions[currentQuestion].type === 'short' && (
                  <textarea data-testid="short-answer-input" value={answers[currentQuestion] || ''}
                    onChange={(e) => handleAnswer(currentQuestion, e.target.value)}
                    placeholder="Type your answer here..." rows="8" className="soft-input w-full resize-none" />
                )}

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                  <button data-testid="previous-question-button" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0} className={`btn-ghost !px-6 !py-2.5 text-sm ${currentQuestion === 0 ? 'opacity-40' : ''}`}>Previous</button>
                  <button data-testid="next-question-button" onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                    disabled={currentQuestion === questions.length - 1} className={`btn-primary !px-6 !py-2.5 text-sm ${currentQuestion === questions.length - 1 ? 'opacity-40' : ''}`}>Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizAttempt;
