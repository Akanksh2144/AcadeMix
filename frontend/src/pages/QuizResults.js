import React from 'react';
import { Trophy, Clock, CheckCircle, XCircle, Target, ArrowLeft } from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const QuizResults = ({ navigate, userRole }) => {
  const attemptedQuizzes = [
    { id: 1, title: 'DBMS - Normalization', subject: 'Computer Science', score: 42, total: 50, percentage: 84, timeTaken: 35, date: '2024-01-20', rank: 8 },
    { id: 2, title: 'Operating Systems - Process Management', subject: 'Computer Science', score: 38, total: 45, percentage: 84.4, timeTaken: 40, date: '2024-01-18', rank: 12 },
    { id: 3, title: 'Algorithms - Sorting', subject: 'Computer Science', score: 45, total: 50, percentage: 90, timeTaken: 42, date: '2024-01-15', rank: 3 },
    { id: 4, title: 'Data Structures - Trees', subject: 'Computer Science', score: 38, total: 50, percentage: 76, timeTaken: 48, date: '2024-01-10', rank: 15 },
  ];

  const trendData = [
    { date: 'Jan 10', score: 76 },
    { date: 'Jan 15', score: 90 },
    { date: 'Jan 18', score: 84.4 },
    { date: 'Jan 20', score: 84 },
  ];

  const topicAccuracy = [
    { topic: 'Arrays', accuracy: 92 },
    { topic: 'Trees', accuracy: 78 },
    { topic: 'Sorting', accuracy: 95 },
    { topic: 'Graphs', accuracy: 68 },
  ];

  const averageScore = (attemptedQuizzes.reduce((sum, q) => sum + q.percentage, 0) / attemptedQuizzes.length).toFixed(1);

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Header */}
      <header className="bg-[#FDFCF8] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              data-testid="back-button"
              onClick={() => navigate(userRole === 'student' ? 'student-dashboard' : 'teacher-dashboard')}
              className="neo-button p-2 bg-white"
            >
              <ArrowLeft size={24} weight="bold" />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">Quiz Results</h1>
              <p className="text-sm font-medium text-[#0A0A0A]/60">Your performance overview</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="neo-card p-6" data-testid="total-quizzes-stat">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">Total Quizzes</span>
              <Target size={20} weight="bold" className="text-[#FF9EC6]" />
            </div>
            <p className="text-3xl font-black">{attemptedQuizzes.length}</p>
          </div>
          <div className="neo-card p-6" data-testid="average-score-stat">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">Avg Score</span>
              <Trophy size={20} weight="bold" className="text-[#FDF5A9]" />
            </div>
            <p className="text-3xl font-black">{averageScore}%</p>
          </div>
          <div className="neo-card p-6" data-testid="best-score-stat">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">Best Score</span>
              <CheckCircle size={20} weight="bold" className="text-[#A1E3D8]" />
            </div>
            <p className="text-3xl font-black">90%</p>
          </div>
          <div className="neo-card p-6" data-testid="avg-time-stat">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">Avg Time</span>
              <Clock size={20} weight="bold" className="text-[#B4D8E7]" />
            </div>
            <p className="text-3xl font-black">41m</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Score Trend */}
          <div className="neo-card p-6">
            <h3 className="text-xl font-bold mb-4">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeWidth={2} stroke="#0A0A0A" strokeDasharray="0" />
                <XAxis dataKey="date" stroke="#0A0A0A" style={{ fontWeight: 'bold' }} />
                <YAxis stroke="#0A0A0A" style={{ fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{
                    border: '2px solid #0A0A0A',
                    boxShadow: '4px 4px 0px 0px #0A0A0A',
                    borderRadius: 0,
                    fontWeight: 'bold'
                  }}
                />
                <Line type="monotone" dataKey="score" stroke="#FF9EC6" strokeWidth={3} dot={{ fill: '#FF9EC6', r: 6, strokeWidth: 2, stroke: '#0A0A0A' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Topic-wise Accuracy */}
          <div className="neo-card p-6">
            <h3 className="text-xl font-bold mb-4">Topic-wise Accuracy</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topicAccuracy}>
                <CartesianGrid strokeWidth={2} stroke="#0A0A0A" strokeDasharray="0" />
                <XAxis dataKey="topic" stroke="#0A0A0A" style={{ fontWeight: 'bold' }} />
                <YAxis stroke="#0A0A0A" style={{ fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{
                    border: '2px solid #0A0A0A',
                    boxShadow: '4px 4px 0px 0px #0A0A0A',
                    borderRadius: 0,
                    fontWeight: 'bold'
                  }}
                />
                <Bar dataKey="accuracy" fill="#A1E3D8" stroke="#0A0A0A" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quiz List */}
        <div className="neo-card p-6">
          <h3 className="text-2xl font-bold mb-6">All Quiz Attempts</h3>
          <div className="space-y-4">
            {attemptedQuizzes.map((quiz) => (
              <div key={quiz.id} className="neo-card-hover p-6 transition-all" data-testid={`quiz-result-${quiz.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold mb-1">{quiz.title}</h4>
                    <p className="text-sm font-medium text-[#0A0A0A]/60">{quiz.subject} • {quiz.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-black">{quiz.percentage}%</p>
                      <p className="text-xs font-medium text-[#0A0A0A]/60">{quiz.score}/{quiz.total} marks</p>
                    </div>
                    <span className="neo-badge bg-[#FDF5A9]">Rank #{quiz.rank}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock size={16} weight="bold" />
                    <span>{quiz.timeTaken} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle size={16} weight="bold" className="text-[#A1E3D8]" />
                    <span>{Math.round(quiz.score / quiz.total * 20)} Correct</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <XCircle size={16} weight="bold" className="text-[#FF6B6B]" />
                    <span>{20 - Math.round(quiz.score / quiz.total * 20)} Wrong</span>
                  </div>
                </div>
                <div className="h-2 bg-[#F0EFEB] border-2 border-[#0A0A0A] mb-4">
                  <div 
                    className="h-full bg-[#A1E3D8] border-r-2 border-[#0A0A0A]"
                    style={{ width: `${quiz.percentage}%` }}
                  ></div>
                </div>
                <button
                  data-testid={`view-review-${quiz.id}`}
                  className="neo-button px-4 py-2 bg-white text-sm"
                >
                  View Answer Review
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;