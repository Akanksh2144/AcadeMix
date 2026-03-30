import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Warning, Camera, CheckCircle, XCircle, Play, Code, ArrowsOut, CameraSlash } from '@phosphor-icons/react';
import { attemptsAPI, quizzesAPI } from '../services/api';
import Editor from '@monaco-editor/react';
import api from '../services/api';

const CodeEditor = ({ value, onChange, language, onRun, running, output }) => {
  return (
    <div className="space-y-4" data-testid="code-editor-container">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Code size={18} weight="duotone" className="text-indigo-500" />
          <span className="text-sm font-bold text-slate-600">Language: {language || 'python'}</span>
        </div>
        <button
          data-testid="run-code-button"
          onClick={onRun}
          disabled={running}
          className="btn-primary !px-4 !py-2 text-sm flex items-center gap-2 disabled:opacity-60"
        >
          {running ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Play size={16} weight="fill" />
          )}
          {running ? 'Running...' : 'Run Code'}
        </button>
      </div>
      <div className="rounded-2xl overflow-hidden border border-slate-200">
        <Editor
          height="300px"
          language={language || 'python'}
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
  const [codeOutputs, setCodeOutputs] = useState({});
  const [runningCode, setRunningCode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const webcamRef = useRef(null);
  const videoRef = useRef(null);
  const violationRef = useRef(0);

  // Anti-cheat: Tab switch detection
  useEffect(() => {
    if (!attempt) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        violationRef.current += 1;
        setViolations(violationRef.current);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 4000);
        // Report to backend
        if (attempt?.id) {
          attemptsAPI.answer(attempt.id, { question_index: -1, answer: null, violation: true }).catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [attempt]);

  // Anti-cheat: Fullscreen enforcement
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    } catch {}
  }, []);

  useEffect(() => {
    if (!attempt) return;
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && attempt) {
        violationRef.current += 1;
        setViolations(violationRef.current);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 4000);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    // Try to enter fullscreen on start
    enterFullscreen();
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [attempt, enterFullscreen]);

  // Anti-cheat: Webcam monitoring
  useEffect(() => {
    if (!attempt) return;
    let stream = null;
    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setWebcamActive(true);
      } catch (err) {
        console.warn('Webcam access denied:', err);
        setWebcamError(true);
      }
    };
    startWebcam();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [attempt]);

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

  const handleRunCode = async (questionIndex) => {
    const code = answers[questionIndex];
    if (!code || !code.trim()) return;
    setRunningCode(true);
    try {
      const q = quiz.questions[questionIndex];
      const { data } = await api.post('/api/code/execute', {
        code,
        language: q.language || 'python',
        test_input: q.test_input || '',
      });
      setCodeOutputs({ ...codeOutputs, [questionIndex]: data.output || data.error || '(no output)' });
    } catch (err) {
      setCodeOutputs({ ...codeOutputs, [questionIndex]: err.response?.data?.detail || 'Execution failed' });
    }
    setRunningCode(false);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!window.confirm('Are you sure you want to submit?')) return;
    setSubmitting(true);
    try {
      await attemptsAPI.submit(attempt.id);
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
  const currentQ = questions[currentQuestion];

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
              <span className="text-sm font-bold text-emerald-600">{webcamActive ? 'Cam On' : webcamError ? 'No Cam' : '...'}</span>
            </div>
            {!isFullscreen && attempt && (
              <button data-testid="enter-fullscreen-button" onClick={enterFullscreen} className="bg-indigo-50 px-4 py-2 rounded-2xl flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                <ArrowsOut size={20} weight="duotone" className="text-indigo-500" />
                <span className="text-sm font-bold text-indigo-600">Fullscreen</span>
              </button>
            )}
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
              {/* Webcam feed */}
              <div className="mt-4 rounded-2xl overflow-hidden bg-slate-900" data-testid="webcam-feed">
                {webcamActive ? (
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-auto rounded-2xl" style={{ transform: 'scaleX(-1)' }} />
                ) : webcamError ? (
                  <div className="p-4 flex flex-col items-center gap-2">
                    <CameraSlash size={24} weight="duotone" className="text-slate-500" />
                    <p className="text-xs text-slate-500 text-center">Camera access denied</p>
                  </div>
                ) : (
                  <div className="p-4 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <button data-testid="submit-quiz-button" onClick={handleSubmit} disabled={submitting} className="btn-primary w-full mt-4 text-sm disabled:opacity-60">
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-3">
            {currentQ && (
              <div className="soft-card p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Question {currentQuestion + 1} of {questions.length}</span>
                    <h2 className="text-lg font-bold text-slate-800 mt-1">
                      {currentQ.type === 'mcq' && 'Multiple Choice'}
                      {currentQ.type === 'boolean' && 'True / False'}
                      {currentQ.type === 'short' && 'Short Answer'}
                      {currentQ.type === 'coding' && 'Coding Challenge'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentQ.type === 'coding' && (
                      <span className="soft-badge bg-indigo-50 text-indigo-600">{currentQ.language || 'python'}</span>
                    )}
                    <span className="soft-badge bg-amber-50 text-amber-600">{currentQ.marks} marks</span>
                  </div>
                </div>

                <p className="text-lg font-medium text-slate-700 leading-relaxed mb-8 select-none">{currentQ.question}</p>

                {currentQ.type === 'mcq' && (
                  <div className="space-y-3">
                    {(currentQ.options || []).map((option, i) => (
                      <button key={i} data-testid={`option-${i}`} onClick={() => handleAnswer(currentQuestion, i)}
                        className={`w-full text-left p-4 rounded-2xl font-medium transition-all select-none ${
                          answers[currentQuestion] === i ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}>
                        <span className="font-bold mr-3 text-sm">{String.fromCharCode(65 + i)}.</span>{option}
                      </button>
                    ))}
                  </div>
                )}

                {currentQ.type === 'boolean' && (
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

                {currentQ.type === 'short' && (
                  <textarea data-testid="short-answer-input" value={answers[currentQuestion] || ''}
                    onChange={(e) => handleAnswer(currentQuestion, e.target.value)}
                    placeholder="Type your answer here..." rows="8" className="soft-input w-full resize-none" />
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
