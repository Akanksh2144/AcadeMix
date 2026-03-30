import React from 'react';
import { BookOpen, Users, ChartBar, GraduationCap, SignOut, Plus, Upload, Database } from '@phosphor-icons/react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AdminDashboard = ({ navigate }) => {
  const stats = [
    { label: 'Total Students', value: '1,248', icon: Users, color: 'bg-[#FF9EC6]' },
    { label: 'Total Teachers', value: '89', icon: GraduationCap, color: 'bg-[#A1E3D8]' },
    { label: 'Active Quizzes', value: '45', icon: ChartBar, color: 'bg-[#B4D8E7]' },
    { label: 'Departments', value: '8', icon: Database, color: 'bg-[#FDF5A9]' },
  ];

  const departmentPerformance = [
    { dept: 'CSE', avgScore: 85, students: 320 },
    { dept: 'ECE', avgScore: 82, students: 280 },
    { dept: 'MECH', avgScore: 78, students: 250 },
    { dept: 'CIVIL', avgScore: 80, students: 220 },
  ];

  const enrollmentTrend = [
    { month: 'Aug', students: 1180 },
    { month: 'Sep', students: 1200 },
    { month: 'Oct', students: 1220 },
    { month: 'Nov', students: 1235 },
    { month: 'Dec', students: 1240 },
    { month: 'Jan', students: 1248 },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Header */}
      <header className="bg-[#FDFCF8] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="neo-card p-2 bg-[#FDF5A9]">
                <BookOpen size={32} weight="bold" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter">QuizPortal</h1>
                <p className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/60">Admin</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                data-testid="profile-button"
                className="neo-button px-4 py-2 bg-white"
              >
                Admin Panel
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
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-2">College Overview 🏛️</h2>
          <p className="text-base font-medium text-[#0A0A0A]/70">Manage your institution's academic platform</p>
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
            data-testid="user-management-button"
            onClick={() => navigate('user-management')}
            className="neo-button p-6 bg-[#FF9EC6] text-left flex items-center gap-4"
          >
            <Users size={32} weight="bold" />
            <div>
              <p className="font-black text-lg">User Management</p>
              <p className="text-xs font-medium opacity-70">Add/edit users</p>
            </div>
          </button>
          <button
            data-testid="view-all-results-button"
            onClick={() => navigate('quiz-results')}
            className="neo-button p-6 bg-[#A1E3D8] text-left flex items-center gap-4"
          >
            <ChartBar size={32} weight="bold" />
            <div>
              <p className="font-black text-lg">View All Results</p>
              <p className="text-xs font-medium opacity-70">College-wide data</p>
            </div>
          </button>
          <button
            data-testid="analytics-button"
            onClick={() => navigate('analytics')}
            className="neo-button p-6 bg-[#B4D8E7] text-left flex items-center gap-4"
          >
            <Database size={32} weight="bold" />
            <div>
              <p className="font-black text-lg">Analytics</p>
              <p className="text-xs font-medium opacity-70">Insights & trends</p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Department Performance */}
          <div className="neo-card p-6">
            <h3 className="text-xl font-bold mb-4">Department Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentPerformance}>
                <CartesianGrid strokeWidth={2} stroke="#0A0A0A" strokeDasharray="0" />
                <XAxis dataKey="dept" stroke="#0A0A0A" style={{ fontWeight: 'bold' }} />
                <YAxis stroke="#0A0A0A" style={{ fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{
                    border: '2px solid #0A0A0A',
                    boxShadow: '4px 4px 0px 0px #0A0A0A',
                    borderRadius: 0,
                    fontWeight: 'bold'
                  }}
                />
                <Legend wrapperStyle={{ fontWeight: 'bold' }} />
                <Bar dataKey="avgScore" fill="#FF9EC6" stroke="#0A0A0A" strokeWidth={2} name="Avg Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Enrollment Trend */}
          <div className="neo-card p-6">
            <h3 className="text-xl font-bold mb-4">Student Enrollment Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={enrollmentTrend}>
                <CartesianGrid strokeWidth={2} stroke="#0A0A0A" strokeDasharray="0" />
                <XAxis dataKey="month" stroke="#0A0A0A" style={{ fontWeight: 'bold' }} />
                <YAxis stroke="#0A0A0A" style={{ fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{
                    border: '2px solid #0A0A0A',
                    boxShadow: '4px 4px 0px 0px #0A0A0A',
                    borderRadius: 0,
                    fontWeight: 'bold'
                  }}
                />
                <Line type="monotone" dataKey="students" stroke="#A1E3D8" strokeWidth={3} dot={{ fill: '#A1E3D8', r: 6, strokeWidth: 2, stroke: '#0A0A0A' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 neo-card p-6">
            <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {[
                { action: 'New quiz created', user: 'Dr. Sarah Johnson', time: '10 mins ago' },
                { action: '42 students completed quiz', user: 'DBMS - Normalization', time: '25 mins ago' },
                { action: 'Semester results uploaded', user: 'Admin', time: '1 hour ago' },
                { action: '8 new students added', user: 'Admin', time: '2 hours ago' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-[#F0EFEB] border-2 border-[#0A0A0A]" data-testid={`activity-${index}`}>
                  <div>
                    <p className="font-bold text-sm">{activity.action}</p>
                    <p className="text-xs font-medium text-[#0A0A0A]/60">{activity.user}</p>
                  </div>
                  <span className="text-xs font-medium text-[#0A0A0A]/60">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="neo-card-hover p-6 bg-gradient-to-br from-[#FF9EC6] to-[#FDF5A9] transition-all">
              <h4 className="font-black text-xl mb-3">This Month</h4>
              <div className="space-y-2 text-sm font-medium">
                <p>• 125 quizzes conducted</p>
                <p>• 1,248 active students</p>
                <p>• College avg: 82.5%</p>
                <p>• 8 new faculty joined</p>
              </div>
            </div>

            <div className="neo-card p-6 bg-gradient-to-br from-[#A1E3D8] to-[#B4D8E7]">
              <h4 className="font-black text-xl mb-3">Top Department</h4>
              <p className="text-3xl font-black mb-2">CSE</p>
              <p className="text-sm font-medium">Average Score: 85%</p>
              <p className="text-sm font-medium">320 Students</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;