import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
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

// Users
export const usersAPI = {
  list: (role) => api.get('/api/users', { params: role ? { role } : {} }),
  get: (id) => api.get(`/api/users/${id}`),
  create: (data) => api.post('/api/users', data),
  delete: (id) => api.delete(`/api/users/${id}`),
};

// Quizzes
export const quizzesAPI = {
  list: (status) => api.get('/api/quizzes', { params: status ? { status } : {} }),
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

// Results
export const resultsAPI = {
  semester: (studentId) => api.get(`/api/results/semester/${studentId}`),
  createSemester: (data) => api.post('/api/results/semester', data),
};

// Analytics & Dashboard
export const analyticsAPI = {
  student: (studentId) => api.get(`/api/analytics/student/${studentId}`),
  leaderboard: () => api.get('/api/leaderboard'),
  studentDashboard: () => api.get('/api/dashboard/student'),
  teacherDashboard: () => api.get('/api/dashboard/teacher'),
  adminDashboard: () => api.get('/api/dashboard/admin'),
};

export default api;
