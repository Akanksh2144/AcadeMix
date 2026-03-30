import React, { useState } from 'react';
import './App.css';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import QuizAttempt from './pages/QuizAttempt';
import QuizResults from './pages/QuizResults';
import SemesterResults from './pages/SemesterResults';
import Analytics from './pages/Analytics';
import Leaderboard from './pages/Leaderboard';
import QuizBuilder from './pages/QuizBuilder';
import LiveMonitor from './pages/LiveMonitor';
import UserManagement from './pages/UserManagement';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [userRole, setUserRole] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const handleLogin = (role) => {
    setUserRole(role);
    if (role === 'student') setCurrentPage('student-dashboard');
    if (role === 'teacher') setCurrentPage('teacher-dashboard');
    if (role === 'admin') setCurrentPage('admin-dashboard');
  };

  const navigate = (page, data = null) => {
    setCurrentPage(page);
    if (data) setSelectedQuiz(data);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onLogin={handleLogin} />;
      case 'student-dashboard':
        return <StudentDashboard navigate={navigate} />;
      case 'teacher-dashboard':
        return <TeacherDashboard navigate={navigate} />;
      case 'admin-dashboard':
        return <AdminDashboard navigate={navigate} />;
      case 'quiz-attempt':
        return <QuizAttempt quiz={selectedQuiz} navigate={navigate} />;
      case 'quiz-results':
        return <QuizResults navigate={navigate} userRole={userRole} />;
      case 'semester-results':
        return <SemesterResults navigate={navigate} userRole={userRole} />;
      case 'analytics':
        return <Analytics navigate={navigate} userRole={userRole} />;
      case 'leaderboard':
        return <Leaderboard navigate={navigate} userRole={userRole} />;
      case 'quiz-builder':
        return <QuizBuilder navigate={navigate} />;
      case 'live-monitor':
        return <LiveMonitor quiz={selectedQuiz} navigate={navigate} />;
      case 'user-management':
        return <UserManagement navigate={navigate} />;
      default:
        return <LoginPage onLogin={handleLogin} />;
    }
  };

  return (
    <div className="App">
      {renderPage()}
    </div>
  );
}

export default App;