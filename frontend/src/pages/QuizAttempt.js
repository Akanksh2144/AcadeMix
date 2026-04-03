import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Clock, Warning, Camera, CheckCircle, XCircle, Play, Code, ArrowsOut, CameraSlash, ShieldWarning, LockSimple, Eraser, BookmarkSimple, X, PaperPlaneTilt, Eye, Question } from '@phosphor-icons/react';
import { attemptsAPI, quizzesAPI } from '../services/api';
import Editor from '@monaco-editor/react';
import api from '../services/api';
import AlertModal from '../components/AlertModal';

const MOBILE_WIDTH = 768;

const CodeEditor = ({ value, onChange, language, onRun, running, output }) => {
  const [isMobile] = useState(() => window.innerWidth < MOBILE_WIDTH);
  const monacoLang = { python: 'python', javascript: 'javascript', java: 'java', c: 'c', cpp: 'cpp' }[language] || 'python';

  return (
    <div className="space-y-3" data-testid="code-editor-container">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Code size={18} weight="duotone" className="text-indigo-500" />
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase">{language || 'python'}</span>
        </div>
        <button data-testid="run-code-button" onClick={onRun} disabled={running}
          className="btn-primary !px-4 !py-2 text-sm flex items-center gap-2 disabled:opacity-60">
          {running ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Play size={16} weight="fill" />}
          {running ? 'Running...' : 'Run Code'}
        </button>
      </div>
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        {isMobile ? (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-[#1e1e1e] text-green-300 font-mono text-sm p-4 resize-none outline-none"
            rows={12}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        ) : (
          <Editor
            height="300px"
            language={monacoLang}
            value={value || ''}
            onChange={(val) => onChange(val || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12 },
              tabSize: 4,
            }}
          />
        )}
      </div>
      {output !== undefined && output !== null && (
        <div className="rounded-2xl bg-slate-900 p-4" data-testid="code-output">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Output</span>
          </div>
          <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">{output || '(no output)'}</pre>
        </div>
      )}
    </div>
  );
};

/* ── Fullscreen Gate Overlay ──────────────────────────────────────────── */
const FullscreenGate = ({ onEnter, violations, isReEntry }) => (
  <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6" data-testid="fullscreen-gate">
    <div className="max-w-md w-full text-center">
      <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
        {isReEntry ? (
          <ShieldWarning size={40} weight="duotone" className="text-amber-400" />
        ) : (
          <LockSimple size={40} weight="duotone" className="text-indigo-400" />
        )}
      </div>
      <h2 className="text-2xl font-extrabold text-white mb-2">
        {isReEntry ? 'You Exited Fullscreen' : 'Fullscreen Required'}
      </h2>
      <p className="text-slate-400 font-medium mb-2">
        {isReEntry
          ? 'Exiting fullscreen has been recorded as a violation. Please re-enter fullscreen to continue your quiz.'
          : 'This quiz must be taken in fullscreen mode to ensure academic integrity.'}
      </p>
      {violations > 0 && (
        <div className="inline-flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-bold mb-6">
          <Warning size={16} weight="fill" /> {violations} violation{violations !== 1 ? 's' : ''} recorded
        </div>
      )}
      <button
        data-testid="enter-fullscreen-button"
        onClick={onEnter}
        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 mt-4"
      >
        <ArrowsOut size={24} weight="bold" />
        {isReEntry ? 'Re-enter Fullscreen' : 'Enter Fullscreen & Start'}
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
        Tab switching, window blur, and fullscreen exits are monitored and logged.
      </p>
    </div>
  </div>
);

