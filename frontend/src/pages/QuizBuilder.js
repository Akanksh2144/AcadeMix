import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash, Copy, Eye, Shuffle, ListChecks } from '@phosphor-icons/react';

const QuizBuilder = ({ navigate }) => {
  const [quizTitle, setQuizTitle] = useState('New Quiz');
  const [questions, setQuestions] = useState([
    { id: 1, type: 'mcq', text: '', options: ['', '', '', ''], correctAnswer: 0, marks: 2 }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const addQuestion = (type) => {
    const newQuestion = {
      id: questions.length + 1,
      type,
      text: '',
      options: type === 'mcq' || type === 'multiple' ? ['', '', '', ''] : [],
      correctAnswer: type === 'boolean' ? true : 0,
      marks: 2
    };
    setQuestions([...questions, newQuestion]);
    setCurrentQuestion(questions.length);
  };

  const deleteQuestion = (index) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setQuestions(newQuestions);
      setCurrentQuestion(Math.max(0, currentQuestion - 1));
    }
  };

  const duplicateQuestion = (index) => {
    const questionToDuplicate = { ...questions[index], id: questions.length + 1 };
    setQuestions([...questions, questionToDuplicate]);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Header */}
      <header className="bg-[#FDFCF8] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                data-testid="back-button"
                onClick={() => navigate('teacher-dashboard')}
                className="neo-button p-2 bg-white"
              >
                <ArrowLeft size={24} weight="bold" />
              </button>
              <div>
                <input
                  data-testid="quiz-title-input"
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="text-3xl font-black tracking-tighter bg-transparent border-none outline-none"
                />
                <p className="text-sm font-medium text-[#0A0A0A]/60">Quiz Builder</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                data-testid="preview-quiz-button"
                className="neo-button px-4 py-2 bg-white flex items-center gap-2"
              >
                <Eye size={20} weight="bold" />
                Preview
              </button>
              <button
                data-testid="save-draft-button"
                className="neo-button px-4 py-2 bg-[#B4D8E7]"
              >
                Save Draft
              </button>
              <button
                data-testid="publish-quiz-button"
                className="neo-button px-4 py-2 bg-[#FF9EC6]"
              >
                Publish Quiz
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quiz Configuration */}
        <div className="neo-card p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Quiz Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-2">Subject</label>
              <select className="neo-input w-full px-4 py-3 font-medium" data-testid="subject-select">
                <option>Computer Science</option>
                <option>Mathematics</option>
                <option>Physics</option>
              </select>
            </div>
            <div>
              <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-2">Duration (mins)</label>
              <input
                data-testid="duration-input"
                type="number"
                defaultValue="60"
                className="neo-input w-full px-4 py-3 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-2">Total Marks</label>
              <input
                data-testid="total-marks-input"
                type="number"
                value={questions.reduce((sum, q) => sum + q.marks, 0)}
                readOnly
                className="neo-input w-full px-4 py-3 font-medium bg-[#F0EFEB]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input type="checkbox" className="w-4 h-4 border-2 border-[#0A0A0A]" data-testid="negative-marking-checkbox" />
              Negative Marking
            </label>
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input type="checkbox" className="w-4 h-4 border-2 border-[#0A0A0A]" data-testid="randomize-questions-checkbox" />
              Randomize Questions
            </label>
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input type="checkbox" className="w-4 h-4 border-2 border-[#0A0A0A]" data-testid="show-answers-checkbox" />
              Show Answers After Submit
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question List */}
          <div>
            <div className="neo-card p-4 sticky top-24">
              <h4 className="font-bold mb-3">Questions ({questions.length})</h4>
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {questions.map((q, index) => (
                  <button
                    key={q.id}
                    data-testid={`question-nav-${index + 1}`}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-full text-left p-3 border-2 border-[#0A0A0A] font-medium transition-all ${
                      currentQuestion === index
                        ? 'bg-[#FF9EC6] shadow-[4px_4px_0px_0px_#0A0A0A]'
                        : 'bg-white hover:bg-[#F0EFEB]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Q{index + 1}</span>
                      <span className="text-xs uppercase">{q.type}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <button
                  data-testid="add-mcq-button"
                  onClick={() => addQuestion('mcq')}
                  className="neo-button w-full py-2 bg-[#A1E3D8] text-sm flex items-center justify-center gap-2"
                >
                  <Plus size={16} weight="bold" />
                  MCQ
                </button>
                <button
                  data-testid="add-boolean-button"
                  onClick={() => addQuestion('boolean')}
                  className="neo-button w-full py-2 bg-[#B4D8E7] text-sm flex items-center justify-center gap-2"
                >
                  <Plus size={16} weight="bold" />
                  True/False
                </button>
                <button
                  data-testid="add-short-button"
                  onClick={() => addQuestion('short')}
                  className="neo-button w-full py-2 bg-[#FDF5A9] text-sm flex items-center justify-center gap-2"
                >
                  <Plus size={16} weight="bold" />
                  Short Answer
                </button>
              </div>
            </div>
          </div>

          {/* Question Editor */}
          <div className="lg:col-span-3">
            <div className="neo-card p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">
                    Question {currentQuestion + 1} of {questions.length}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="neo-badge bg-[#B4D8E7] text-xs uppercase">
                      {questions[currentQuestion].type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    data-testid="duplicate-question-button"
                    onClick={() => duplicateQuestion(currentQuestion)}
                    className="neo-button p-2 bg-white"
                    title="Duplicate"
                  >
                    <Copy size={20} weight="bold" />
                  </button>
                  <button
                    data-testid="delete-question-button"
                    onClick={() => deleteQuestion(currentQuestion)}
                    className="neo-button p-2 bg-[#FF6B6B] text-white"
                    disabled={questions.length === 1}
                    title="Delete"
                  >
                    <Trash size={20} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="mb-6">
                <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-2">Question</label>
                <textarea
                  data-testid="question-text-input"
                  value={questions[currentQuestion].text}
                  onChange={(e) => {
                    const newQuestions = [...questions];
                    newQuestions[currentQuestion].text = e.target.value;
                    setQuestions(newQuestions);
                  }}
                  placeholder="Enter your question here..."
                  rows="4"
                  className="neo-input w-full p-4 font-medium resize-none"
                />
              </div>

              {/* MCQ Options */}
              {(questions[currentQuestion].type === 'mcq' || questions[currentQuestion].type === 'multiple') && (
                <div className="mb-6">
                  <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-3">Options</label>
                  <div className="space-y-3">
                    {questions[currentQuestion].options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`correct-answer-${currentQuestion}`}
                          checked={questions[currentQuestion].correctAnswer === index}
                          onChange={() => {
                            const newQuestions = [...questions];
                            newQuestions[currentQuestion].correctAnswer = index;
                            setQuestions(newQuestions);
                          }}
                          className="w-5 h-5 border-2 border-[#0A0A0A]"
                          data-testid={`correct-answer-radio-${index}`}
                        />
                        <input
                          data-testid={`option-${index}-input`}
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newQuestions = [...questions];
                            newQuestions[currentQuestion].options[index] = e.target.value;
                            setQuestions(newQuestions);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          className="neo-input flex-1 px-4 py-3 font-medium"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* True/False */}
              {questions[currentQuestion].type === 'boolean' && (
                <div className="mb-6">
                  <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-3">Correct Answer</label>
                  <div className="flex gap-4">
                    <button
                      data-testid="true-correct-button"
                      onClick={() => {
                        const newQuestions = [...questions];
                        newQuestions[currentQuestion].correctAnswer = true;
                        setQuestions(newQuestions);
                      }}
                      className={`flex-1 py-4 border-2 border-[#0A0A0A] font-bold text-lg transition-all ${
                        questions[currentQuestion].correctAnswer === true
                          ? 'bg-[#A1E3D8] shadow-[4px_4px_0px_0px_#0A0A0A]'
                          : 'bg-white hover:bg-[#F0EFEB]'
                      }`}
                    >
                      TRUE
                    </button>
                    <button
                      data-testid="false-correct-button"
                      onClick={() => {
                        const newQuestions = [...questions];
                        newQuestions[currentQuestion].correctAnswer = false;
                        setQuestions(newQuestions);
                      }}
                      className={`flex-1 py-4 border-2 border-[#0A0A0A] font-bold text-lg transition-all ${
                        questions[currentQuestion].correctAnswer === false
                          ? 'bg-[#A1E3D8] shadow-[4px_4px_0px_0px_#0A0A0A]'
                          : 'bg-white hover:bg-[#F0EFEB]'
                      }`}
                    >
                      FALSE
                    </button>
                  </div>
                </div>
              )}

              {/* Marks */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-2">Marks</label>
                  <input
                    data-testid="question-marks-input"
                    type="number"
                    value={questions[currentQuestion].marks}
                    onChange={(e) => {
                      const newQuestions = [...questions];
                      newQuestions[currentQuestion].marks = parseInt(e.target.value) || 0;
                      setQuestions(newQuestions);
                    }}
                    min="1"
                    className="neo-input w-full px-4 py-3 font-medium"
                  />
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