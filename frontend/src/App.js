import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { authAPI, setAuthToken, clearAuthToken } from './services/api';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import HodDashboard from './pages/HodDashboard';
import ExamCellDashboard from './pages/ExamCellDashboard';
import QuizAttempt from './pages/QuizAttempt';
import QuizResults from './pages/QuizResults';
import SemesterResults from './pages/SemesterResults';
import Analytics from './pages/Analytics';
import Leaderboard from './pages/Leaderboard';
import QuizBuilder from './pages/QuizBuilder';
import LiveMonitor from './pages/LiveMonitor';
import UserManagement from './pages/UserManagement';
import CodePlayground from './pages/CodePlayground';
import MarksEntry from './pages/MarksEntry';
import StudentManagement from './pages/StudentManagement';
import ClassResults from './pages/ClassResults';

const ROLE_DASHBOARD = {
  student: 'student-dashboard',
  teacher: 'teacher-dashboard',
  admin: 'admin-dashboard',
  hod: 'hod-dashboard',
  exam_cell: 'examcell-dashboard',
};

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) setAuthToken(savedToken);
    try {
      const { data } = await authAPI.me();
      setUser(data);
      setCurrentPage(ROLE_DASHBOARD[data.role] || 'login');
    } catch {
      clearAuthToken();
      localStorage.removeItem('auth_token');
    }
    setLoading(false);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleLogin = (userData) => {
    setUser(userData);
    if (userData.access_token) {
      setAuthToken(userData.access_token);
      localStorage.setItem('auth_token', userData.access_token);
    }
    setCurrentPage(ROLE_DASHBOARD[userData.role] || 'login');
  };

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    setUser(null);
    clearAuthToken();
    localStorage.removeItem('auth_token');
    setCurrentPage('login');
  };

  const navigate = (page, data = null) => {
    setCurrentPage(page);
    if (data) setSelectedData(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'login': return <LoginPage onLogin={handleLogin} />;
      case 'student-dashboard': return <StudentDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'teacher-dashboard': return <TeacherDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'admin-dashboard': return <AdminDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'hod-dashboard': return <HodDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'examcell-dashboard': return <ExamCellDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'quiz-attempt': return <QuizAttempt quizData={selectedData} navigate={navigate} user={user} />;
      case 'quiz-results': return <QuizResults navigate={navigate} user={user} />;
      case 'semester-results': return <SemesterResults navigate={navigate} user={user} />;
      case 'analytics': return <Analytics navigate={navigate} user={user} />;
      case 'leaderboard': return <Leaderboard navigate={navigate} user={user} />;
      case 'quiz-builder': return <QuizBuilder navigate={navigate} user={user} editQuiz={selectedData} />;
      case 'live-monitor': return <LiveMonitor quiz={selectedData} navigate={navigate} user={user} />;
      case 'user-management': return <UserManagement navigate={navigate} user={user} />;
      case 'code-playground': return <CodePlayground navigate={navigate} user={user} />;
      case 'marks-entry': return <MarksEntry navigate={navigate} user={user} preselectedAssignment={selectedData} />;
      case 'student-management': return <StudentManagement navigate={navigate} user={user} />;
      case 'class-results': return <ClassResults navigate={navigate} user={user} />;
      default: return <LoginPage onLogin={handleLogin} />;
    }
  };

  return <div className="App">{renderPage()}</div>;
}

export default App;
