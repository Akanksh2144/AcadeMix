import React, { useState } from 'react';
import { Clock, Warning, Camera, CheckCircle, XCircle } from '@phosphor-icons/react';

const QuizAttempt = ({ quiz, navigate }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes in seconds
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const questions = [
    {
      id: 1,
      type: 'mcq',
      question: 'What is the time complexity of searching in a balanced Binary Search Tree?',
      options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
      correctAnswer: 1,
      marks: 2
    },
    {
      id: 2,
      type: 'mcq',
      question: 'Which data structure uses LIFO (Last In First Out) principle?',
      options: ['Queue', 'Stack', 'Array', 'Linked List'],
      correctAnswer: 1,
      marks: 2
    },
    {
      id: 3,
      type: 'multiple',
      question: 'Which of the following are linear data structures? (Select all that apply)',
      options: ['Array', 'Tree', 'Linked List', 'Graph', 'Queue'],
      correctAnswers: [0, 2, 4],
      marks: 3
    },
    {
      id: 4,
      type: 'boolean',
      question: 'A hash table provides O(1) average-case time complexity for search operations.',
      correctAnswer: true,
      marks: 1
    },
    {
      id: 5,
      type: 'short',
      question: 'Explain the difference between a stack and a queue in 2-3 sentences.',
      marks: 4
    }
  ];

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = () => {
    if (window.confirm('Are you sure you want to submit your quiz?')) {
      navigate('quiz-results');
    }
  };

  const handleTabSwitch = () => {
    setViolations(violations + 1);
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Warning Banner */}
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#FF6B6B] border-b-4 border-[#0A0A0A] p-4" data-testid="violation-warning">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <Warning size={24} weight="bold" className="text-white" />
            <p className="text-white font-bold">Tab Switch Detected! This action has been logged. ({violations} violations)</p>
          </div>
        </div>
      )}

      {/* Quiz Header */}
      <header className="bg-[#FDFCF8] border-b-4 border-[#0A0A0A] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tighter">Data Structures - Arrays & Linked Lists</h1>
              <p className="text-sm font-medium text-[#0A0A0A]/60">Computer Science • 50 marks</p>
            </div>
            <div className="flex items-center gap-6">
              {/* Timer */}
              <div className="neo-card px-4 py-2 bg-[#FDF5A9]" data-testid="quiz-timer">
                <div className="flex items-center gap-2">
                  <Clock size={24} weight="bold" />
                  <span className="text-2xl font-black">{formatTime(timeRemaining)}</span>
                </div>
              </div>
              {/* Violations */}
              <div className="neo-card px-4 py-2 bg-[#FF6B6B] text-white" data-testid="violation-counter">
                <div className="flex items-center gap-2">
                  <Warning size={24} weight="bold" />
                  <span className="text-xl font-black">{violations}</span>
                </div>
              </div>
              {/* Proctoring Status */}
              <div className="neo-card px-4 py-2 bg-[#A1E3D8]" data-testid="proctoring-status">
                <div className="flex items-center gap-2">
                  <Camera size={24} weight="bold" />
                  <span className="text-sm font-bold">Recording</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question Navigation */}
          <div className="lg:col-span-1">
            <div className="neo-card p-6 sticky top-24">
              <h3 className="text-lg font-bold mb-4">Questions</h3>
              <div className="grid grid-cols-5 lg:grid-cols-3 gap-2">
                {questions.map((q, index) => (
                  <button
                    key={q.id}
                    data-testid={`question-nav-${index + 1}`}
                    onClick={() => setCurrentQuestion(index)}
                    className={`aspect-square border-2 border-[#0A0A0A] font-bold transition-all ${
                      currentQuestion === index 
                        ? 'bg-[#FF9EC6] shadow-[4px_4px_0px_0px_#0A0A0A]' 
                        : answers[q.id] !== undefined
                        ? 'bg-[#A1E3D8]'
                        : 'bg-white hover:bg-[#F0EFEB]'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#FF9EC6] border-2 border-[#0A0A0A]"></div>
                  <span className="font-medium">Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#A1E3D8] border-2 border-[#0A0A0A]"></div>
                  <span className="font-medium">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white border-2 border-[#0A0A0A]"></div>
                  <span className="font-medium">Not Answered</span>
                </div>
              </div>

              <button
                data-testid="submit-quiz-button"
                onClick={handleSubmit}
                className="neo-button w-full py-3 bg-[#FF9EC6] mt-6"
              >
                Submit Quiz
              </button>
            </div>
          </div>

          {/* Question Display */}
          <div className="lg:col-span-3">
            <div className="neo-card p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">
                    Question {currentQuestion + 1} of {questions.length}
                  </span>
                  <h2 className="text-xl font-bold mt-1">
                    {questions[currentQuestion].type === 'mcq' && 'Multiple Choice'}
                    {questions[currentQuestion].type === 'multiple' && 'Multiple Select'}
                    {questions[currentQuestion].type === 'boolean' && 'True / False'}
                    {questions[currentQuestion].type === 'short' && 'Short Answer'}
                  </h2>
                </div>
                <span className="neo-badge bg-[#FDF5A9]">
                  {questions[currentQuestion].marks} marks
                </span>
              </div>

              <div className="mb-8">
                <p className="text-lg font-medium leading-relaxed select-none">
                  {questions[currentQuestion].question}
                </p>
              </div>

              {/* MCQ Options */}
              {(questions[currentQuestion].type === 'mcq' || questions[currentQuestion].type === 'multiple') && (
                <div className="space-y-3">
                  {questions[currentQuestion].options.map((option, index) => (
                    <button
                      key={index}
                      data-testid={`option-${index}`}
                      onClick={() => handleAnswer(questions[currentQuestion].id, index)}
                      className={`w-full text-left p-4 border-2 border-[#0A0A0A] font-medium transition-all select-none ${
                        answers[questions[currentQuestion].id] === index
                          ? 'bg-[#B4D8E7] shadow-[4px_4px_0px_0px_#0A0A0A]'
                          : 'bg-white hover:bg-[#F0EFEB]'
                      }`}
                    >
                      <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {/* True/False */}
              {questions[currentQuestion].type === 'boolean' && (
                <div className="flex gap-4">
                  <button
                    data-testid="true-button"
                    onClick={() => handleAnswer(questions[currentQuestion].id, true)}
                    className={`flex-1 p-6 border-2 border-[#0A0A0A] font-bold text-lg transition-all ${
                      answers[questions[currentQuestion].id] === true
                        ? 'bg-[#A1E3D8] shadow-[4px_4px_0px_0px_#0A0A0A]'
                        : 'bg-white hover:bg-[#F0EFEB]'
                    }`}
                  >
                    <CheckCircle size={32} weight="bold" className="mx-auto mb-2" />
                    TRUE
                  </button>
                  <button
                    data-testid="false-button"
                    onClick={() => handleAnswer(questions[currentQuestion].id, false)}
                    className={`flex-1 p-6 border-2 border-[#0A0A0A] font-bold text-lg transition-all ${
                      answers[questions[currentQuestion].id] === false
                        ? 'bg-[#FF9EC6] shadow-[4px_4px_0px_0px_#0A0A0A]'
                        : 'bg-white hover:bg-[#F0EFEB]'
                    }`}
                  >
                    <XCircle size={32} weight="bold" className="mx-auto mb-2" />
                    FALSE
                  </button>
                </div>
              )}

              {/* Short Answer */}
              {questions[currentQuestion].type === 'short' && (
                <textarea
                  data-testid="short-answer-input"
                  value={answers[questions[currentQuestion].id] || ''}
                  onChange={(e) => handleAnswer(questions[currentQuestion].id, e.target.value)}
                  placeholder="Type your answer here..."
                  rows="8"
                  className="neo-input w-full p-4 font-medium resize-none"
                />
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-[#0A0A0A]">
                <button
                  data-testid="previous-question-button"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className={`neo-button px-6 py-2 ${
                    currentQuestion === 0
                      ? 'bg-[#F0EFEB] opacity-50 cursor-not-allowed'
                      : 'bg-white'
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-[#0A0A0A]/60">
                  {Object.keys(answers).length} of {questions.length} answered
                </span>
                <button
                  data-testid="next-question-button"
                  onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                  disabled={currentQuestion === questions.length - 1}
                  className={`neo-button px-6 py-2 ${
                    currentQuestion === questions.length - 1
                      ? 'bg-[#F0EFEB] opacity-50 cursor-not-allowed'
                      : 'bg-[#FF9EC6]'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizAttempt;