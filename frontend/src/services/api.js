import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: { 
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420'
  },
});

// Store token for non-cookie auth
let authToken = null;

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export const setAuthToken = (token) => {
  authToken = token;
};

export const clearAuthToken = () => {
  authToken = null;
};

export function formatApiError(detail) {
  if (detail == null) return 'Something went wrong.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e?.msg || JSON.stringify(e))).join(' ');
  if (detail?.msg) return detail.msg;
  return String(detail);
}

// Auth
export const authAPI = {
  login: (college_id, password) => api.post('/api/auth/login', { college_id, password }),
  register: (data) => api.post('/api/auth/register', data),
  me: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
};

export const usersAPI = {
  list: (role) => api.get('/api/users', { params: role ? { role } : {} }),
  get: (id) => api.get(`/api/users/${id}`),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.put(`/api/users/${id}`, data),
  delete: (id) => api.delete(`/api/users/${id}`),
};

// Departments
export const departmentsAPI = {
  list: () => api.get('/api/departments'),
  create: (data) => api.post('/api/departments', data),
  update: (id, data) => api.put(`/api/departments/${id}`, data),
  delete: (id) => api.delete(`/api/departments/${id}`),
};

// Sections
export const sectionsAPI = {
  list: () => api.get('/api/sections'),
  create: (data) => api.post('/api/sections', data),
  update: (id, data) => api.put(`/api/sections/${id}`, data),
  delete: (id) => api.delete(`/api/sections/${id}`),
};

// Roles
export const rolesAPI = {
  list: () => api.get('/api/roles'),
  create: (data) => api.post('/api/roles', data),
  update: (id, data) => api.put(`/api/roles/${id}`, data),
  delete: (id) => api.delete(`/api/roles/${id}`),
};

// Quizzes
export const quizzesAPI = {
  list: (status) => api.get('/api/quizzes', { params: status ? { status } : {} }),
  myQuizzes: () => api.get('/api/quizzes/user'),
  liveMonitor: (quizId) => api.get(`/api/quizzes/live/${quizId}`),
  extendTime: (quizId, mins = 10) => api.post(`/api/quizzes/${quizId}/extend-time`, { mins }),
  endQuiz: (quizId) => api.post(`/api/quizzes/${quizId}/end`),
  get: (id) => api.get(`/api/quizzes/${id}`),
  create: (data) => api.post('/api/quizzes', data),
  update: (id, data) => api.patch(`/api/quizzes/${id}`, data),
  delete: (id) => api.delete(`/api/quizzes/${id}`),
  publish: (id) => api.post(`/api/quizzes/${id}/publish`),
};

// Attempts
export const attemptsAPI = {
  start: (quizId) => api.post(`/api/quizzes/${quizId}/start`),
  answer: (attemptId, data) => api.post(`/api/attempts/${attemptId}/answer`, data),
  submit: (attemptId) => api.post(`/api/attempts/${attemptId}/submit`),
  result: (attemptId) => api.get(`/api/attempts/${attemptId}/result`),
  list: (quizId) => api.get('/api/attempts', { params: quizId ? { quiz_id: quizId } : {} }),
  violation: (attemptId) => api.post(`/api/attempts/${attemptId}/violation`),
};

// Code Execution
export const codeAPI = {
  execute: (code, language, test_input) => api.post('/api/code/execute', { code, language, test_input }),
};

// Faculty Management (HOD)
export const facultyAPI = {
  teachers: () => api.get('/api/faculty/teachers'),
  assignments: () => api.get('/api/faculty/assignments'),
  createAssignment: (data) => api.post('/api/faculty/assignments', data),
  deleteAssignment: (id) => api.delete(`/api/faculty/assignments/${id}`),
};

// Marks Entry (Teacher)
export const marksAPI = {
  myAssignments: () => api.get('/api/marks/my-assignments'),
  students: (department, batch, section) => api.get('/api/marks/students', { params: { department, batch, section } }),
  getEntry: (assignmentId, examType) => api.get(`/api/marks/entry/${assignmentId}/${examType}`),
  saveEntry: (data) => api.post('/api/marks/entry', data),
  submit: (entryId) => api.post(`/api/marks/submit/${entryId}`),
  submissions: (status) => api.get('/api/marks/submissions', { params: status ? { status } : {} }),
  review: (entryId, data) => api.post(`/api/marks/review/${entryId}`, data),
};

// Exam Cell
export const examCellAPI = {
  approvedMarks: () => api.get('/api/examcell/approved-marks'),
  endtermList: () => api.get('/api/examcell/endterm'),
  saveEndterm: (data) => api.post('/api/examcell/endterm', data),
  uploadFile: (formData) => api.post('/api/examcell/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  publish: (entryId) => api.post(`/api/examcell/publish/${entryId}`),
  hodDashboard: () => api.get('/api/dashboard/hod'),
  examCellDashboard: () => api.get('/api/dashboard/exam_cell'),
};

// Students Search & Profile
export const studentsAPI = {
  search: (q, department) => api.get('/api/students/search', { params: { q, ...(department ? { department } : {}) } }),
  profile: (studentId) => api.get(`/api/students/${studentId}/profile`),
};

// Results
export const resultsAPI = {
  semester: (studentId) => api.get(`/api/results/semester/${studentId}`),
  createSemester: (data) => api.post('/api/results/semester', data),
};

// Analytics & Dashboard
export const analyticsAPI = {
  student: (studentId) => api.get(`/api/analytics/student/${studentId}`),
  classResults: () => api.get('/api/analytics/teacher/class-results'),
  quizDetails: (quizId, department, batch, section) => api.get(`/api/analytics/teacher/quiz-results/${quizId}`, { params: { department, batch, section } }),
  leaderboard: () => api.get('/api/leaderboard'),
  studentDashboard: () => api.get('/api/dashboard/student'),
  teacherDashboard: () => api.get('/api/dashboard/teacher'),
  adminDashboard: () => api.get('/api/dashboard/admin'),
};

// Placements
export const placementsAPI = {
  studentPlacements: () => api.get('/api/placements/student'),
};

// Timetable (HOD)
export const timetableAPI = {
  get: (section, semester = 3) => api.get('/api/timetable', { params: { section, semester } }),
  save: (data) => api.post('/api/timetable', data),
  delete: (slotId) => api.delete(`/api/timetable/${slotId}`),
};

// Announcements (HOD)
export const announcementsAPI = {
  list: () => api.get('/api/announcements'),
  create: (data) => api.post('/api/announcements', data),
  delete: (id) => api.delete(`/api/announcements/${id}`),
};

// HOD Tools
export const hodToolsAPI = {
  atRiskStudents: (threshold = 5.0) => api.get('/api/hod/at-risk-students', { params: { threshold } }),
};

// Phase 1: Permissions & CIA
export const adminPhase1API = {
  getPermissionsSummary: () => api.get('/api/admin/permissions/summary'),
  updateUserPermissions: (userId, flags) => api.put(`/api/admin/users/${userId}/permissions`, { flags }),
  
  getCiaTemplates: () => api.get('/api/admin/cia-templates'),
  createCiaTemplate: (data) => api.post('/api/admin/cia-templates', data),
  updateCiaTemplate: (id, data) => api.put(`/api/admin/cia-templates/${id}`, data),
  deleteCiaTemplate: (id) => api.delete(`/api/admin/cia-templates/${id}`),
  
  getCiaConfigs: () => api.get('/api/admin/cia-config'),
  createCiaConfig: (data) => api.post('/api/admin/cia-config', data),
  toggleConsolidation: (id) => api.put(`/api/admin/cia-config/${id}/enable-consolidation`),
};

export default api;
