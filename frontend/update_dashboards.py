import re

def update_file(file_path, tab_insert, render_insert, import_stmt):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Add import
    if import_stmt not in content:
        content = content.replace("import DashboardSkeleton from '../components/DashboardSkeleton';", f"import DashboardSkeleton from '../components/DashboardSkeleton';\n{import_stmt}")
    
    # Add tab if not exists
    if tab_insert["id"] not in content:
        content = content.replace(tab_insert["target"], f"{tab_insert['target']}\n{tab_insert['content']}")
        
    # Add render
    if render_insert["id"] not in content:
        # insert before <AnimatePresence> or last closing div
        content = re.sub(r'(<AnimatePresence>.*?</AnimatePresence>\s*</div>\s*</div>\s*\);\s*};\s*export default)', rf'{render_insert["content"]}\n        \1', content, flags=re.DOTALL)
        
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

# Teacher Dashboard
update_file(
    r"C:\AcadMix\frontend\src\pages\TeacherDashboard.js",
    {
        "id": "expert",
        "target": "{ id: 'profile', label: 'My Profile' },",
        "content": "              { id: 'expert', label: 'Expert Module' },"
    },
    {
        "id": "expert-content",
        "content": "        {activeTab === 'expert' && (\n          <motion.div data-testid=\"expert-content\" variants={containerVariants} initial=\"hidden\" animate=\"show\">\n            <motion.div variants={itemVariants}>\n              <FacultyExpertSubmissions />\n            </motion.div>\n          </motion.div>\n        )}"
    },
    "import FacultyExpertSubmissions from '../components/faculty/FacultyExpertSubmissions';"
)

# Admin Dashboard
update_file(
    r"C:\AcadMix\frontend\src\pages\AdminDashboard.js",
    {
        "id": "experts",
        "target": "{ id: 'cia-builder', label: 'CIA Engine' }",
        "content": "              ,{ id: 'experts', label: 'Expert Management' }"
    },
    {
        "id": "experts-content",
        "content": "        {activeTab === 'experts' && (\n          <motion.div data-testid=\"experts-content\" variants={containerVariants} initial=\"hidden\" animate=\"show\">\n            <motion.div variants={itemVariants}>\n              <AdminExpertManagement />\n            </motion.div>\n          </motion.div>\n        )}"
    },
    "import AdminExpertManagement from '../components/admin/AdminExpertManagement';"
)

print("Dashboards updated successfully")
