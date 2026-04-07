import re

file_path = r"C:\AcadMix\frontend\src\services\api.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

faculty_add = """
  submitQuestionPaper: (data) => api.post('/api/faculty/question-papers', data),
  getQuestionPapers: () => api.get('/api/faculty/question-papers'),
  submitStudyMaterial: (data) => api.post('/api/faculty/study-materials', data),
  getStudyMaterials: () => api.get('/api/faculty/study-materials'),
  getTeachingEvaluations: () => api.get('/api/faculty/my-evaluations'),
};"""

admin_add = """
  assignExpert: (data) => api.post('/api/admin/experts/assign', data),
  getExperts: () => api.get('/api/admin/experts'),
};"""

content = re.sub(r'getSubjectCIA:.*?cia-template.*?\},?\n\s*\}\;', lambda m: m.group(0).replace('};', faculty_add), content, flags=re.DOTALL)
content = re.sub(r'toggleConsolidation:.*?enable-consolidation.*?\},?\n\s*\}\;', lambda m: m.group(0).replace('};', admin_add), content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated api.js successfully via Python")
