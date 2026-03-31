import React, { useState } from 'react';
import { GraduationCap, UserCircle, Lock, Eye, EyeSlash, PaperPlaneTilt } from '@phosphor-icons/react';
import { authAPI, formatApiError } from '../services/api';

const LoginPage = ({ onLogin }) => {
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const quickLoginRoles = [
    { role: 'Admin', collegeId: 'A001', password: 'admin123', color: 'bg-purple-500 hover:bg-purple-600', icon: '👑' },
    { role: 'Teacher', collegeId: 'T001', password: 'teacher123', color: 'bg-indigo-500 hover:bg-indigo-600', icon: '👨‍🏫' },
    { role: 'Student', collegeId: '22WJ8A6745', password: 'student123', color: 'bg-teal-500 hover:bg-teal-600', icon: '🎓' },
    { role: 'HOD', collegeId: 'HOD001', password: 'hod123', color: 'bg-amber-500 hover:bg-amber-600', icon: '👔' },
    { role: 'Exam Cell', collegeId: 'EC001', password: 'exam123', color: 'bg-rose-500 hover:bg-rose-600', icon: '📋' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.login(collegeId, password);
      onLogin(data);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || 'Login failed');
    }
    setLoading(false);
  };

  const handleQuickLogin = async (id, pass) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.login(id, pass);
      onLogin(data);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || 'Quick login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-300 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 flex flex-col justify-center p-16 text-white">
          <div className="mb-8">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
              <GraduationCap size={36} weight="duotone" className="text-white" />
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight mb-4">Welcome to<br/>QuizPortal</h1>
            <p className="text-lg font-medium leading-relaxed text-white/80">Your complete college quiz and results management system</p>
          </div>
          <div className="space-y-4">
            {['Take Proctored Quizzes', 'Track Your Performance', 'View Semester Results'].map((text, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3">
                <div className={`w-2.5 h-2.5 rounded-full ${['bg-teal-300', 'bg-amber-300', 'bg-pink-300'][i]}`}></div>
                <span className="font-bold">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center">
              <GraduationCap size={36} weight="duotone" className="text-white" />
            </div>
          </div>
          <div className="soft-card p-8 sm:p-10">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Sign In</h2>
            <p className="text-sm font-medium text-slate-500 mb-8">Enter your credentials to continue</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 rounded-xl text-red-600 text-sm font-medium" data-testid="login-error">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">College ID / Roll Number</label>
                <div className="relative">
                  <UserCircle size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input data-testid="college-id-input" type="text" value={collegeId} onChange={(e) => setCollegeId(e.target.value.toUpperCase())}
                    placeholder="e.g., 22WJ8A6745, T001, A001" className="soft-input w-full pl-12 pr-4" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Password</label>
                <div className="relative">
                  <Lock size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input data-testid="password-input" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="soft-input w-full pl-12 pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" data-testid="toggle-password-visibility">
                    {showPassword ? <EyeSlash size={20} weight="duotone" /> : <Eye size={20} weight="duotone" />}
                  </button>
                </div>
              </div>

              <button data-testid="login-submit-button" type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <>Sign In <PaperPlaneTilt size={18} weight="duotone" /></>}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400 font-bold uppercase tracking-widest">Quick Login</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {quickLoginRoles.map((roleData) => (
                  <button
                    key={roleData.role}
                    onClick={() => handleQuickLogin(roleData.collegeId, roleData.password)}
                    disabled={loading}
                    className={`${roleData.color} text-white rounded-2xl px-4 py-3 font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm`}
                    data-testid={`quick-login-${roleData.role.toLowerCase().replace(' ', '-')}`}
                  >
                    <span className="text-lg">{roleData.icon}</span>
                    <span>{roleData.role}</span>
                  </button>
                ))}
              </div>

              <p className="mt-4 text-xs text-center font-medium text-slate-400">Click any role to login instantly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
