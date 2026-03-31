"""
Backend tests for HOD, Exam Cell, and Marks Workflow features:
1. HOD login and dashboard
2. Exam Cell login and dashboard
3. Faculty assignments (HOD)
4. Marks entry (Teacher)
5. Marks review (HOD)
6. Approved marks and CSV upload (Exam Cell)
"""
import pytest
import requests
import os
import tempfile

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://repo-analyzer-208.preview.emergentagent.com').rstrip('/')


class TestHODAuth:
    """HOD authentication and dashboard tests"""
    
    def test_hod_login_success(self):
        """Test HOD login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "HOD001",
            "password": "hod123"
        })
        assert response.status_code == 200, f"HOD login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["role"] == "hod"
        assert data["college_id"] == "HOD001"
        assert data["department"] == "DS"
        print(f"✓ HOD login successful: {data['name']} (role={data['role']}, dept={data['department']})")
        return data["access_token"]
    
    def test_hod_dashboard(self):
        """Test HOD dashboard endpoint"""
        # Login as HOD
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "HOD001",
            "password": "hod123"
        })
        token = login_resp.json().get("access_token")
        
        # Get HOD dashboard
        response = requests.get(
            f"{BASE_URL}/api/dashboard/hod",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"HOD dashboard failed: {response.text}"
        data = response.json()
        
        # Verify dashboard structure
        assert "total_teachers" in data
        assert "total_students" in data
        assert "total_assignments" in data
        assert "pending_reviews" in data
        
        print(f"✓ HOD dashboard: {data['total_teachers']} teachers, {data['total_students']} students, {data['total_assignments']} assignments, {data['pending_reviews']} pending reviews")
        return data
    
    def test_hod_dashboard_requires_hod_role(self):
        """Test HOD dashboard requires hod role"""
        # Login as student
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "22WJ8A6745",
            "password": "student123"
        })
        token = login_resp.json().get("access_token")
        
        # Try to access HOD dashboard
        response = requests.get(
            f"{BASE_URL}/api/dashboard/hod",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403, "Student should not access HOD dashboard"
        print("✓ HOD dashboard correctly requires hod role (403 for student)")


class TestExamCellAuth:
    """Exam Cell authentication and dashboard tests"""
    
    def test_exam_cell_login_success(self):
        """Test Exam Cell login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "EC001",
            "password": "exam123"
        })
        assert response.status_code == 200, f"Exam Cell login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["role"] == "exam_cell"
        assert data["college_id"] == "EC001"
        print(f"✓ Exam Cell login successful: {data['name']} (role={data['role']})")
        return data["access_token"]
    
    def test_exam_cell_dashboard(self):
        """Test Exam Cell dashboard endpoint"""
        # Login as Exam Cell
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "EC001",
            "password": "exam123"
        })
        token = login_resp.json().get("access_token")
        
        # Get Exam Cell dashboard
        response = requests.get(
            f"{BASE_URL}/api/dashboard/exam_cell",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Exam Cell dashboard failed: {response.text}"
        data = response.json()
        
        # Verify dashboard structure
        assert "total_approved_midterms" in data
        assert "total_endterm" in data
        assert "total_published" in data
        assert "total_draft" in data
        
        print(f"✓ Exam Cell dashboard: {data['total_approved_midterms']} approved midterms, {data['total_endterm']} endterm entries, {data['total_published']} published")
        return data


class TestFacultyAssignments:
    """Faculty assignment tests (HOD functionality)"""
    
    @pytest.fixture
    def hod_token(self):
        """Get HOD auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "HOD001",
            "password": "hod123"
        })
        return response.json().get("access_token")
    
    def test_list_faculty_assignments(self, hod_token):
        """Test listing faculty assignments"""
        response = requests.get(
            f"{BASE_URL}/api/faculty/assignments",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        assert response.status_code == 200, f"List assignments failed: {response.text}"
        assignments = response.json()
        assert isinstance(assignments, list)
        
        # Should have seeded assignments
        print(f"✓ Found {len(assignments)} faculty assignments")
        for a in assignments[:3]:
            print(f"  - {a.get('teacher_name')}: {a.get('subject_name')} ({a.get('subject_code')})")
        
        return assignments
    
    def test_list_department_teachers(self, hod_token):
        """Test listing teachers in department"""
        response = requests.get(
            f"{BASE_URL}/api/faculty/teachers",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        assert response.status_code == 200, f"List teachers failed: {response.text}"
        teachers = response.json()
        assert isinstance(teachers, list)
        
        print(f"✓ Found {len(teachers)} teachers in department")
        for t in teachers:
            print(f"  - {t.get('name')} ({t.get('college_id')})")
        
        return teachers
    
    def test_create_faculty_assignment(self, hod_token):
        """Test creating a new faculty assignment"""
        # First get a teacher
        teachers_resp = requests.get(
            f"{BASE_URL}/api/faculty/teachers",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        teachers = teachers_resp.json()
        if not teachers:
            pytest.skip("No teachers available")
        
        teacher = teachers[0]
        
        # Create assignment
        response = requests.post(
            f"{BASE_URL}/api/faculty/assignments",
            json={
                "teacher_id": teacher["id"],
                "subject_code": "TEST001",
                "subject_name": "Test Subject for Testing",
                "department": "DS",
                "batch": "2022",
                "section": "A",
                "semester": 3
            },
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        # May fail if assignment already exists
        if response.status_code == 400 and "already exists" in response.text:
            print("✓ Assignment already exists (expected for repeated tests)")
            return
        
        assert response.status_code == 200, f"Create assignment failed: {response.text}"
        data = response.json()
        assert data["subject_code"] == "TEST001"
        print(f"✓ Created faculty assignment: {data['subject_name']} for {data['teacher_name']}")
        
        # Clean up - delete the test assignment
        requests.delete(
            f"{BASE_URL}/api/faculty/assignments/{data['id']}",
            headers={"Authorization": f"Bearer {hod_token}"}
        )


class TestTeacherMarksEntry:
    """Teacher marks entry tests"""
    
    @pytest.fixture
    def teacher_token(self):
        """Get Teacher auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "T001",
            "password": "teacher123"
        })
        return response.json().get("access_token")
    
    def test_teacher_login(self):
        """Test Teacher login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "T001",
            "password": "teacher123"
        })
        assert response.status_code == 200, f"Teacher login failed: {response.text}"
        data = response.json()
        assert data["role"] == "teacher"
        print(f"✓ Teacher login successful: {data['name']} (role={data['role']})")
    
    def test_get_my_assignments(self, teacher_token):
        """Test getting teacher's subject assignments"""
        response = requests.get(
            f"{BASE_URL}/api/marks/my-assignments",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200, f"Get my assignments failed: {response.text}"
        assignments = response.json()
        assert isinstance(assignments, list)
        
        print(f"✓ Teacher has {len(assignments)} subject assignments")
        for a in assignments:
            print(f"  - {a.get('subject_name')} ({a.get('subject_code')}) - Batch {a.get('batch')} Sec {a.get('section')}")
        
        return assignments
    
    def test_get_students_for_marks(self, teacher_token):
        """Test getting students for marks entry"""
        response = requests.get(
            f"{BASE_URL}/api/marks/students",
            params={"department": "DS", "batch": "2022", "section": "A"},
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200, f"Get students failed: {response.text}"
        students = response.json()
        assert isinstance(students, list)
        
        print(f"✓ Found {len(students)} students for DS/2022/A")
        for s in students[:3]:
            print(f"  - {s.get('name')} ({s.get('college_id')})")
        
        return students
    
    def test_save_marks_draft(self, teacher_token):
        """Test saving marks as draft"""
        # Get assignments
        assignments_resp = requests.get(
            f"{BASE_URL}/api/marks/my-assignments",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assignments = assignments_resp.json()
        if not assignments:
            pytest.skip("No assignments for teacher")
        
        assignment = assignments[0]
        
        # Get students
        students_resp = requests.get(
            f"{BASE_URL}/api/marks/students",
            params={"department": assignment["department"], "batch": assignment["batch"], "section": assignment["section"]},
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        students = students_resp.json()
        if not students:
            pytest.skip("No students found")
        
        # Create marks entries
        entries = [
            {
                "student_id": s["id"],
                "college_id": s["college_id"],
                "student_name": s["name"],
                "marks": 25.0 if i % 2 == 0 else 28.0
            }
            for i, s in enumerate(students[:3])
        ]
        
        # Save marks
        response = requests.post(
            f"{BASE_URL}/api/marks/entry",
            json={
                "assignment_id": assignment["id"],
                "exam_type": "mid1",
                "semester": assignment.get("semester", 3),
                "max_marks": 30,
                "entries": entries
            },
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200, f"Save marks failed: {response.text}"
        data = response.json()
        assert data["status"] == "draft"
        print(f"✓ Saved marks draft for {assignment['subject_name']}: {len(entries)} students")
        
        return data


class TestMarksReview:
    """HOD marks review tests"""
    
    @pytest.fixture
    def hod_token(self):
        """Get HOD auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "HOD001",
            "password": "hod123"
        })
        return response.json().get("access_token")
    
    def test_list_submissions(self, hod_token):
        """Test listing mark submissions for review"""
        response = requests.get(
            f"{BASE_URL}/api/marks/submissions",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        assert response.status_code == 200, f"List submissions failed: {response.text}"
        submissions = response.json()
        assert isinstance(submissions, list)
        
        print(f"✓ Found {len(submissions)} mark submissions")
        for s in submissions[:3]:
            print(f"  - {s.get('subject_name')} by {s.get('teacher_name')} - Status: {s.get('status')}")
        
        return submissions


class TestExamCellOperations:
    """Exam Cell operations tests"""
    
    @pytest.fixture
    def exam_cell_token(self):
        """Get Exam Cell auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "EC001",
            "password": "exam123"
        })
        return response.json().get("access_token")
    
    def test_get_approved_marks(self, exam_cell_token):
        """Test getting approved marks"""
        response = requests.get(
            f"{BASE_URL}/api/examcell/approved-marks",
            headers={"Authorization": f"Bearer {exam_cell_token}"}
        )
        assert response.status_code == 200, f"Get approved marks failed: {response.text}"
        marks = response.json()
        assert isinstance(marks, list)
        
        print(f"✓ Found {len(marks)} approved mark entries")
        return marks
    
    def test_get_endterm_list(self, exam_cell_token):
        """Test getting endterm entries list"""
        response = requests.get(
            f"{BASE_URL}/api/examcell/endterm",
            headers={"Authorization": f"Bearer {exam_cell_token}"}
        )
        assert response.status_code == 200, f"Get endterm list failed: {response.text}"
        entries = response.json()
        assert isinstance(entries, list)
        
        print(f"✓ Found {len(entries)} endterm entries")
        return entries
    
    def test_upload_csv_marks(self, exam_cell_token):
        """Test uploading marks via CSV file"""
        # Create a test CSV file
        csv_content = """college_id,marks,grade
22WJ8A6745,85,A
S2024101,78,B+
S2024089,92,O
"""
        # Create temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                response = requests.post(
                    f"{BASE_URL}/api/examcell/upload",
                    files={"file": ("test_marks.csv", f, "text/csv")},
                    data={
                        "semester": 3,
                        "subject_code": "TEST_UPLOAD",
                        "subject_name": "Test Upload Subject",
                        "department": "DS",
                        "batch": "2022",
                        "section": "A"
                    },
                    headers={"Authorization": f"Bearer {exam_cell_token}"}
                )
            
            assert response.status_code == 200, f"Upload CSV failed: {response.text}"
            data = response.json()
            assert "count" in data
            print(f"✓ Uploaded CSV marks: {data.get('count', 0)} students processed")
            print(f"  Message: {data.get('message')}")
        finally:
            os.unlink(temp_path)


class TestTeacher2Login:
    """Test Teacher2 (T002) login"""
    
    def test_teacher2_login(self):
        """Test Teacher2 login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "T002",
            "password": "teacher123"
        })
        assert response.status_code == 200, f"Teacher2 login failed: {response.text}"
        data = response.json()
        assert data["role"] == "teacher"
        assert data["college_id"] == "T002"
        print(f"✓ Teacher2 login successful: {data['name']} (role={data['role']})")


class TestAdminDashboard:
    """Admin dashboard tests to verify new role counts"""
    
    def test_admin_dashboard_shows_new_roles(self):
        """Test admin dashboard shows HOD and Exam Cell counts"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "A001",
            "password": "admin123"
        })
        token = login_resp.json().get("access_token")
        
        # Get admin dashboard
        response = requests.get(
            f"{BASE_URL}/api/dashboard/admin",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Admin dashboard failed: {response.text}"
        data = response.json()
        
        # Verify new role counts
        assert "total_hods" in data
        assert "total_exam_cell" in data
        
        print(f"✓ Admin dashboard: {data['total_hods']} HODs, {data['total_exam_cell']} Exam Cell users")
        print(f"  Total: {data['total_students']} students, {data['total_teachers']} teachers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
