import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash, Copy, Eye, CalendarBlank, Clock, X } from '@phosphor-icons/react';

const QuizBuilder = ({ navigate, user }) => {
  const [quizTitle, setQuizTitle] = useState('New Quiz');
  const [questions, setQuestions] = useState([{ 
    id: 1, 
    type: 'mcq-single', 
    text: '', 
    options: ['', '', '', ''], 
    correctAnswer: 0, 
    correctAnswers: [],  // For multiple selection
    marks: 2,
    language: 'python',  // For coding questions
    testCases: ''  // For coding questions
  }]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  const addQuestion = (type) => {
    const baseQuestion = { 
      id: questions.length + 1, 
      type, 
      text: '', 
      marks: 2 
    };
    
    let nq;
    if (type === 'mcq-single' || type === 'mcq-multiple') {
      nq = { 
        ...baseQuestion, 
        options: ['', '', '', ''], 
        correctAnswer: type === 'mcq-single' ? 0 : undefined,
        correctAnswers: type === 'mcq-multiple' ? [] : undefined
      };
    } else if (type === 'coding') {
      nq = { 
        ...baseQuestion, 
        language: 'python',
        testCases: '',
        sampleInput: '',
        sampleOutput: ''
      };
    } else {
      nq = { ...baseQuestion };  // short answer
    }
    
    setQuestions([...questions, nq]);
    setCurrentQuestion(questions.length);
  };

  const deleteQuestion = (index) => {
    if (questions.length > 1) { 
      setQuestions(questions.filter((_, i) => i !== index)); 
      setCurrentQuestion(Math.max(0, currentQuestion - 1)); 
    }
  };

  const duplicateQuestion = (index) => {
    setQuestions([...questions, { ...questions[index], id: questions.length + 1 }]);
  };

  const addOption = () => {
    const nq = [...questions];
    nq[currentQuestion].options.push('');
    setQuestions(nq);
  };

  const removeOption = (index) => {
    if (questions[currentQuestion].options.length > 2) {
      const nq = [...questions];
      nq[currentQuestion].options.splice(index, 1);
      // Adjust correct answer if needed
      if (nq[currentQuestion].type === 'mcq-single' && nq[currentQuestion].correctAnswer >= index) {
        nq[currentQuestion].correctAnswer = Math.max(0, nq[currentQuestion].correctAnswer - 1);
      } else if (nq[currentQuestion].type === 'mcq-multiple') {
        nq[currentQuestion].correctAnswers = nq[currentQuestion].correctAnswers
          .filter(a => a !== index)
          .map(a => a > index ? a - 1 : a);
      }
      setQuestions(nq);
    }
  };

  const toggleMultipleAnswer = (index) => {
    const nq = [...questions];
    const correctAnswers = nq[currentQuestion].correctAnswers || [];
    if (correctAnswers.includes(index)) {
      nq[currentQuestion].correctAnswers = correctAnswers.filter(a => a !== index);
    } else {
      nq[currentQuestion].correctAnswers = [...correctAnswers, index];
    }
    setQuestions(nq);
  };

  const handlePublish = () => {
    // Validation
    if (!quizTitle.trim()) {
      alert('Please enter a quiz title');
      return;
    }
    
    const emptyQuestions = questions.filter(q => !q.text.trim());
    if (emptyQuestions.length > 0) {
      alert('Please fill in all question texts');
      return;
    }
    
    // Check MCQ options
    const mcqQuestions = questions.filter(q => q.type === 'mcq-single' || q.type === 'mcq-multiple');
    for (let q of mcqQuestions) {
      const emptyOptions = q.options.filter(o => !o.trim());
      if (emptyOptions.length > 0) {
        alert('Please fill in all MCQ options');
        return;
      }
      
      if (q.type === 'mcq-multiple' && (!q.correctAnswers || q.correctAnswers.length === 0)) {
        alert('Please select at least one correct answer for multiple choice questions');
        return;
      }
    }
    
    // Check coding questions
    const codingQuestions = questions.filter(q => q.type === 'coding');
    for (let q of codingQuestions) {
      if (!q.language) {
        alert('Please select a programming language for coding questions');
        return;
      }
    }
    
    const quizData = {
      title: quizTitle,
      questions,
      scheduledDate: showSchedule ? scheduledDate : null,
      scheduledTime: showSchedule ? scheduledTime : null,
      status: showSchedule ? 'scheduled' : 'published'
    };
    
    console.log('Publishing quiz:', quizData);
    alert(showSchedule ? 'Quiz scheduled successfully!' : 'Quiz published successfully!');
    navigate(user?.role === 'hod' ? 'hod-dashboard' : 'teacher-dashboard');
  };

  const handleSaveDraft = () => {
    const quizData = {
      title: quizTitle,
      questions,
      status: 'draft'
    };
    console.log('Saving draft:', quizData);
    alert('Draft saved successfully!');
  };

  const q = questions[currentQuestion];

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
              <button 
                data-testid="schedule-quiz-button" 
                onClick={() => setShowSchedule(!showSchedule)}
                className={`btn-ghost !py-2.5 flex items-center gap-2 text-sm ${showSchedule ? 'bg-amber-50 text-amber-600' : ''}`}
              >
                <CalendarBlank size={18} weight="duotone" /> {showSchedule ? 'Cancel Schedule' : 'Schedule'}
              </button>
              <button data-testid="preview-quiz-button" className="btn-ghost !py-2.5 flex items-center gap-2 text-sm">
                <Eye size={18} weight="duotone" /> Preview
              </button>
              <button data-testid="save-draft-button" onClick={handleSaveDraft} className="btn-secondary !py-2.5 text-sm">Save Draft</button>
              <button data-testid="publish-quiz-button" onClick={handlePublish} className="btn-primary !py-2.5 text-sm">
                {showSchedule ? 'Schedule Quiz' : 'Publish Quiz'}
              </button>
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
              <select className="soft-input w-full" data-testid="subject-select">
                <option>Computer Science</option>
                <option>Mathematics</option>
                <option>Physics</option>
              </select>
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
          
          {showSchedule && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-4 bg-amber-50 rounded-2xl">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">
                  <CalendarBlank size={16} weight="duotone" className="inline mr-1" />
                  Schedule Date
                </label>
                <input 
                  data-testid="schedule-date-input"
                  type="date" 
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="soft-input w-full" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">
                  <Clock size={16} weight="duotone" className="inline mr-1" />
                  Schedule Time
                </label>
                <input 
                  data-testid="schedule-time-input"
                  type="time" 
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="soft-input w-full" 
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {[
              { id: 'negative-marking-checkbox', label: 'Negative Marking' }, 
              { id: 'randomize-questions-checkbox', label: 'Randomize Questions' }, 
              { id: 'show-answers-checkbox', label: 'Show Answers After Submit' }
            ].map(c => (
              <label key={c.id} className="flex items-center gap-2.5 font-medium text-slate-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded-md accent-indigo-500" data-testid={c.id} />
                {c.label}
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
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Q{index + 1}</span>
                      <span className="text-xs uppercase opacity-70">
                        {q.type === 'mcq-single' ? 'MCQ' : q.type === 'mcq-multiple' ? 'Multi' : q.type === 'coding' ? 'Code' : 'Short'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { type: 'mcq-single', label: 'MCQ (Single)', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
                  { type: 'mcq-multiple', label: 'MCQ (Multiple)', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
                  { type: 'short', label: 'Short Answer', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
                  { type: 'coding', label: 'Coding', color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' }
                ].map(b => (
                  <button key={b.type} data-testid={`add-${b.type}-button`} onClick={() => addQuestion(b.type)}
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
                    <span className={`soft-badge text-xs uppercase ${
                      q.type === 'mcq-single' ? 'bg-indigo-50 text-indigo-600' :
                      q.type === 'mcq-multiple' ? 'bg-purple-50 text-purple-600' :
                      q.type === 'coding' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {q.type === 'mcq-single' ? 'MCQ (Single)' : q.type === 'mcq-multiple' ? 'MCQ (Multiple)' : q.type === 'coding' ? 'Coding' : 'Short Answer'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button data-testid="duplicate-question-button" onClick={() => duplicateQuestion(currentQuestion)} className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors">
                    <Copy size={18} weight="duotone" />
                  </button>
                  <button data-testid="delete-question-button" onClick={() => deleteQuestion(currentQuestion)} disabled={questions.length === 1}
                    className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-40">
                    <Trash size={18} weight="duotone" />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Question</label>
                <textarea data-testid="question-text-input" value={q.text}
                  onChange={(e) => { const nq = [...questions]; nq[currentQuestion].text = e.target.value; setQuestions(nq); }}
                  placeholder="Enter your question here..." rows="4" className="soft-input w-full resize-none" />
              </div>

              {/* MCQ (Single or Multiple) Options */}
              {(q.type === 'mcq-single' || q.type === 'mcq-multiple') && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                      Options {q.type === 'mcq-multiple' && <span className="text-purple-600">(Select multiple correct answers)</span>}
                    </label>
                    <button 
                      onClick={addOption}
                      className="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1"
                    >
                      <Plus size={14} weight="bold" /> Add Option
                    </button>
                  </div>
                  <div className="space-y-3">
                    {q.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {q.type === 'mcq-single' ? (
                          <input 
                            type="radio" 
                            name={`correct-${currentQuestion}`} 
                            checked={q.correctAnswer === index}
                            onChange={() => { const nq = [...questions]; nq[currentQuestion].correctAnswer = index; setQuestions(nq); }}
                            className="w-5 h-5 accent-indigo-500" 
                            data-testid={`correct-answer-radio-${index}`} 
                          />
                        ) : (
                          <input 
                            type="checkbox" 
                            checked={(q.correctAnswers || []).includes(index)}
                            onChange={() => toggleMultipleAnswer(index)}
                            className="w-5 h-5 accent-purple-500 rounded" 
                            data-testid={`correct-answer-checkbox-${index}`} 
                          />
                        )}
                        <input 
                          data-testid={`option-${index}-input`} 
                          type="text" 
                          value={option}
                          onChange={(e) => { const nq = [...questions]; nq[currentQuestion].options[index] = e.target.value; setQuestions(nq); }}
                          placeholder={`Option ${String.fromCharCode(65 + index)}`} 
                          className="soft-input flex-1" 
                        />
                        {q.options.length > 2 && (
                          <button
                            onClick={() => removeOption(index)}
                            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                          >
                            <X size={16} weight="bold" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coding Question */}
              {q.type === 'coding' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Programming Language</label>
                    <select 
                      data-testid="coding-language-select"
                      value={q.language}
                      onChange={(e) => { const nq = [...questions]; nq[currentQuestion].language = e.target.value; setQuestions(nq); }}
                      className="soft-input w-full"
                    >
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="c">C</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Test Cases (One per line)</label>
                    <textarea 
                      data-testid="coding-test-cases-input"
                      value={q.testCases}
                      onChange={(e) => { const nq = [...questions]; nq[currentQuestion].testCases = e.target.value; setQuestions(nq); }}
                      placeholder="Example:&#10;Input: [1, 2, 3]&#10;Output: 6&#10;&#10;Input: [4, 5, 6]&#10;Output: 15"
                      rows="6" 
                      className="soft-input w-full resize-none font-mono text-sm" 
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Marks</label>
                  <input data-testid="question-marks-input" type="number" value={q.marks}
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
