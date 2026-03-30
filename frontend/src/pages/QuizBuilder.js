import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash, Copy, Eye } from '@phosphor-icons/react';

const QuizBuilder = ({ navigate, user }) => {
  const [quizTitle, setQuizTitle] = useState('New Quiz');
  const [questions, setQuestions] = useState([{ id: 1, type: 'mcq', text: '', options: ['', '', '', ''], correctAnswer: 0, marks: 2 }]);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const addQuestion = (type) => {
    const nq = { id: questions.length + 1, type, text: '', options: type === 'mcq' || type === 'multiple' ? ['', '', '', ''] : [], correctAnswer: type === 'boolean' ? true : 0, marks: 2 };
    setQuestions([...questions, nq]);
    setCurrentQuestion(questions.length);
  };

  const deleteQuestion = (index) => {
    if (questions.length > 1) { setQuestions(questions.filter((_, i) => i !== index)); setCurrentQuestion(Math.max(0, currentQuestion - 1)); }
  };

  const duplicateQuestion = (index) => {
    setQuestions([...questions, { ...questions[index], id: questions.length + 1 }]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button data-testid="back-button" onClick={() => navigate(user?.role === 'hod' ? 'hod-dashboard' : user?.role === 'exam_cell' ? 'examcell-dashboard' : user?.role === 'admin' ? 'admin-dashboard' : 'teacher-dashboard')} className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors">
                <ArrowLeft size={22} weight="duotone" />
              </button>
              <div>
                <input data-testid="quiz-title-input" type="text" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)}
                  className="text-2xl font-extrabold tracking-tight bg-transparent border-none outline-none text-slate-900" />
                <p className="text-sm font-medium text-slate-400">Quiz Builder</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button data-testid="preview-quiz-button" className="btn-ghost !py-2.5 flex items-center gap-2 text-sm"><Eye size={18} weight="duotone" /> Preview</button>
              <button data-testid="save-draft-button" className="btn-secondary !py-2.5 text-sm">Save Draft</button>
              <button data-testid="publish-quiz-button" className="btn-primary !py-2.5 text-sm">Publish Quiz</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="soft-card p-6 mb-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Quiz Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Subject</label>
              <select className="soft-input w-full" data-testid="subject-select"><option>Computer Science</option><option>Mathematics</option><option>Physics</option></select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Duration (mins)</label>
              <input data-testid="duration-input" type="number" defaultValue="60" className="soft-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Total Marks</label>
              <input data-testid="total-marks-input" type="number" value={questions.reduce((s, q) => s + q.marks, 0)} readOnly className="soft-input w-full bg-slate-100" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {[{ id: 'negative-marking-checkbox', label: 'Negative Marking' }, { id: 'randomize-questions-checkbox', label: 'Randomize Questions' }, { id: 'show-answers-checkbox', label: 'Show Answers After Submit' }].map(c => (
              <label key={c.id} className="flex items-center gap-2.5 font-medium text-slate-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded-md accent-indigo-500" data-testid={c.id} />{c.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div>
            <div className="soft-card p-5 sticky top-24">
              <h4 className="font-bold text-slate-800 mb-3">Questions ({questions.length})</h4>
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {questions.map((q, index) => (
                  <button key={q.id} data-testid={`question-nav-${index + 1}`} onClick={() => setCurrentQuestion(index)}
                    className={`w-full text-left p-3 rounded-xl font-medium transition-all duration-200 ${
                      currentQuestion === index ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}>
                    <div className="flex items-center justify-between"><span className="font-bold">Q{index + 1}</span><span className="text-xs uppercase opacity-70">{q.type}</span></div>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {[{ type: 'mcq', label: 'MCQ', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
                  { type: 'boolean', label: 'True/False', color: 'bg-teal-50 text-teal-600 hover:bg-teal-100' },
                  { type: 'short', label: 'Short Answer', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' }].map(b => (
                  <button key={b.type} data-testid={`add-${b.type === 'boolean' ? 'boolean' : b.type}-button`} onClick={() => addQuestion(b.type)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${b.color}`}>
                    <Plus size={16} weight="bold" />{b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="soft-card p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Question {currentQuestion + 1} of {questions.length}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="soft-badge bg-indigo-50 text-indigo-600 text-xs uppercase">{questions[currentQuestion].type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button data-testid="duplicate-question-button" onClick={() => duplicateQuestion(currentQuestion)} className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"><Copy size={18} weight="duotone" /></button>
                  <button data-testid="delete-question-button" onClick={() => deleteQuestion(currentQuestion)} disabled={questions.length === 1}
                    className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-40"><Trash size={18} weight="duotone" /></button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Question</label>
                <textarea data-testid="question-text-input" value={questions[currentQuestion].text}
                  onChange={(e) => { const nq = [...questions]; nq[currentQuestion].text = e.target.value; setQuestions(nq); }}
                  placeholder="Enter your question here..." rows="4" className="soft-input w-full resize-none" />
              </div>

              {(questions[currentQuestion].type === 'mcq' || questions[currentQuestion].type === 'multiple') && (
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Options</label>
                  <div className="space-y-3">
                    {questions[currentQuestion].options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input type="radio" name={`correct-${currentQuestion}`} checked={questions[currentQuestion].correctAnswer === index}
                          onChange={() => { const nq = [...questions]; nq[currentQuestion].correctAnswer = index; setQuestions(nq); }}
                          className="w-5 h-5 accent-indigo-500" data-testid={`correct-answer-radio-${index}`} />
                        <input data-testid={`option-${index}-input`} type="text" value={option}
                          onChange={(e) => { const nq = [...questions]; nq[currentQuestion].options[index] = e.target.value; setQuestions(nq); }}
                          placeholder={`Option ${String.fromCharCode(65 + index)}`} className="soft-input flex-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {questions[currentQuestion].type === 'boolean' && (
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Correct Answer</label>
                  <div className="flex gap-4">
                    {[true, false].map(val => (
                      <button key={String(val)} data-testid={`${val ? 'true' : 'false'}-correct-button`}
                        onClick={() => { const nq = [...questions]; nq[currentQuestion].correctAnswer = val; setQuestions(nq); }}
                        className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all duration-200 ${
                          questions[currentQuestion].correctAnswer === val ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}>{val ? 'TRUE' : 'FALSE'}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Marks</label>
                  <input data-testid="question-marks-input" type="number" value={questions[currentQuestion].marks}
                    onChange={(e) => { const nq = [...questions]; nq[currentQuestion].marks = parseInt(e.target.value) || 0; setQuestions(nq); }}
                    min="1" className="soft-input w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizBuilder;
