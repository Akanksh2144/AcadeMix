import React, { useState } from 'react';
import { GraduationCap, UserCircle, Lock, Eye, EyeSlash } from '@phosphor-icons/react';

const LoginPage = ({ onLogin }) => {
  const [loginMethod, setLoginMethod] = useState('password');
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock login - detect role from college ID
    if (collegeId.startsWith('T')) onLogin('teacher');
    else if (collegeId.startsWith('A')) onLogin('admin');
    else onLogin('student');
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1523240795612-9a054b0db644?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwc3R1ZGVudHMlMjBzdHVkeWluZ3xlbnwwfHx8fDE3NzQ4NjYwNTR8MA&ixlib=rb-4.1.0&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
          <div className="absolute inset-0 bg-[#FF9EC6] opacity-30"></div>
        </div>
        <div className="relative z-10 flex flex-col justify-center p-16">
          <div className="neo-card-hover p-8 bg-white">
            <h1 className="text-5xl font-black tracking-tighter mb-4">Welcome to QuizPortal</h1>
            <p className="text-xl font-medium leading-relaxed text-[#0A0A0A]/70">
              Your complete college quiz and results management system
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#A1E3D8] border-2 border-[#0A0A0A]"></div>
                <span className="font-bold">Take Proctored Quizzes</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#B4D8E7] border-2 border-[#0A0A0A]"></div>
                <span className="font-bold">Track Your Performance</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#FDF5A9] border-2 border-[#0A0A0A]"></div>
                <span className="font-bold">View Semester Results</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="neo-card p-4 bg-[#FF9EC6]">
              <GraduationCap size={48} weight="bold" />
            </div>
          </div>

          <div className="neo-card p-8">
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">Sign In</h2>
            <p className="text-sm font-medium text-[#0A0A0A]/60 mb-6">Enter your credentials to continue</p>

            {/* Login Method Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                data-testid="password-login-tab"
                onClick={() => setLoginMethod('password')}
                className={`flex-1 py-2 px-4 font-bold text-sm border-2 border-[#0A0A0A] transition-all ${
                  loginMethod === 'password' 
                    ? 'bg-[#FF9EC6] shadow-[4px_4px_0px_0px_#0A0A0A]' 
                    : 'bg-white hover:bg-[#F0EFEB]'
                }`}
              >
                Password
              </button>
              <button
                data-testid="otp-login-tab"
                onClick={() => setLoginMethod('otp')}
                className={`flex-1 py-2 px-4 font-bold text-sm border-2 border-[#0A0A0A] transition-all ${
                  loginMethod === 'otp' 
                    ? 'bg-[#FF9EC6] shadow-[4px_4px_0px_0px_#0A0A0A]' 
                    : 'bg-white hover:bg-[#F0EFEB]'
                }`}
              >
                OTP
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* College ID */}
              <div>
                <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-2">
                  College ID / Roll Number
                </label>
                <div className="relative">
                  <UserCircle 
                    size={20} 
                    weight="bold" 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A0A0A]/40"
                  />
                  <input
                    data-testid="college-id-input"
                    type="text"
                    value={collegeId}
                    onChange={(e) => setCollegeId(e.target.value)}
                    placeholder="Enter your ID (e.g., S2024001, T001, A001)"
                    className="neo-input w-full pl-10 pr-4 py-3 font-medium"
                  />
                </div>
              </div>

              {loginMethod === 'password' ? (
                <div>
                  <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock 
                      size={20} 
                      weight="bold" 
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A0A0A]/40"
                    />
                    <input
                      data-testid="password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="neo-input w-full pl-10 pr-12 py-3 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      data-testid="toggle-password-visibility"
                    >
                      {showPassword ? (
                        <EyeSlash size={20} weight="bold" />
                      ) : (
                        <Eye size={20} weight="bold" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs tracking-[0.2em] uppercase font-bold">
                      OTP
                    </label>
                    <button 
                      type="button" 
                      className="text-xs font-bold text-[#B4D8E7] hover:underline"
                      data-testid="send-otp-button"
                    >
                      Send OTP
                    </button>
                  </div>
                  <input
                    data-testid="otp-input"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength="6"
                    className="neo-input w-full px-4 py-3 font-medium text-center text-xl tracking-widest"
                  />
                </div>
              )}

              {loginMethod === 'password' && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 font-medium cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 border-2 border-[#0A0A0A]"
                      data-testid="remember-me-checkbox"
                    />
                    Remember me
                  </label>
                  <button 
                    type="button" 
                    className="font-bold text-[#B4D8E7] hover:underline"
                    data-testid="forgot-password-link"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                data-testid="login-submit-button"
                type="submit"
                className="w-full py-3 bg-[#FF9EC6] neo-button text-base"
              >
                Sign In
              </button>
            </form>

            {/* Quick Login Hints */}
            <div className="mt-6 p-4 bg-[#FDF5A9] border-2 border-[#0A0A0A]">
              <p className="text-xs font-bold uppercase tracking-widest mb-2">Demo Logins:</p>
              <p className="text-xs font-medium">Student: S2024001 • Teacher: T001 • Admin: A001</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;