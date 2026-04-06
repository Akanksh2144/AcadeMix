import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, UserCircle, Lock, Eye, EyeSlash, PaperPlaneTilt, Sun, Moon } from '@phosphor-icons/react';
import { authAPI, formatApiError } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import * as Sentry from '@sentry/react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const LoginPage = ({ onLogin }) => {
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark, toggle: toggleTheme } = useTheme();

  const quickLoginRoles = [
    { role: 'Student', collegeId: '22WJ8A6745', password: '22WJ8A6745', color: 'bg-teal-500 hover:bg-teal-600', icon: '🎓' },
    { role: 'Teacher', collegeId: 'T001', password: 'teacher123', color: 'bg-indigo-500 hover:bg-indigo-600', icon: '👨‍🏫' },
    { role: 'HOD', collegeId: 'HOD001', password: 'hod123', color: 'bg-amber-500 hover:bg-amber-600', icon: '👔' },
    { role: 'Admin', collegeId: 'A001', password: 'admin123', color: 'bg-rose-500 hover:bg-rose-600', icon: '⚙️' },
    { role: 'Nodal Officer', collegeId: 'N001', password: 'nodal123', color: 'bg-emerald-500 hover:bg-emerald-600', icon: '🏛️' },
    { role: 'T&P Officer', collegeId: 'TPO001', password: 'tpo123', color: 'bg-blue-500 hover:bg-blue-600', icon: '💼' },
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex transition-colors duration-300">
      {/* Left panel — Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-300 rounded-full blur-3xl"></div>
        </div>
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
          className="relative z-10 flex flex-col justify-center p-16 text-white"
        >
          <div className="mb-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
              className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6"
            >
              <GraduationCap size={36} weight="duotone" className="text-white" />
            </motion.div>
            <h1 className="text-5xl font-extrabold tracking-tight mb-4">Welcome to<br/>AcadMix</h1>
            <p className="text-lg font-medium leading-relaxed text-white/80">Your complete college quiz and results management system</p>
          </div>
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
            {['Take Proctored Quizzes', 'Track Your Performance', 'View Semester Results'].map((text, i) => (
              <motion.div key={i} variants={itemVariants}
                whileHover={{ x: 8, transition: { type: 'spring', stiffness: 400, damping: 17 } }}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 cursor-default"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${['bg-teal-300', 'bg-amber-300', 'bg-pink-300'][i]}`}></div>
                <span className="font-bold">{text}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-2.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors z-10"
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={isDark ? 'dark' : 'light'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              {isDark ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center"
            >
              <GraduationCap size={36} weight="duotone" className="text-white" />
            </motion.div>
          </div>

          <div className="soft-card p-8 sm:p-10">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">Sign In</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8">Enter your credentials to continue</p>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium"
                  data-testid="login-error"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">College ID / Roll Number</label>
                <div className="relative">
                  <UserCircle size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input data-testid="college-id-input" type="text" value={collegeId} onChange={(e) => setCollegeId(e.target.value.toUpperCase())}
                    placeholder="e.g., 22WJ8A6745, T001, A001" className="soft-input w-full pl-12 pr-4" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Password</label>
                <div className="relative">
                  <Lock size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input data-testid="password-input" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="soft-input w-full pl-12 pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" data-testid="toggle-password-visibility">
                    {showPassword ? <EyeSlash size={20} weight="duotone" /> : <Eye size={20} weight="duotone" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                data-testid="login-submit-button" type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <>Sign In <PaperPlaneTilt size={18} weight="duotone" /></>}
              </motion.button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-[#1A202C] px-3 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Quick Login</span>
                </div>
              </div>

              <motion.div variants={containerVariants} initial="hidden" animate="show" className="mt-5 grid grid-cols-2 gap-3">
                {quickLoginRoles.map((roleData) => (
                  <motion.button
                    key={roleData.role}
                    variants={itemVariants}
                    whileHover={{ scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 17 } }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleQuickLogin(roleData.collegeId, roleData.password)}
                    disabled={loading}
                    className={`${roleData.color} text-white rounded-2xl px-4 py-3 font-bold text-sm transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm`}
                    data-testid={`quick-login-${roleData.role.toLowerCase().replace(' ', '-')}`}
                  >
                    <span className="text-lg">{roleData.icon}</span>
                    <span>{roleData.role}</span>
                  </motion.button>
                ))}
              </motion.div>

              <p className="mt-4 text-xs text-center font-medium text-slate-400 dark:text-slate-500">Click any role to login instantly</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
