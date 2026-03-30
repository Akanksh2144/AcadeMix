import React from 'react';
import { BookOpen, Plus, ChartLine, Users, Eye, SignOut, Clipboard, Calendar } from '@phosphor-icons/react';

const TeacherDashboard = ({ navigate }) => {
  const myQuizzes = [
    { id: 1, title: 'Data Structures - Arrays', status: 'Active', students: 45, completed: 38, avgScore: 78, date: '2024-01-28' },
    { id: 2, title: 'DBMS - Normalization', status: 'Ended', students: 42, completed: 42, avgScore: 82, date: '2024-01-20' },
    { id: 3, title: 'Operating Systems Quiz', status: 'Scheduled', students: 48, completed: 0, avgScore: 0, date: '2024-02-05' },
  ];

  const recentActivity = [
    { type: 'submission', student: 'Rajesh Kumar', quiz: 'Data Structures - Arrays', time: '5 mins ago' },
    { type: 'submission', student: 'Priya Sharma', quiz: 'Data Structures - Arrays', time: '12 mins ago' },
    { type: 'violation', student: 'Amit Patel', quiz: 'Data Structures - Arrays', time: '18 mins ago' },
  ];

  const stats = [
    { label: 'Total Quizzes', value: '12', icon: Clipboard, color: 'bg-[#FF9EC6]' },
    { label: 'Active Students', value: '156', icon: Users, color: 'bg-[#A1E3D8]' },
    { label: 'Avg Class Score', value: '82%', icon: ChartLine, color: 'bg-[#B4D8E7]' },
    { label: 'Pending Reviews', value: '8', icon: Eye, color: 'bg-[#FDF5A9]' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Header */}
      <header className="bg-[#FDFCF8] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="neo-card p-2 bg-[#A1E3D8]">
                <BookOpen size={32} weight="bold" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter">QuizPortal</h1>
                <p className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/60">Teacher</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                data-testid="profile-button"
                className="neo-button px-4 py-2 bg-white"
              >
                Dr. Sarah Johnson
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-2">Welcome Back, Dr. Johnson! 👩‍🏫</h2>
          <p className="text-base font-medium text-[#0A0A0A]/70">Manage your quizzes and track student performance</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            data-testid="create-quiz-button"
            onClick={() => navigate('quiz-builder')}
            className="neo-button p-6 bg-[#FF9EC6] text-left flex items-center gap-4"
          >
            <Plus size={32} weight="bold" />
            <div>
              <p className="font-black text-lg">Create New Quiz</p>
              <p className="text-xs font-medium opacity-70">Build from scratch</p>
            </div>
          </button>
          <button
            data-testid="view-all-results-button"
            onClick={() => navigate('quiz-results')}
            className="neo-button p-6 bg-[#A1E3D8] text-left flex items-center gap-4"
          >
            <ChartLine size={32} weight="bold" />
            <div>
              <p className="font-black text-lg">View Results</p>
              <p className="text-xs font-medium opacity-70">Analyze performance</p>
            </div>
          </button>
          <button
            data-testid="manage-students-button"
            className="neo-button p-6 bg-[#B4D8E7] text-left flex items-center gap-4"
          >
            <Users size={32} weight="bold" />
            <div>
              <p className="font-black text-lg">Students</p>
              <p className="text-xs font-medium opacity-70">Manage enrollment</p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Quizzes */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold tracking-tight">My Quizzes</h3>
              <button
                data-testid="view-all-quizzes-button"
                className="text-sm font-bold text-[#B4D8E7] hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {myQuizzes.map((quiz) => {
                const statusColors = {
                  Active: 'bg-[#A1E3D8]',
                  Ended: 'bg-[#F0EFEB]',
                  Scheduled: 'bg-[#FDF5A9]'
                };
                return (
                  <div key={quiz.id} className="neo-card-hover p-6 transition-all" data-testid={`quiz-card-${quiz.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">{quiz.title}</h4>
                        <div className="flex items-center gap-2 text-sm font-medium text-[#0A0A0A]/60">
                          <Calendar size={16} weight="bold" />
                          <span>{quiz.date}</span>
                        </div>
                      </div>
                      <span className={`neo-badge ${statusColors[quiz.status]}`}>{quiz.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60 mb-1">Students</p>
                        <p className="text-xl font-black">{quiz.students}</p>
                      </div>
                      <div>
                        <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60 mb-1">Completed</p>
                        <p className="text-xl font-black">{quiz.completed}</p>
                      </div>
                      <div>
                        <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60 mb-1">Avg Score</p>
                        <p className="text-xl font-black">{quiz.avgScore > 0 ? `${quiz.avgScore}%` : '-'}</p>
                      </div>
                    </div>
                    {quiz.status === 'Active' && (
                      <div className="h-2 bg-[#F0EFEB] border-2 border-[#0A0A0A] mb-4">
                        <div 
                          className="h-full bg-[#A1E3D8] border-r-2 border-[#0A0A0A]"
                          style={{ width: `${(quiz.completed / quiz.students) * 100}%` }}
                        ></div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {quiz.status === 'Active' && (
                        <button
                          data-testid={`live-monitor-${quiz.id}`}
                          onClick={() => navigate('live-monitor', quiz)}
                          className="neo-button px-4 py-2 bg-[#FF9EC6] flex-1"
                        >
                          Live Monitor
                        </button>
                      )}
                      {quiz.status === 'Ended' && (
                        <button
                          data-testid={`view-results-${quiz.id}`}
                          onClick={() => navigate('quiz-results')}
                          className="neo-button px-4 py-2 bg-white flex-1"
                        >
                          View Results
                        </button>
                      )}
                      {quiz.status === 'Scheduled' && (
                        <button
                          data-testid={`edit-quiz-${quiz.id}`}
                          onClick={() => navigate('quiz-builder')}
                          className="neo-button px-4 py-2 bg-white flex-1"
                        >
                          Edit Quiz
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-2xl font-bold tracking-tight mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => {
                const isViolation = activity.type === 'violation';
                return (
                  <div key={index} className="neo-card p-4" data-testid={`activity-${index}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 border-2 border-[#0A0A0A] ${
                        isViolation ? 'bg-[#FF6B6B]' : 'bg-[#A1E3D8]'
                      }`}>
                        {isViolation ? (
                          <Eye size={16} weight="bold" className="text-white" />
                        ) : (
                          <Clipboard size={16} weight="bold" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{activity.student}</p>
                        <p className="text-xs font-medium text-[#0A0A0A]/60 mb-1">
                          {isViolation ? 'Violation detected' : 'Submitted'} - {activity.quiz}
                        </p>
                        <p className="text-xs font-medium text-[#0A0A0A]/60">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Stats Card */}
            <div className="mt-6 neo-card-hover p-6 bg-gradient-to-br from-[#FF9EC6] to-[#FDF5A9] transition-all">
              <h4 className="font-black text-xl mb-3">This Week</h4>
              <div className="space-y-2 text-sm font-medium">
                <p>• 3 quizzes conducted</p>
                <p>• 142 submissions reviewed</p>
                <p>• Class average: 82%</p>
                <p>• 6 students need attention</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;