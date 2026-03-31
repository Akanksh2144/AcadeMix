import React, { useState, useEffect } from 'react';
import { BookOpen, Users, ChartBar, GraduationCap, SignOut, Database } from '@phosphor-icons/react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { StudentResultsSearch } from '../components/StudentResultsSearch';
import { analyticsAPI } from '../services/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl p-3 shadow-lg border border-slate-100">
        <p className="font-bold text-sm text-slate-800">{label}</p>
        {payload.map((p, i) => (<p key={i} className="text-sm font-medium" style={{ color: p.color }}>{p.name}: {p.value}</p>))}
      </div>
    );
  }
  return null;
};

const AdminDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await analyticsAPI.adminDashboard();
        setDashboardData(data);
      } catch (err) { console.error('Failed to load admin dashboard:', err); }
    };
    fetchDashboard();
  }, []);

  const totalStudents = dashboardData?.total_students || 0;
  const totalTeachers = (dashboardData?.total_teachers || 0) + (dashboardData?.total_hods || 0);
  const activeQuizzes = dashboardData?.active_quizzes || 0;
  const deptCount = dashboardData?.departments?.length || 0;

  const stats = [
    { label: 'Total Students', value: totalStudents.toLocaleString(), icon: Users, color: 'bg-indigo-50 text-indigo-500' },
    { label: 'Total Teachers', value: totalTeachers.toLocaleString(), icon: GraduationCap, color: 'bg-emerald-50 text-emerald-500' },
    { label: 'Active Quizzes', value: activeQuizzes.toLocaleString(), icon: ChartBar, color: 'bg-amber-50 text-amber-500' },
    { label: 'Departments', value: deptCount.toLocaleString(), icon: Database, color: 'bg-sky-50 text-sky-500' },
  ];
  const departmentPerformance = (dashboardData?.departments || []).map(d => ({
    dept: d.name, avgScore: 75 + Math.floor(d.count * 2)
  }));
  const enrollmentTrend = [
    { month: 'Aug', students: Math.max(totalStudents - 5, 0) }, { month: 'Sep', students: Math.max(totalStudents - 4, 0) },
    { month: 'Oct', students: Math.max(totalStudents - 3, 0) }, { month: 'Nov', students: Math.max(totalStudents - 2, 0) },
    { month: 'Dec', students: Math.max(totalStudents - 1, 0) }, { month: 'Jan', students: totalStudents },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center"><BookOpen size={22} weight="duotone" className="text-white" /></div>
              <div><h1 className="text-xl font-extrabold tracking-tight text-slate-900">QuizPortal</h1><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Admin</p></div>
            </div>
            <div className="flex items-center gap-3">
              <button data-testid="profile-button" className="btn-ghost !px-4 !py-2 text-sm">{user?.name || 'Admin Panel'}</button>
              <button data-testid="logout-button" onClick={onLogout} className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"><SignOut size={20} weight="duotone" /></button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-2">College Overview</h2>
          <p className="text-base font-medium text-slate-500">Manage your institution's academic platform</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5 w-fit mb-8 overflow-x-auto" data-testid="admin-tabs">
          {[
            { id: 'overview', label: 'Overview' }, 
            { id: 'college-metrics', label: 'College Metrics' },
            { id: 'department-metrics', label: 'Department Metrics' },
            { id: 'section-metrics', label: 'Section Metrics' },
            { id: 'student-profiles', label: 'Student Profiles' },
            { id: 'results', label: 'Student Results' }
          ].map(tab => (
            <button key={tab.id} data-testid={`tab-${tab.id}`} onClick={() => setActiveTab(tab.id)}
              className={`pill-tab ${activeTab === tab.id ? 'pill-tab-active' : 'pill-tab-inactive'} whitespace-nowrap`}>{tab.label}</button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div data-testid="overview-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="soft-card-hover p-6" data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
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
              <button data-testid="user-management-button" onClick={() => navigate('user-management')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors"><Users size={24} weight="duotone" className="text-indigo-500" /></div>
                <div><p className="font-extrabold text-slate-900">User Management</p><p className="text-sm font-medium text-slate-400">Add/edit users</p></div>
              </button>
              <button data-testid="view-all-results-button" onClick={() => navigate('quiz-results')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors"><ChartBar size={24} weight="duotone" className="text-emerald-500" /></div>
                <div><p className="font-extrabold text-slate-900">Quiz Results</p><p className="text-sm font-medium text-slate-400">College-wide data</p></div>
              </button>
              <button data-testid="student-results-button" onClick={() => setActiveTab('results')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
                <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center group-hover:bg-violet-100 transition-colors"><GraduationCap size={24} weight="duotone" className="text-violet-500" /></div>
                <div><p className="font-extrabold text-slate-900">Student Results</p><p className="text-sm font-medium text-slate-400">Search & view profiles</p></div>
              </button>
              <button data-testid="analytics-button" onClick={() => navigate('analytics')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors"><Database size={24} weight="duotone" className="text-amber-500" /></div>
                <div><p className="font-extrabold text-slate-900">Analytics</p><p className="text-sm font-medium text-slate-400">Insights & trends</p></div>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Department Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="dept" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />
                    <Bar dataKey="avgScore" fill="#6366F1" radius={[8, 8, 0, 0]} name="Avg Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Student Enrollment Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={enrollmentTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="students" stroke="#14B8A6" strokeWidth={3} dot={{ fill: '#14B8A6', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {[{ action: 'New quiz created', user: 'Dr. Sarah Johnson', time: '10 mins ago' },
                    { action: '42 students completed quiz', user: 'DBMS - Normalization', time: '25 mins ago' },
                    { action: 'Semester results uploaded', user: 'Admin', time: '1 hour ago' },
                    { action: '8 new students added', user: 'Admin', time: '2 hours ago' }].map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl" data-testid={`activity-${i}`}>
                      <div><p className="font-bold text-sm text-slate-800">{a.action}</p><p className="text-xs font-medium text-slate-400">{a.user}</p></div>
                      <span className="text-xs font-medium text-slate-400">{a.time}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="soft-card p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <h4 className="font-extrabold text-xl mb-3">This Month</h4>
                  <div className="space-y-2 text-sm font-medium text-white/90">
                    <p>125 quizzes conducted</p><p>1,248 active students</p><p>College avg: 82.5%</p><p>8 new faculty joined</p>
                  </div>
                </div>
                <div className="soft-card p-6 bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                  <h4 className="font-extrabold text-xl mb-3">Top Department</h4>
                  <p className="text-3xl font-extrabold mb-2">CSE</p>
                  <p className="text-sm font-medium text-white/90">Average Score: 85%</p>
                  <p className="text-sm font-medium text-white/90">320 Students</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'college-metrics' && (
          <div data-testid="college-metrics-content">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">College-wise Performance Metrics</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {['GNITC', 'GNITR', 'GNITS'].map((college, idx) => (
                <div key={college} className="soft-card p-6">
                  <h4 className="text-xl font-bold text-slate-900 mb-4">{college}</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                      <span className="text-sm font-bold text-slate-600">Total Students</span>
                      <span className="text-2xl font-extrabold text-indigo-600">{idx === 0 ? '420' : idx === 1 ? '385' : '443'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                      <span className="text-sm font-bold text-slate-600">Avg Score</span>
                      <span className="text-2xl font-extrabold text-emerald-600">{idx === 0 ? '82.5' : idx === 1 ? '79.3' : '84.1'}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                      <span className="text-sm font-bold text-slate-600">Pass Rate</span>
                      <span className="text-2xl font-extrabold text-amber-600">{idx === 0 ? '88' : idx === 1 ? '85' : '90'}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                      <span className="text-sm font-bold text-slate-600">Departments</span>
                      <span className="text-2xl font-extrabold text-purple-600">{idx === 0 ? '5' : idx === 1 ? '4' : '6'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="soft-card p-6">
              <h4 className="text-lg font-bold text-slate-900 mb-4">College Comparison</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'GNITC', students: 420, avgScore: 82.5, passRate: 88 },
                  { name: 'GNITR', students: 385, avgScore: 79.3, passRate: 85 },
                  { name: 'GNITS', students: 443, avgScore: 84.1, passRate: 90 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '14px', fontWeight: '600' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px', fontWeight: '600' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '14px', fontWeight: '600' }} />
                  <Bar dataKey="avgScore" fill="#6366f1" name="Avg Score (%)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="passRate" fill="#10b981" name="Pass Rate (%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'department-metrics' && (
          <div data-testid="department-metrics-content">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Department-wise Performance Metrics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { name: 'DS', students: 180, avg: 85.2, pass: 92, color: 'indigo' },
                { name: 'CS', students: 165, avg: 83.7, pass: 89, color: 'emerald' },
                { name: 'ET', students: 145, avg: 81.5, pass: 87, color: 'amber' },
                { name: 'AIML', students: 125, avg: 86.1, pass: 93, color: 'purple' }
              ].map((dept) => (
                <div key={dept.name} className="soft-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-slate-900">{dept.name}</h4>
                    <div className={`w-10 h-10 bg-${dept.color}-100 rounded-xl flex items-center justify-center`}>
                      <span className={`text-${dept.color}-600 font-bold`}>{dept.students}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Avg Score</span>
                      <span className="text-lg font-bold text-slate-900">{dept.avg}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Pass Rate</span>
                      <span className="text-lg font-bold text-slate-900">{dept.pass}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
                      <div className={`bg-${dept.color}-500 h-2 rounded-full`} style={{ width: `${dept.pass}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="soft-card p-6">
              <h4 className="text-lg font-bold text-slate-900 mb-4">Department Performance Trend</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { month: 'Aug', DS: 82, CS: 80, ET: 78, AIML: 83 },
                  { month: 'Sep', DS: 83, CS: 81, ET: 79, AIML: 84 },
                  { month: 'Oct', DS: 84, CS: 82, ET: 80, AIML: 85 },
                  { month: 'Nov', DS: 85, CS: 83, ET: 81, AIML: 86 },
                  { month: 'Dec', DS: 85.2, CS: 83.7, ET: 81.5, AIML: 86.1 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '14px', fontWeight: '600' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px', fontWeight: '600' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '14px', fontWeight: '600' }} />
                  <Line type="monotone" dataKey="DS" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="CS" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="ET" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="AIML" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'section-metrics' && (
          <div data-testid="section-metrics-content">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Section-wise Performance Metrics</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {['DS-1', 'DS-2', 'CS-1', 'CS-2', 'AIML-1', 'AIML-2'].map((section, idx) => (
                <div key={section} className="soft-card p-6">
                  <h4 className="text-xl font-bold text-slate-900 mb-4">{section}</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-indigo-50 rounded-xl text-center">
                      <p className="text-xs font-bold text-slate-500 mb-1">Students</p>
                      <p className="text-2xl font-extrabold text-indigo-600">{45 - idx * 2}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl text-center">
                      <p className="text-xs font-bold text-slate-500 mb-1">Avg Score</p>
                      <p className="text-2xl font-extrabold text-emerald-600">{85 - idx}%</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl text-center">
                      <p className="text-xs font-bold text-slate-500 mb-1">Pass Rate</p>
                      <p className="text-2xl font-extrabold text-amber-600">{90 - idx}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Quizzes Conducted</span>
                      <span className="font-bold text-slate-900">{12 + idx}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Mid-term Avg</span>
                      <span className="font-bold text-slate-900">{24 + idx}/30</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Attendance</span>
                      <span className="font-bold text-slate-900">{92 - idx}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'student-profiles' && (
          <div data-testid="student-profiles-content">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Student Profiles Management</h3>
            
            <div className="soft-card p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <input 
                  type="text" 
                  placeholder="Search by name, ID, or department..." 
                  className="soft-input flex-1"
                />
                <select className="soft-input w-48">
                  <option>All Departments</option>
                  <option>DS</option>
                  <option>CS</option>
                  <option>ET</option>
                  <option>AIML</option>
                </select>
                <select className="soft-input w-32">
                  <option>All Batches</option>
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                  <option>2021</option>
                </select>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">College ID</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Name</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Department</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Section</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Batch</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Avg Score</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: '22WJ8A6745', name: 'Rajesh Kumar', dept: 'DS', section: 'DS-1', batch: '2024', avg: 85.5, status: 'Active' },
                      { id: '22WJ8A6746', name: 'Priya Sharma', dept: 'DS', section: 'DS-1', batch: '2024', avg: 88.2, status: 'Active' },
                      { id: '22WJ8A6747', name: 'Amit Patel', dept: 'CS', section: 'CS-1', batch: '2024', avg: 82.7, status: 'Active' },
                      { id: '22WJ8A6748', name: 'Sneha Singh', dept: 'ET', section: 'A', batch: '2024', avg: 79.3, status: 'Active' },
                      { id: '22WJ8A6749', name: 'Rahul Verma', dept: 'AIML', section: 'AIML-1', batch: '2024', avg: 91.0, status: 'Active' }
                    ].map((student) => (
                      <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-indigo-600">{student.id}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{student.name}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700">{student.dept}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700">{student.section}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700">{student.batch}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`soft-badge ${
                            student.avg >= 85 ? 'bg-emerald-50 text-emerald-600' :
                            student.avg >= 70 ? 'bg-amber-50 text-amber-600' :
                            'bg-red-50 text-red-600'
                          }`}>
                            {student.avg}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="soft-badge bg-emerald-50 text-emerald-600">{student.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div data-testid="results-content">
            <StudentResultsSearch user={user} departmentLocked={false} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
