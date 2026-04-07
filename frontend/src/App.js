import React, { useState, useEffect, useCallback } from 'react';
import AlertModal from './components/AlertModal';
import PageTransition from './components/PageTransition';
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
import AvailableQuizzes from './pages/AvailableQuizzes';
import Placements from './pages/Placements';
import TeacherQuizzes from './pages/TeacherQuizzes';
import QuizCalendar from './pages/QuizCalendar';
import QuizSummary from './pages/QuizSummary';
import AttendanceMarker from './components/faculty/AttendanceMarker';
import TPODashboard from './pages/TPODashboard';

const ROLE_DASHBOARD = {
  student: 'student-dashboard',
  teacher: 'teacher-dashboard',
  admin: 'admin-dashboard',
  hod: 'hod-dashboard',
  exam_cell: 'examcell-dashboard',
  nodal_officer: 'admin-dashboard',
  tp_officer: 'tpo-dashboard',
};

function App() {
  const [currentPage, setCurrentPage] = useState(() => sessionStorage.getItem('acadmix_page') || 'login');

  useEffect(() => {
    sessionStorage.setItem('acadmix_page', currentPage);
  }, [currentPage]);
  const [user, setUser] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const checkAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }
    setAuthToken(savedToken);
    try {
      const { data } = await authAPI.me();
      setUser(data);
      setCurrentPage((prev) => prev === 'login' ? (ROLE_DASHBOARD[data.role] || 'login') : prev);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        // Token is genuinely invalid — clear auth
        clearAuthToken();
        localStorage.removeItem('auth_token');
        setUser(null);
        setCurrentPage('login');
      }
      // For network errors / 500s, keep user on current page (session might still be valid)
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

  const handleLogout = () => setShowLogoutModal(true);

  const confirmLogout = async () => {
    setShowLogoutModal(false);
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
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading...</p>
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
      case 'available-quizzes': return <AvailableQuizzes navigate={navigate} user={user} />;
      case 'placements': return <Placements navigate={navigate} user={user} />;
      case 'teacher-quizzes': return <TeacherQuizzes navigate={navigate} user={user} />;
      case 'quiz-calendar': return <QuizCalendar navigate={navigate} user={user} />;
      case 'quiz-summary': return <QuizSummary navigate={navigate} user={user} attemptData={selectedData} />;
      case 'attendance-marker': return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] py-8">
          <div className="max-w-7xl mx-auto px-4">
            <button onClick={() => navigate('teacher-dashboard')} className="mb-4 text-indigo-500 font-bold hover:underline">← Back to Dashboard</button>
            <AttendanceMarker user={user} />
          </div>
        </div>
      );
      case 'tpo-dashboard': return <TPODashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      default: return <LoginPage onLogin={handleLogin} />;
    }
  };

  return (
    <div className="App">
      <PageTransition pageKey={currentPage}>
        {renderPage()}
      </PageTransition>
      <AlertModal
        open={showLogoutModal}
        type="logout"
        title="Sign Out"
        message="Are you sure you want to sign out? You will need to log in again to access your dashboard."
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}

export default App;
