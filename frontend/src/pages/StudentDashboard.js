import React from 'react';
import { Clock, Trophy, ChartLine, Fire, BookOpen, Calendar, Target, SignOut } from '@phosphor-icons/react';
import Marquee from 'react-fast-marquee';

const StudentDashboard = ({ navigate }) => {
  const upcomingQuizzes = [
    { id: 1, title: 'Data Structures - Arrays & Linked Lists', subject: 'Computer Science', date: '2024-01-28', time: '10:00 AM', duration: 60, marks: 50 },
    { id: 2, title: 'Thermodynamics Mid-Term', subject: 'Physics', date: '2024-01-29', time: '2:00 PM', duration: 90, marks: 75 },
    { id: 3, title: 'Calculus - Integration Techniques', subject: 'Mathematics', date: '2024-01-30', time: '11:00 AM', duration: 45, marks: 40 },
  ];

  const recentResults = [
    { id: 1, title: 'DBMS Quiz - Normalization', score: 42, total: 50, percentage: 84, date: '2024-01-20' },
    { id: 2, title: 'Operating Systems - Process Management', score: 38, total: 45, percentage: 84.4, date: '2024-01-18' },
    { id: 3, title: 'Algorithms - Sorting Techniques', score: 45, total: 50, percentage: 90, date: '2024-01-15' },
  ];

  const stats = [
    { label: 'CGPA', value: '8.7', icon: Trophy, color: 'bg-[#FF9EC6]' },
    { label: 'Avg Quiz Score', value: '86%', icon: Target, color: 'bg-[#A1E3D8]' },
    { label: 'Quizzes Taken', value: '24', icon: BookOpen, color: 'bg-[#B4D8E7]' },
    { label: 'Current Rank', value: '#12', icon: Fire, color: 'bg-[#FDF5A9]' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Header */}
      <header className="bg-[#FDFCF8] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="neo-card p-2 bg-[#FF9EC6]">
                <BookOpen size={32} weight="bold" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter">QuizPortal</h1>
                <p className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/60">Student</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                data-testid="profile-button"
                className="neo-button px-4 py-2 bg-white"
              >
                Rajesh Kumar
              </button>
              <button
                data-testid="logout-button"
                onClick={() => navigate('login')}
                className="neo-button px-4 py-2 bg-white"
              >
                <SignOut size={20} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Announcement Ticker */}
      <div className="bg-[#0A0A0A] text-white py-2 border-b-2 border-[#0A0A0A]">
        <Marquee gradient={false} speed={50}>
          <span className="mx-8 font-bold text-sm">🎯 New Quiz Available: Operating Systems - Deadlock Prevention</span>
          <span className="mx-8 font-bold text-sm">🏆 Congratulations! You're in the Top 20 this semester!</span>
          <span className="mx-8 font-bold text-sm">📊 Semester Results for BE-3rd Sem are now live</span>
          <span className="mx-8 font-bold text-sm">⚡ Quiz Reminder: Data Structures quiz starts in 2 hours</span>
        </Marquee>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-2">Welcome Back, Rajesh! 👋</h2>
          <p className="text-base font-medium text-[#0A0A0A]/70">Here's what's happening with your academics today</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="neo-card-hover p-6 transition-all" data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">{stat.label}</span>
                  <div className={`${stat.color} p-2 border-2 border-[#0A0A0A]`}>
                    <Icon size={20} weight="bold" />
                  </div>
                </div>
                <p className="text-3xl font-black tracking-tight">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <button
            data-testid="view-all-quizzes-button"
            onClick={() => navigate('quiz-results')}
            className="neo-button p-6 bg-[#A1E3D8] text-left flex items-center gap-4"
          >
            <BookOpen size={32} weight="bold" />
            <div>
              <p className="font-black text-lg">My Quizzes</p>
              <p className="text-xs font-medium opacity-70">View all attempts</p>
            </div>
          </button>
          <button
            data-testid="view-semester-results-button"
            onClick={() => navigate('semester-results')}
            className="neo-button p-6 bg-[#B4D8E7] text-left flex items-center gap-4"
          >
            <Calendar size={32} weight="bold" />
            <div>
              <p className="font-black text-lg">Semester Results</p>
              <p className="text-xs font-medium opacity-70">Check your grades</p>
            </div>
          </button>
          <button
            data-testid="view-analytics-button"
            onClick={() => navigate('analytics')}
            className="neo-button p-6 bg-[#FDF5A9] text-left flex items-center gap-4"
          >
            <ChartLine size={32} weight="bold" />
            <div>
              <p className="font-black text-lg">Analytics</p>
              <p className="text-xs font-medium opacity-70">Track performance</p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Quizzes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold tracking-tight">Upcoming Quizzes</h3>
              <span className="neo-badge bg-[#FF9EC6]">{upcomingQuizzes.length} Active</span>
            </div>
            <div className="space-y-4">
              {upcomingQuizzes.map((quiz) => (
                <div key={quiz.id} className="neo-card-hover p-6 transition-all" data-testid={`upcoming-quiz-${quiz.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-1">{quiz.title}</h4>
                      <p className="text-sm font-medium text-[#0A0A0A]/60">{quiz.subject}</p>
                    </div>
                    <span className="neo-badge bg-[#FDF5A9]">{quiz.marks} marks</span>
                  </div>
                  <div className="flex items-center gap-4 mb-4 text-sm font-medium">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} weight="bold" />
                      <span>{quiz.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={16} weight="bold" />
                      <span>{quiz.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={16} weight="bold" />
                      <span>{quiz.duration} min</span>
                    </div>
                  </div>
                  <button
                    data-testid={`start-quiz-${quiz.id}`}
                    onClick={() => navigate('quiz-attempt', quiz)}
                    className="neo-button w-full py-2 bg-[#FF9EC6]"
                  >
                    Start Quiz
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Results */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold tracking-tight">Recent Results</h3>
              <button
                data-testid="view-all-results-button"
                onClick={() => navigate('quiz-results')}
                className="text-sm font-bold text-[#B4D8E7] hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentResults.map((result) => (
                <div key={result.id} className="neo-card-hover p-6 transition-all" data-testid={`recent-result-${result.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-1">{result.title}</h4>
                      <p className="text-sm font-medium text-[#0A0A0A]/60">{result.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black">{result.percentage}%</p>
                      <p className="text-xs font-medium text-[#0A0A0A]/60">{result.score}/{result.total}</p>
                    </div>
                  </div>
                  <div className="h-2 bg-[#F0EFEB] border-2 border-[#0A0A0A]">
                    <div 
                      className="h-full bg-[#A1E3D8] border-r-2 border-[#0A0A0A]"
                      style={{ width: `${result.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Leaderboard Teaser */}
            <div className="mt-6 neo-card-hover p-6 bg-gradient-to-br from-[#FF9EC6] to-[#FDF5A9] transition-all">
              <div className="flex items-center gap-3 mb-3">
                <Trophy size={32} weight="bold" />
                <div>
                  <h4 className="font-black text-xl">You're Rank #12</h4>
                  <p className="text-sm font-medium">in your batch</p>
                </div>
              </div>
              <button
                data-testid="view-leaderboard-button"
                onClick={() => navigate('leaderboard')}
                className="neo-button w-full py-2 bg-white"
              >
                View Leaderboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;