/* ── Submit Confirmation Modal ──────────────────────────────────────── */
const SubmitModal = ({ questions, answers, marked, onClose, onSubmit, submitting }) => {
  const answered = Object.keys(answers).length;
  const unanswered = questions.length - answered;
  const markedCount = marked.size;
  const markedUnanswered = [...marked].filter(i => answers[i] === undefined).length;

  const stats = [
    { label: 'Answered', count: answered, icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Unanswered', count: unanswered, icon: Question, color: 'red', bg: 'bg-red-50 dark:bg-red-500/15', text: 'text-red-500 dark:text-red-400' },
    { label: 'Marked for Review', count: markedCount, icon: BookmarkSimple, color: 'amber', bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="fixed inset-0 z-[9998] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" data-testid="submit-modal">
      <div className="bg-white rounded-3xl dark:bg-[#1A202C] shadow-2xl max-w-lg w-full overflow-hidden" style={{animation: 'scaleIn 0.25s ease'}}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 sm:p-8 text-white relative">
          <button data-testid="close-submit-modal" onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white dark:bg-[#1A202C]/30 transition-colors">
            <X size={18} weight="bold" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Eye size={28} weight="duotone" />
            <h2 className="text-xl sm:text-2xl font-extrabold">Quiz Summary</h2>
          </div>
          <p className="text-sm text-white/70 font-medium">Review before submitting</p>
        </div>

        {/* Stats Grid */}
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className={`${s.bg} rounded-2xl p-4 text-center`}>
                  <Icon size={24} weight="duotone" className={`${s.text} mx-auto mb-2`} />
                  <p className={`text-2xl sm:text-3xl font-extrabold ${s.text}`}>{s.count}</p>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Question grid visual */}
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Question Overview</p>
            <div className="grid grid-cols-10 sm:grid-cols-10 gap-1.5">
              {questions.map((_, i) => {
                const isAnswered = answers[i] !== undefined;
                const isMarked = marked.has(i);
                return (
                  <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold relative ${
                    isAnswered ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/15 text-red-400'
                  }`}>
                    {i + 1}
                    {isMarked && (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white dark:border-slate-800"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Warnings */}
          {unanswered > 0 && (
            <div className="bg-red-50 dark:bg-red-500/15 rounded-2xl p-4 mb-4 flex items-start gap-3">
              <Warning size={20} weight="fill" className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">You have {unanswered} unanswered question{unanswered !== 1 ? 's' : ''}</p>
                <p className="text-xs text-red-500 dark:text-red-400/70 mt-0.5">Unanswered questions will be marked as incorrect.</p>
              </div>
            </div>
          )}
          {markedUnanswered > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/15 rounded-2xl p-4 mb-4 flex items-start gap-3">
              <BookmarkSimple size={20} weight="fill" className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{markedUnanswered} marked question{markedUnanswered !== 1 ? 's are' : ' is'} still unanswered</p>
                <p className="text-xs text-amber-500 dark:text-amber-400/70 mt-0.5">Go back and review before submitting.</p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mb-6 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-100 dark:bg-emerald-500/20 rounded"></div>Answered</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-50 dark:bg-red-500/15 rounded border border-red-200 dark:border-red-500/30"></div>Unanswered</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-400 rounded-full"></div>Review</div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button data-testid="go-back-button" onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              Go Back & Review
            </button>
            <button data-testid="confirm-submit-button" onClick={onSubmit} disabled={submitting}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PaperPlaneTilt size={18} weight="fill" />
              )}
              {submitting ? 'Submitting...' : 'Confirm Submit'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const QuizAttempt = ({ quizData, navigate, user }) => {
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [codeOutputs, setCodeOutputs] = useState({});
  const [runningCode, setRunningCode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [needsFullscreen, setNeedsFullscreen] = useState(true);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const videoRef = useRef(null);
  const violationRef = useRef(0);
  const fullscreenInitialized = useRef(false);
  const isSubmittingRef = useRef(false);
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '', type: 'info', onClose: null });
  const showAlert = (title, message, type = 'info', onClose = null) => setAlertModal({ open: true, title, message, type, onClose });
  const closeAlert = () => { const cb = alertModal.onClose; setAlertModal(prev => ({ ...prev, open: false })); if (cb) cb(); };

  // ── Report violation to backend ──
  const reportViolation = useCallback(async (type) => {
    violationRef.current += 1;
    setViolations(violationRef.current);
    setWarningType(type === 'tab_switch' ? 'Tab Switch' : type === 'fullscreen_exit' ? 'Fullscreen Exit' : 'Window Blur');
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 4000);
    if (attempt?.id) {
      try {
        await api.post(`/api/attempts/${attempt.id}/violation`, { violation_type: type });
      } catch {}
    }
  }, [attempt]);

  // ── Enter fullscreen ──
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) {
      req.call(el).then(() => {
        fullscreenInitialized.current = true;
        setIsFullscreen(true);
        setNeedsFullscreen(false);
      }).catch(() => {});
    }
  }, []);

  // ── Exit fullscreen (on submit) ──
  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // ── Tab-switch detection ──
  useEffect(() => {
    if (!attempt) return;
    const handler = () => {
      if (document.hidden && !isSubmittingRef.current && fullscreenInitialized.current) reportViolation('tab_switch');
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [attempt, reportViolation]);

  // ── Window blur detection ──
  useEffect(() => {
    if (!attempt) return;
    const handler = () => {
      if (!isSubmittingRef.current && !document.hidden && fullscreenInitialized.current) reportViolation('window_blur');
    };
    window.addEventListener('blur', handler);
    return () => window.removeEventListener('blur', handler);
  }, [attempt, reportViolation]);

  // ── Fullscreen change detection ──
  useEffect(() => {
    if (!attempt) return;
    const handler = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && fullscreenInitialized.current && !isSubmittingRef.current) {
        setNeedsFullscreen(true);
        reportViolation('fullscreen_exit');
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [attempt, reportViolation]);

  // ── Webcam ──
  useEffect(() => {
    if (!attempt) return;
    let stream = null;
    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        setWebcamActive(true);
      } catch { setWebcamError(true); }
    };
    startWebcam();
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [attempt]);

  // ── Init quiz ──
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
        violationRef.current = att.violations || 0;
      } catch (err) {
        showAlert('Quiz Error', err.response?.data?.detail || 'Failed to start quiz', 'danger', () => navigate('student-dashboard'));
      }
      setLoading(false);
    };
    init();
  }, [quizData, navigate]);

  // ── Timer ──
  useEffect(() => {
    if (!attempt || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { doSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const debounceTimers = useRef({});

  const handleAnswer = async (questionIndex, answer) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    if (attempt?.id) {
      if (debounceTimers.current[questionIndex]) clearTimeout(debounceTimers.current[questionIndex]);
      debounceTimers.current[questionIndex] = setTimeout(async () => {
        try { await attemptsAPI.answer(attempt.id, { question_index: questionIndex, answer }); } catch {}
      }, 1000);
    }
  };

  const handleClearAnswer = async (questionIndex) => {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[questionIndex];
      return next;
    });
    if (attempt?.id) {
      try { await attemptsAPI.answer(attempt.id, { question_index: questionIndex, answer: null }); } catch {}
    }
  };

  const toggleMarkForReview = (questionIndex) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(questionIndex)) next.delete(questionIndex);
      else next.add(questionIndex);
      return next;
    });
  };

  const handleRunCode = async (questionIndex) => {
    const code = answers[questionIndex];
    if (!code || !code.trim()) return;
    setRunningCode(true);
    try {
      const q = quiz.questions[questionIndex];
      const { data } = await api.post('/api/code/execute', {
        code, language: q.language || 'python', test_input: q.test_input || '',
      });
      setCodeOutputs(prev => ({ ...prev, [questionIndex]: data.output || data.error || '(no output)' }));
    } catch (err) {
      setCodeOutputs(prev => ({ ...prev, [questionIndex]: err.response?.data?.detail || 'Execution failed' }));
    }
    setRunningCode(false);
  };

  // Show the submit modal (replaces window.confirm)
  const handleSubmitClick = () => {
    setShowSubmitModal(true);
  };

  // Actually submit
  const doSubmit = async (autoSubmit = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const { data: result } = await attemptsAPI.submit(attempt.id);
      exitFullscreen();
      navigate('quiz-summary', result);
    } catch (err) {
      showAlert('Submit Failed', err.response?.data?.detail || 'Submit failed', 'danger');
      isSubmittingRef.current = false;
    }
    setSubmitting(false);
  };

  // Memoize question nav colors
  const getNavClass = useMemo(() => {
    return (i) => {
      const isCurrent = currentQuestion === i;
      const isAnswered = answers[i] !== undefined;
      const isMarked = markedForReview.has(i);
      if (isCurrent) return 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md scale-110';
      if (isMarked && isAnswered) return 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 ring-2 ring-amber-400';
      if (isMarked) return 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-2 ring-amber-300';
      if (isAnswered) return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
      return 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700';
    };
  }, [currentQuestion, answers, markedForReview]);

  // Stable shuffled option indices per question (Fisher-Yates)
  const shuffledMap = useMemo(() => {
    if (!quiz?.randomize_options) return null;
    const map = {};
    (quiz.questions || []).forEach((q, qIdx) => {
      if ((q.type === 'mcq-single' || q.type === 'mcq-multiple') && q.options?.length) {
        const indices = q.options.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        map[qIdx] = indices;
      }
    });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.id, quiz?.randomize_options]);

  if (loading || !quiz) return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-slate-400">Loading quiz...</p>
      </div>
    </div>
  );

  const questions = quiz.questions || [];
  const currentQ = questions[currentQuestion];


  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      {/* Fullscreen Gate */}
      {needsFullscreen && attempt && (
        <FullscreenGate onEnter={enterFullscreen} violations={violations} isReEntry={fullscreenInitialized.current} />
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <SubmitModal
          questions={questions}
          answers={answers}
          marked={markedForReview}
          onClose={() => setShowSubmitModal(false)}
          onSubmit={() => doSubmit(false)}
          submitting={submitting}
        />
      )}

      {/* Violation Warning Banner */}
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 z-[9998] bg-red-500 p-3 sm:p-4" data-testid="violation-warning"
          style={{animation: 'slideDown 0.3s ease'}}>
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <Warning size={22} weight="fill" className="text-white" />
            <p className="text-white font-bold text-sm sm:text-base">{warningType} Detected! ({violations} total violations)</p>
          </div>
        </div>
      )}

      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">{quiz.title}</h1>
            <p className="text-xs sm:text-sm font-medium text-slate-400 truncate">{quiz.subject} • {quiz.total_marks} marks</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="bg-amber-50 dark:bg-amber-500/15 px-3 sm:px-4 py-2 rounded-2xl flex items-center gap-1.5 sm:gap-2" data-testid="quiz-timer">
              <Clock size={18} weight="duotone" className="text-amber-500" />
              <span className={`text-base sm:text-xl font-extrabold ${timeRemaining < 300 ? 'text-red-600 animate-pulse' : 'text-amber-600 dark:text-amber-400'}`}>{formatTime(timeRemaining)}</span>
            </div>
            <div className="bg-red-50 dark:bg-red-500/15 px-3 sm:px-4 py-2 rounded-2xl flex items-center gap-1.5 sm:gap-2" data-testid="violation-counter">
              <Warning size={18} weight="duotone" className="text-red-500" />
              <span className="text-base sm:text-xl font-extrabold text-red-600 dark:text-red-400">{violations}</span>
            </div>
            <div className="hidden sm:flex bg-emerald-50 dark:bg-emerald-500/15 px-4 py-2 rounded-2xl items-center gap-2" data-testid="proctoring-status">
              <Camera size={18} weight="duotone" className="text-emerald-500" />
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{webcamActive ? 'Cam On' : webcamError ? 'No Cam' : '...'}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="soft-card p-4 sm:p-6 lg:sticky lg:top-24">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 sm:mb-4">Questions</h3>
              <div className="grid grid-cols-8 sm:grid-cols-5 lg:grid-cols-3 gap-2">
                {questions.map((q, i) => (
                  <button key={i} data-testid={`question-nav-${i + 1}`} onClick={() => setCurrentQuestion(i)}
                    className={`aspect-square rounded-xl font-bold text-xs sm:text-sm transition-all relative ${getNavClass(i)}`}>
                    {i + 1}
                    {markedForReview.has(i) && currentQuestion !== i && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white dark:border-slate-800"></div>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-4 sm:mt-6 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5"><div className="w-4 h-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md"></div><span className="font-medium text-slate-500 dark:text-slate-400">Current</span></div>
                <div className="flex items-center gap-2.5"><div className="w-4 h-4 bg-emerald-100 dark:bg-emerald-500/20 rounded-md"></div><span className="font-medium text-slate-500 dark:text-slate-400">Answered</span></div>
                <div className="flex items-center gap-2.5"><div className="w-4 h-4 bg-amber-100 dark:bg-amber-500/20 rounded-md ring-2 ring-amber-400"></div><span className="font-medium text-slate-500 dark:text-slate-400">Marked for Review</span></div>
                <div className="flex items-center gap-2.5"><div className="w-4 h-4 bg-slate-100 dark:bg-slate-700/50 rounded-md"></div><span className="font-medium text-slate-500 dark:text-slate-400">Not Answered</span></div>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-400 mt-4 text-center">{Object.keys(answers).length}/{questions.length} answered</p>
              {/* Webcam feed — hidden on mobile */}
              <div className="mt-4 rounded-2xl overflow-hidden bg-slate-900 hidden sm:block" data-testid="webcam-feed">
                {webcamActive ? (
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-auto rounded-2xl" style={{ transform: 'scaleX(-1)' }} />
                ) : webcamError ? (
                  <div className="p-4 flex flex-col items-center gap-2">
                    <CameraSlash size={24} weight="duotone" className="text-slate-500 dark:text-slate-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Camera access denied</p>
                  </div>
                ) : (
                  <div className="p-4 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <button data-testid="submit-quiz-button" onClick={handleSubmitClick} disabled={submitting} className="btn-primary w-full mt-4 text-sm disabled:opacity-60">
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {currentQ && (
              <div className="soft-card p-5 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Question {currentQuestion + 1} of {questions.length}</span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">
                      {(currentQ.type === 'mcq-single' || currentQ.type === 'mcq-multiple') && 'Multiple Choice'}
                      {currentQ.type === 'boolean' && 'True / False'}
                      {currentQ.type === 'short' && 'Short Answer'}
                      {currentQ.type === 'coding' && 'Coding Challenge'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentQ.type === 'coding' && (
                      <span className="soft-badge bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600">{currentQ.language || 'python'}</span>
                    )}
                    <span className="soft-badge bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">{currentQ.marks} marks</span>
                  </div>
                </div>

                <p className="text-base sm:text-lg font-medium text-slate-700 dark:text-slate-300 leading-relaxed mb-6 sm:mb-8 select-none">{currentQ.text || currentQ.question}</p>

                {(currentQ.type === 'mcq-single' || currentQ.type === 'mcq-multiple') && (() => {
                  const indices = shuffledMap?.[currentQuestion] || currentQ.options.map((_, i) => i);
                  return (
                  <div className="space-y-3">
                    {indices.map((origIdx, displayIdx) => (
                      <button key={origIdx} data-testid={`option-${displayIdx}`} onClick={() => handleAnswer(currentQuestion, currentQ.type === 'mcq-multiple' ? ((answers[currentQuestion] || []).includes(origIdx) ? (answers[currentQuestion] || []).filter(a => a !== origIdx) : [...(answers[currentQuestion] || []), origIdx]) : origIdx)}
                        className={`w-full text-left p-3 sm:p-4 rounded-2xl font-medium transition-all select-none text-sm sm:text-base ${
                          (currentQ.type === 'mcq-single' ? answers[currentQuestion] === origIdx : (answers[currentQuestion] || []).includes(origIdx)) ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }`}>
                        <span className="font-bold mr-3 text-sm">{String.fromCharCode(65 + displayIdx)}.</span>{currentQ.options[origIdx]}
                      </button>
                    ))}
                  </div>
                  );
                })()}

                {currentQ.type === 'boolean' && (
                  <div className="flex gap-3 sm:gap-4">
                    <button data-testid="true-button" onClick={() => handleAnswer(currentQuestion, true)}
                      className={`flex-1 p-4 sm:p-6 rounded-2xl font-bold text-base sm:text-lg transition-all ${answers[currentQuestion] === true ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                      <CheckCircle size={28} weight="duotone" className="mx-auto mb-2" />TRUE
                    </button>
                    <button data-testid="false-button" onClick={() => handleAnswer(currentQuestion, false)}
                      className={`flex-1 p-4 sm:p-6 rounded-2xl font-bold text-base sm:text-lg transition-all ${answers[currentQuestion] === false ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-2 ring-rose-500' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                      <XCircle size={28} weight="duotone" className="mx-auto mb-2" />FALSE
                    </button>
                  </div>
                )}

                {currentQ.type === 'short' && (
                  <textarea data-testid="short-answer-input" value={answers[currentQuestion] || ''}
                    onChange={(e) => handleAnswer(currentQuestion, e.target.value)}
                    placeholder="Type your answer here..." rows="6" className="soft-input w-full resize-none text-sm sm:text-base" />
                )}

                {currentQ.type === 'coding' && (
                  <CodeEditor
                    value={answers[currentQuestion] || currentQ.starter_code || ''}
                    onChange={(val) => handleAnswer(currentQuestion, val)}
                    language={currentQ.language || 'python'}
                    onRun={() => handleRunCode(currentQuestion)}
                    running={runningCode}
                    output={codeOutputs[currentQuestion]}
                  />
                )}

                {/* Action Bar: Clear / Mark / Prev / Next */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-700 gap-3">
                  <div className="flex items-center gap-2">
                    {/* Clear Selection */}
                    {answers[currentQuestion] !== undefined && currentQ.type !== 'coding' && (
                      <button data-testid="clear-selection-button" onClick={() => handleClearAnswer(currentQuestion)}
                        className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 transition-colors">
                        <Eraser size={16} weight="duotone" /> Clear
                      </button>
                    )}
                    {/* Mark for Review */}
                    <button data-testid="mark-review-button" onClick={() => toggleMarkForReview(currentQuestion)}
                      className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                        markedForReview.has(currentQuestion)
                          ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                          : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100'
                      }`}>
                      <BookmarkSimple size={16} weight={markedForReview.has(currentQuestion) ? 'fill' : 'duotone'} />
                      {markedForReview.has(currentQuestion) ? 'Marked' : 'Review'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button data-testid="previous-question-button" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                      disabled={currentQuestion === 0} className={`btn-ghost !px-4 sm:!px-6 !py-2.5 text-sm ${currentQuestion === 0 ? 'opacity-40' : ''}`}>Previous</button>
                    <button data-testid="next-question-button" onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                      disabled={currentQuestion === questions.length - 1} className={`btn-primary !px-4 sm:!px-6 !py-2.5 text-sm ${currentQuestion === questions.length - 1 ? 'opacity-40' : ''}`}>Next</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertModal
        open={alertModal.open}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        onConfirm={closeAlert}
        onCancel={closeAlert}
      />

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default QuizAttempt;
