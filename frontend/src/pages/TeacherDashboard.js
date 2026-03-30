import React from 'react';
import { BookOpen, Plus, ChartLine, Users, Eye, SignOut, Clipboard, Calendar, PencilLine } from '@phosphor-icons/react';

const TeacherDashboard = ({ navigate, user, onLogout }) => {
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
    { label: 'Total Quizzes', value: '12', icon: Clipboard, color: 'bg-indigo-50 text-indigo-500' },
    { label: 'Active Students', value: '156', icon: Users, color: 'bg-emerald-50 text-emerald-500' },
    { label: 'Avg Class Score', value: '82%', icon: ChartLine, color: 'bg-amber-50 text-amber-500' },
    { label: 'Pending Reviews', value: '8', icon: Eye, color: 'bg-rose-50 text-rose-500' },
  ];

  const statusStyle = { Active: 'bg-emerald-50 text-emerald-600', Ended: 'bg-slate-100 text-slate-500', Scheduled: 'bg-amber-50 text-amber-600' };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <BookOpen size={22} weight="duotone" className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">QuizPortal</h1>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Teacher</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button data-testid="profile-button" className="btn-ghost !px-4 !py-2 text-sm">{user?.name || 'Teacher'}</button>
              <button data-testid="logout-button" onClick={onLogout} className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors">
                <SignOut size={20} weight="duotone" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-2">Welcome Back, {user?.name?.split(' ').pop() || 'Teacher'}!</h2>
          <p className="text-base font-medium text-slate-500">Manage your quizzes and track student performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="soft-card-hover p-6" data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
                  <div className={`${stat.color} p-2.5 rounded-xl`}><Icon size={20} weight="duotone" /></div>
                </div>
                <p className="text-3xl font-extrabold tracking-tight text-slate-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <button data-testid="create-quiz-button" onClick={() => navigate('quiz-builder')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors"><Plus size={24} weight="duotone" className="text-indigo-500" /></div>
            <div><p className="font-extrabold text-slate-900">Create New Quiz</p><p className="text-sm font-medium text-slate-400">Build from scratch</p></div>
          </button>
          <button data-testid="marks-entry-button" onClick={() => navigate('marks-entry')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center group-hover:bg-violet-100 transition-colors"><PencilLine size={24} weight="duotone" className="text-violet-500" /></div>
            <div><p className="font-extrabold text-slate-900">Marks Entry</p><p className="text-sm font-medium text-slate-400">Mid-term marks</p></div>
          </button>
          <button data-testid="view-all-results-button" onClick={() => navigate('quiz-results')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors"><ChartLine size={24} weight="duotone" className="text-emerald-500" /></div>
            <div><p className="font-extrabold text-slate-900">View Results</p><p className="text-sm font-medium text-slate-400">Analyze performance</p></div>
          </button>
          <button data-testid="manage-students-button" onClick={() => navigate('student-management')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors"><Users size={24} weight="duotone" className="text-amber-500" /></div>
            <div><p className="font-extrabold text-slate-900">Students</p><p className="text-sm font-medium text-slate-400">Manage enrollment</p></div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold tracking-tight text-slate-800">My Quizzes</h3>
              <button data-testid="view-all-quizzes-button" className="text-sm font-bold text-indigo-500 hover:text-indigo-600">View All</button>
            </div>
            <div className="space-y-4">
              {myQuizzes.map((quiz) => (
                <div key={quiz.id} className="soft-card-hover p-6" data-testid={`quiz-card-${quiz.id}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 mb-1">{quiz.title}</h4>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-400"><Calendar size={15} weight="duotone" /><span>{quiz.date}</span></div>
                    </div>
                    <span className={`soft-badge ${statusStyle[quiz.status]}`}>{quiz.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div><p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Students</p><p className="text-xl font-extrabold text-slate-900">{quiz.students}</p></div>
                    <div><p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Completed</p><p className="text-xl font-extrabold text-slate-900">{quiz.completed}</p></div>
                    <div><p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Avg Score</p><p className="text-xl font-extrabold text-slate-900">{quiz.avgScore > 0 ? `${quiz.avgScore}%` : '-'}</p></div>
                  </div>
                  {quiz.status === 'Active' && (
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full" style={{ width: `${(quiz.completed / quiz.students) * 100}%` }}></div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {quiz.status === 'Active' && <button data-testid={`live-monitor-${quiz.id}`} onClick={() => navigate('live-monitor', quiz)} className="btn-primary flex-1 text-sm">Live Monitor</button>}
                    {quiz.status === 'Ended' && <button data-testid={`view-results-${quiz.id}`} onClick={() => navigate('quiz-results')} className="btn-secondary flex-1 text-sm">View Results</button>}
                    {quiz.status === 'Scheduled' && <button data-testid={`edit-quiz-${quiz.id}`} onClick={() => navigate('quiz-builder')} className="btn-ghost flex-1 text-sm">Edit Quiz</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold tracking-tight text-slate-800 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => {
                const isViolation = activity.type === 'violation';
                return (
                  <div key={index} className="soft-card p-4" data-testid={`activity-${index}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl ${isViolation ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {isViolation ? <Eye size={16} weight="duotone" /> : <Clipboard size={16} weight="duotone" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{activity.student}</p>
                        <p className="text-xs font-medium text-slate-400 mb-0.5">{isViolation ? 'Violation detected' : 'Submitted'} - {activity.quiz}</p>
                        <p className="text-xs font-medium text-slate-400">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 soft-card p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <h4 className="font-extrabold text-xl mb-3">This Week</h4>
              <div className="space-y-2 text-sm font-medium text-white/90">
                <p>3 quizzes conducted</p><p>142 submissions reviewed</p><p>Class average: 82%</p><p>6 students need attention</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
