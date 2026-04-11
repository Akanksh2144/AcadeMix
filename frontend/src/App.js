import React, { useState, useEffect, useCallback, Suspense } from 'react';
import AlertModal from './components/AlertModal';
import PageTransition from './components/PageTransition';
import './App.css';
import { authAPI, setAuthToken, clearAuthToken } from './services/api';
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const StudentDashboard = React.lazy(() => import('./pages/StudentDashboard'));
const TeacherDashboard = React.lazy(() => import('./pages/TeacherDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const HodDashboard = React.lazy(() => import('./pages/HodDashboard'));
const ExamCellDashboard = React.lazy(() => import('./pages/ExamCellDashboard'));
const QuizAttempt = React.lazy(() => import('./pages/QuizAttempt'));
const QuizResults = React.lazy(() => import('./pages/QuizResults'));
const SemesterResults = React.lazy(() => import('./pages/SemesterResults'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const QuizBuilder = React.lazy(() => import('./pages/QuizBuilder'));
const LiveMonitor = React.lazy(() => import('./pages/LiveMonitor'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const CodePlayground = React.lazy(() => import('./pages/CodePlayground'));
const MarksEntry = React.lazy(() => import('./pages/MarksEntry'));
const StudentManagement = React.lazy(() => import('./pages/StudentManagement'));
const ClassResults = React.lazy(() => import('./pages/ClassResults'));
const AvailableQuizzes = React.lazy(() => import('./pages/AvailableQuizzes'));
const Placements = React.lazy(() => import('./pages/Placements'));
const TeacherQuizzes = React.lazy(() => import('./pages/TeacherQuizzes'));
const QuizCalendar = React.lazy(() => import('./pages/QuizCalendar'));
const QuizSummary = React.lazy(() => import('./pages/QuizSummary'));
const AttendanceMarker = React.lazy(() => import('./components/faculty/AttendanceMarker'));
const TPODashboard = React.lazy(() => import('./pages/TPODashboard'));
const AlumniDashboard = React.lazy(() => import('./pages/AlumniDashboard'));
const ParentDashboard = React.lazy(() => import('./pages/ParentDashboard'));
const IndustryDashboard = React.lazy(() => import('./pages/IndustryDashboard'));
const PrincipalDashboard = React.lazy(() => import('./pages/PrincipalDashboard'));
const RetiredFacultyDashboard = React.lazy(() => import('./pages/RetiredFacultyDashboard'));
const ExpertDashboard = React.lazy(() => import('./pages/ExpertDashboard'));
const NodalOfficerDashboard = React.lazy(() => import('./pages/NodalOfficerDashboard'));

const ROLE_DASHBOARD = {
  student: 'student-dashboard',
  teacher: 'teacher-dashboard',
  admin: 'admin-dashboard',
  hod: 'hod-dashboard',
  exam_cell: 'examcell-dashboard',
  nodal_officer: 'nodal-officer-dashboard',
  tp_officer: 'tpo-dashboard',
  alumni: 'alumni-dashboard',
  parent: 'parent-dashboard',
  industry: 'industry-dashboard',
  principal: 'principal-dashboard',
  retired_faculty: 'retired-faculty-dashboard',
  expert: 'expert-dashboard',
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
      case 'quiz-attempt': return <QuizAttempt quizData={selectedData} navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'quiz-results': return <QuizResults navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'semester-results': return <SemesterResults navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'analytics': return <Analytics navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'leaderboard': return <Leaderboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'quiz-builder': return <QuizBuilder navigate={navigate} user={user} editQuiz={selectedData} onLogout={handleLogout} />;
      case 'live-monitor': return <LiveMonitor quiz={selectedData} navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'user-management': return <UserManagement navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'code-playground': return <CodePlayground navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'marks-entry': return <MarksEntry navigate={navigate} user={user} preselectedAssignment={selectedData} onLogout={handleLogout} />;
      case 'student-management': return <StudentManagement navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'class-results': return <ClassResults navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'available-quizzes': return <AvailableQuizzes navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'placements': return <Placements navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'teacher-quizzes': return <TeacherQuizzes navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'quiz-calendar': return <QuizCalendar navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'quiz-summary': return <QuizSummary navigate={navigate} user={user} attemptData={selectedData} onLogout={handleLogout} />;
      case 'attendance-marker': return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] py-8">
          <div className="max-w-7xl mx-auto px-4">
            <button onClick={() => navigate('teacher-dashboard')} className="mb-4 text-indigo-500 font-bold hover:underline">← Back to Dashboard</button>
            <AttendanceMarker user={user} />
          </div>
        </div>
      );
      case 'tpo-dashboard': return <TPODashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'alumni-dashboard': return <AlumniDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'parent-dashboard': return <ParentDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'industry-dashboard': return <IndustryDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'principal-dashboard': return <PrincipalDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'retired-faculty-dashboard': return <RetiredFacultyDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'expert-dashboard': return <ExpertDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'nodal-officer-dashboard': return <NodalOfficerDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      default: return <LoginPage onLogin={handleLogin} />;
    }
  };

  return (
    <div className="App">
      <PageTransition pageKey={currentPage}>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F19]">
             <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          {renderPage()}
        </Suspense>
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
