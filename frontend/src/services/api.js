import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: { 
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  },
});

// Store token for non-cookie auth
let authToken = null;
let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (newToken) => {
  refreshSubscribers.forEach(cb => cb(newToken));
  refreshSubscribers = [];
};

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Response interceptor: attempt silent refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Standardize backend DomainException structure for frontend components
    if (error.response?.data && error.response.data.error) {
      error.response.data.detail = error.response.data.error;
    }

    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/api/auth/')) {
      originalRequest._retry = true;
      
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const { data } = await api.post('/api/auth/refresh');
          if (data.access_token) {
            authToken = data.access_token;
            localStorage.setItem('auth_token', data.access_token);
            onRefreshed(data.access_token);
          }
        } catch {
          // Refresh failed — force logout
          authToken = null;
          localStorage.removeItem('auth_token');
          refreshSubscribers = [];
          isRefreshing = false;
          return Promise.reject(error);
        }
        isRefreshing = false;
      }

      // Queue this request until refresh resolves
      return new Promise((resolve) => {
        refreshSubscribers.push((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }
    return Promise.reject(error);
  }
);

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
  logTelemetryViolation: (attemptId) => api.post(`/api/quizzes/attempts/${attemptId}/telemetry/violation`),
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
  submit: (entryId) => api.put(`/api/marks/entry/${entryId}/submit`),
  submissions: (status) => api.get('/api/marks/submissions', { params: status ? { status } : {} }),
  review: (entryId, data) => api.put(`/api/hod/marks/entry/${entryId}/review`, data),
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

// Student Panel (DHTE spec)
export const studentAPI = {
  attendanceDetail: (params) => api.get('/api/student/attendance/detail', { params }),
  ciaMarks: (params) => api.get('/api/student/cia-marks', { params }),
  academicCalendar: () => api.get('/api/student/academic-calendar'),
  subjects: () => api.get('/api/student/subjects'),
  hallTicket: (semester, academic_year) => api.get('/api/student/hall-ticket', { params: { semester, academic_year } }),
  myRegistrations: () => api.get('/api/student/my-registrations'),
};

// Timetable (HOD & Faculty)
export const timetableAPI = {
  getHod: (departmentId, batch, semester) => api.get('/api/hod/timetable', { params: { department_id: departmentId, batch, semester } }),
  saveHod: (slots) => api.put('/api/hod/timetable/slots', slots),
  delete: (slotId) => api.delete(`/api/timetable/${slotId}`),
  getFacultyToday: () => api.get('/api/faculty/timetable/today'),
  getFacultyWeek: () => api.get('/api/faculty/timetable/today', { params: { week: true } }),
  getStudentTimetable: () => api.get('/api/student/timetable'),
};

// Faculty Panel (DHTE spec Phase 6)
export const facultyPanelAPI = {
  teachingRecords: (params) => api.get('/api/faculty/teaching-records', { params }),
  saveTeachingPlan: (data) => api.post('/api/faculty/teaching-plan', data),
  saveClassRecord: (data) => api.post('/api/faculty/class-record', data),
  updateTeachingRecord: (id, data) => api.patch(`/api/faculty/teaching-records/${id}`, data),
  getProfile: () => api.get('/api/faculty/profile'),
  updateProfile: (data) => api.put('/api/faculty/profile', data),
  ciaDashboard: () => api.get('/api/faculty/cia-dashboard'),
  getSubjectCIA: (subjectCode, academicYear) => api.get(`/api/subjects/${subjectCode}/cia-template`, { params: { academic_year: academicYear } }),
};

export const attendanceAPI = {
  mark: (data) => api.post('/api/faculty/attendance/mark', data),
  getStudentConsolidated: () => api.get('/api/student/attendance'),
  getHodDefaulters: (departmentId, threshold) => api.get('/api/hod/attendance/defaulters', { params: { department_id: departmentId, threshold } }),
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

// Phase 2: HOD Dashboard Governance
export const hodAssignmentsAPI = {
  // Assignments
  getClassInCharges: () => api.get('/api/hod/assignments/class-in-charge'),
  createClassInCharge: (data) => api.post('/api/hod/assignments/class-in-charge', data),
  deleteClassInCharge: (id) => api.delete(`/api/hod/assignments/class-in-charge/${id}`),
  
  getMentors: () => api.get('/api/hod/assignments/mentors'),
  createMentors: (data) => api.post('/api/hod/assignments/mentors', data),
  deactivateMentor: (id) => api.delete(`/api/hod/assignments/mentors/${id}`),
};

export const hodProgressionAPI = {
  // Progression
  getProgression: (studentId) => api.get(`/api/faculty/students/${studentId}/progression`),
  createProgression: (data) => api.post('/api/hod/progression', data),
  deleteProgression: (id) => api.delete(`/api/hod/progression/${id}`),
};

export const hodLeaveAPI = {
  // Leave Cancellation
  requestCancellation: (leaveId, partialDates) => api.patch(`/api/leave/${leaveId}/cancel`, partialDates || {}),
  reviewCancellation: (leaveId, data) => api.patch(`/api/hod/leave/${leaveId}/review-cancellation`, data),
};

export const tpoAPI = {
  getCompanies: () => api.get('/api/tpo/companies'),
  createCompany: (data) => api.post('/api/tpo/companies', data),
  getDrives: () => api.get('/api/tpo/drives'),
  createDrive: (data) => api.post('/api/tpo/drives', data),
  updateDrive: (id, data) => api.put(`/api/tpo/drives/${id}`, data),
  getApplicants: (id) => api.get(`/api/tpo/drives/${id}/applicants`),
  shortlistBulk: (id, ids) => api.put(`/api/tpo/drives/${id}/shortlist`, { student_ids: ids }),
  logResult: (id, data) => api.put(`/api/tpo/drives/${id}/results`, data),
  selectCandidate: (id, data) => api.put(`/api/tpo/drives/${id}/select`, data),
  getStats: () => api.get('/api/tpo/statistics'),
};

export const alumniAPI = {
  // Alumni Self-Service
  getProfile: () => api.get('/api/alumni/profile'),
  updateProfile: (data) => api.put('/api/alumni/profile', data),
  getDirectory: () => api.get('/api/alumni/directory'),
  getJobPostings: () => api.get('/api/alumni/job-postings'),
  postJobReferral: (data) => api.post('/api/alumni/job-postings', data),
  respondMentorship: (id, status) => api.post(`/api/alumni/mentorship/${id}/respond`, { status }),
  addMentorshipNote: (id, note) => api.post(`/api/alumni/mentorship/${id}/session-note`, { note }),
  getEvents: () => api.get('/api/alumni/events'),
  rsvpEvent: (id, status) => api.post(`/api/alumni/events/${id}/register`, { rsvp_status: status }),
  submitAchievement: (data) => api.post('/api/alumni/achievements', data),
  submitFeedback: (data) => api.post('/api/alumni/feedback', data),
  updateHigherStudies: (data) => api.put('/api/alumni/progression/higher-studies', data),

  // Student Endpoints
  getStudentJobs: () => api.get('/api/student/alumni-jobs'),
  getAvailableMentors: () => api.get('/api/student/alumni-mentors'),
  requestMentorship: (data) => api.post('/api/student/alumni-mentorship/request', data),

  // Admin Endpoints
  batchGraduate: (batch, dept, dryRun) => api.post(`/api/admin/alumni/batch-graduate?batch=${batch}&department=${dept || ''}&dry_run=${dryRun}`),
  getPending: () => api.get('/api/admin/alumni/pending'),
  verifyProfile: (id, action) => api.put(`/api/admin/alumni/${id}/verify`, { action }),
  addContribution: (data) => api.post('/api/admin/alumni/contributions', data),
  getOutcomesReport: () => api.get('/api/admin/reports/alumni-outcomes'),
  createEvent: (data) => api.post('/api/admin/alumni-events', data),
  updateEvent: (id, data) => api.put(`/api/admin/alumni-events/${id}`, data),
  markAttendance: (id, ids) => api.put(`/api/admin/alumni-events/${id}/attendance`, { attended_alumni_ids: ids }),
  verifyAchievement: (id, verified, featured) => api.put(`/api/admin/alumni/achievements/${id}/verify`, { is_verified: verified, is_featured: featured }),
};

export const parentAPI = {
  getChildren: () => api.get('/api/parent/children'),
  getAcademics: (id) => api.get(`/api/parent/children/${id}/academics`),
  getAttendance: (id) => api.get(`/api/parent/children/${id}/attendance`),
  getCIAMarks: (id) => api.get(`/api/parent/children/${id}/cia-marks`),
  getTimetable: (id) => api.get(`/api/parent/children/${id}/timetable`),
  getSubjects: (id) => api.get(`/api/parent/children/${id}/subjects`),
  getExamSchedule: (id) => api.get(`/api/parent/children/${id}/exam-schedule`),
  getLeaves: (id) => api.get(`/api/parent/children/${id}/leaves`),
  getFacultyContacts: (id) => api.get(`/api/parent/children/${id}/faculty-contacts`),
  getMentor: (id) => api.get(`/api/parent/children/${id}/mentor`),
  getAcademicCalendar: () => api.get('/api/parent/academic-calendar'),
  updateNotificationPrefs: (prefs) => api.put('/api/parent/notification-preferences', prefs),
};

export const grievanceAPI = {
  submit: (data) => api.post('/api/grievances', data),
  getMine: () => api.get('/api/grievances/my'),
  getAll: (params) => api.get('/api/admin/grievances', { params }),
  resolve: (id, data) => api.put(`/api/admin/grievances/${id}/resolve`, data),
};

export const industryAPI = {
  getDashboard: () => api.get('/api/industry/dashboard'),
  getMOUs: () => api.get('/api/industry/mous'),
  createMOU: (data) => api.post('/api/industry/mous', data),
  getProjects: () => api.get('/api/industry/projects'),
  createProject: (data) => api.post('/api/industry/projects', data),
  requestDrive: (data) => api.post('/api/industry/drives', data),
  submitCurriculumFeedback: (data) => api.post('/api/industry/curriculum-feedback', data),
  submitEmployerFeedback: (data) => api.post('/api/industry/employer-feedback', data),
  scheduleTrainingProgram: (data) => api.post('/api/industry/training-programs', data),
};

export default api;

export const principalAPI = {
  dashboard: () => api.get('/api/principal/dashboard'),
  attendanceCompliance: (year) => api.get('/api/principal/reports/attendance-compliance', { params: { academic_year: year } }),
  academicPerformance: (semester, year) => api.get('/api/principal/reports/academic-performance', { params: { semester, academic_year: year } }),
  ciaStatus: (year) => api.get('/api/principal/reports/cia-status', { params: { academic_year: year } }),
  staffProfiles: () => api.get('/api/principal/reports/staff-profiles'),
  infrastructure: () => api.get('/api/principal/infrastructure'),
  extensionActivities: () => api.get('/api/principal/reports/extension-activities'),
  institutionProfile: () => api.get('/api/principal/institution-profile'),
  updateInstitutionProfile: (data) => api.put('/api/principal/institution-profile', data),
  grievances: (params) => api.get('/api/admin/grievances', { params }),
  reassignGrievance: (id, data) => api.put('/api/principal/grievances/' + id + '/reassign', data),
  pendingLeaves: () => api.get('/api/principal/leave/pending'),
  approveLeave: (id, data) => api.put('/api/hod/leave/' + id + '/review', data),
  activityReports: () => api.get('/api/principal/activity-reports'),
  placementPlaceholder: () => api.get('/api/principal/reports/placement'),
  tasksPlaceholder: () => api.get('/api/principal/tasks'),
  meetingsPlaceholder: () => api.get('/api/principal/meetings'),
  annualReportExportUrl: (year) => api.defaults.baseURL + '/api/principal/reports/annual?academic_year=' + year,
  calendarEvents: (data) => api.post('/api/principal/calendar-events', data)
};

export const retiredFacultyAPI = {
  // Self-service
  dashboard: () => api.get('/api/retired-faculty/dashboard'),
  myRoles: () => api.get('/api/retired-faculty/my-roles'),
  getResearch: () => api.get('/api/retired-faculty/research'),
  createResearch: (data) => api.post('/api/retired-faculty/research', data),
  getConsultancy: () => api.get('/api/retired-faculty/consultancy'),
  createConsultancy: (data) => api.post('/api/retired-faculty/consultancy', data),
  myEntitlements: () => api.get('/api/retired-faculty/my-entitlements'),
  registerEvent: (eventId) => api.post('/api/retired-faculty/events/' + eventId + '/register'),
  // Admin
  availableLecturers: () => api.get('/api/admin/retired-faculty/available-lecturers'),
  createAdvisoryRole: (userId, data) => api.post('/api/admin/retired-faculty/' + userId + '/advisory-roles', data),
  getEntitlements: (userId) => api.get('/api/admin/retired-faculty/' + userId + '/entitlements'),
  updateEntitlements: (userId, data) => api.put('/api/admin/retired-faculty/' + userId + '/entitlements', data),
  researchReport: () => api.get('/api/admin/reports/retired-faculty-research'),
  consultancyReport: () => api.get('/api/admin/reports/consultancy'),
};

export const expertAPI = {
  dashboard: () => api.get('/api/expert/dashboard'),
  myAssignments: () => api.get('/api/expert/my-assignments'),
  getQuestionPapers: () => api.get('/api/expert/question-papers'),
  reviewQuestionPaper: (id, data) => api.put(`/api/expert/question-papers/${id}/review`, data),
  getStudyMaterials: () => api.get('/api/expert/study-materials'),
  reviewStudyMaterial: (id, data) => api.put(`/api/expert/study-materials/${id}/review`, data),
  submitEvaluation: (data) => api.post('/api/expert/evaluations', data),
};
export const nodalAPI = {
  getColleges: () => api.get('/api/nodal/colleges'),
  getAttendanceCompliance: () => api.get('/api/nodal/reports/attendance-compliance'),
  getResultsStatus: () => api.get('/api/nodal/reports/results-status'),
  getCiaSubmission: () => api.get('/api/nodal/reports/cia-submission'),
  getFacultyProfiles: () => api.get('/api/nodal/reports/faculty-profiles'),
  getAccreditation: () => api.get('/api/nodal/reports/accreditation'),
  getActivityReports: () => api.get('/api/nodal/activity-reports'),
  acknowledgeActivity: (id, data) => api.put(`/api/nodal/activity-reports/${id}/acknowledge`, data),
  acknowledgeCircular: (id) => api.post(`/api/admin/circulars/${id}/acknowledge`),
  getCirculars: () => api.get('/api/nodal/circulars'),
  createSubmissionRequirement: (data) => api.post('/api/nodal/submission-requirements', data),
  getSubmissionsStatus: () => api.get('/api/nodal/submissions/status'),
  assignExpert: (data) => api.post('/api/nodal/experts/assign', data),
  createInspection: (data) => api.post('/api/nodal/inspections', data),
  getInspections: () => api.get('/api/nodal/inspections'),
};

// Fee Management & Razorpay
export const feesAPI = {
  getDue: () => api.get('/api/fees/due'),
  createOrder: (data) => api.post('/api/fees/create-order', data),
  verifyPayment: (data) => api.post('/api/fees/verify-payment', data),
  bulkGenerateInvoices: (data) => api.post('/api/admin/fees/invoices/bulk', data),
};

