import re

file_path = r"C:\AcadMix\frontend\src\services\api.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

admin_add = """
  // Nodal integration
  adminAcknowledgeCircular: (id) => api.post(`/api/admin/circulars/${id}/acknowledge`),
  adminGetCirculars: () => api.get('/api/admin/circulars'),
  adminGetSubmissions: () => api.get('/api/admin/submissions'),
  adminSubmitRequirement: (id, data) => api.post(`/api/admin/submissions/${id}`, data),
  adminGetInspections: () => api.get('/api/admin/inspections'),
  adminRespondInspection: (id, data) => api.post(`/api/admin/inspections/${id}/respond`, data),
};"""

nodal_add = """
export const nodalAPI = {
  getColleges: () => api.get('/api/nodal/colleges'),
  getAttendanceCompliance: () => api.get('/api/nodal/reports/attendance-compliance'),
  getResultsStatus: () => api.get('/api/nodal/reports/results-status'),
  getCiaSubmission: () => api.get('/api/nodal/reports/cia-submission'),
  getFacultyProfiles: () => api.get('/api/nodal/reports/faculty-profiles'),
  getAccreditation: () => api.get('/api/nodal/reports/accreditation'),
  getActivityReports: () => api.get('/api/nodal/activity-reports'),
  acknowledgeActivity: (id, data) => api.put(`/api/nodal/activity-reports/${id}/acknowledge`, data),
  createCircular: (data) => api.post('/api/nodal/circulars', data),
  getCirculars: () => api.get('/api/nodal/circulars'),
  createSubmissionRequirement: (data) => api.post('/api/nodal/submission-requirements', data),
  getSubmissionsStatus: () => api.get('/api/nodal/submissions/status'),
  assignExpert: (data) => api.post('/api/nodal/experts/assign', data),
  createInspection: (data) => api.post('/api/nodal/inspections', data),
  getInspections: () => api.get('/api/nodal/inspections'),
};
"""

content = re.sub(r'getExperts: \(\) => api\.get\(\'/api/admin/experts\'\),?\s*\}\;', lambda m: m.group(0).replace('};', admin_add), content, flags=re.DOTALL)

if "export const nodalAPI" not in content:
    content += nodal_add

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated api.js successfully via Python")
