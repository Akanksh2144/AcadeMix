import requests
import sys
import json
from datetime import datetime

class QuizPortalAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tokens = {}
        self.users = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message, status="INFO"):
        print(f"[{status}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, user_type=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        # Create fresh headers for each request
        test_headers = {'Content-Type': 'application/json'}
        
        # Add auth token if user_type specified
        if user_type and user_type in self.tokens:
            test_headers['Authorization'] = f'Bearer {self.tokens[user_type]}'
            # Debug: print token info
            # self.log(f"Using token for {user_type}: {self.tokens[user_type][:20]}...", "DEBUG")
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            # Use requests directly instead of session to avoid cookie interference
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.failed_tests.append(f"{name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                try:
                    self.log(f"Response: {response.json()}", "ERROR")
                except:
                    self.log(f"Response: {response.text}", "ERROR")
                return False, {}

        except Exception as e:
            self.failed_tests.append(f"{name} - Error: {str(e)}")
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_login(self, college_id, password, user_type):
        """Test login and store token"""
        success, response = self.run_test(
            f"Login {user_type} ({college_id})",
            "POST",
            "api/auth/login",
            200,
            data={"college_id": college_id, "password": password}
        )
        if success and 'access_token' in response:
            self.tokens[user_type] = response['access_token']
            self.users[user_type] = response
            # self.log(f"Stored token for {user_type}: {response['access_token'][:20]}...", "DEBUG")
            return True
        return False

    def test_faculty_teachers_list(self):
        """Test HOD can see faculty teachers including HODs"""
        success, response = self.run_test(
            "Faculty Teachers List (HOD)",
            "GET",
            "api/faculty/teachers",
            200,
            user_type="hod"
        )
        if success:
            # Check if HOD001 (Dr. Venkat Rao) appears in the list
            hod_found = False
            teacher_found = False
            for teacher in response:
                if teacher.get('college_id') == 'HOD001':
                    hod_found = True
                    self.log(f"✅ HOD001 (Dr. Venkat Rao) found in faculty list", "PASS")
                if teacher.get('college_id') == 'T001':
                    teacher_found = True
                    self.log(f"✅ T001 (Dr. Sarah Johnson) found in faculty list", "PASS")
            
            if not hod_found:
                self.failed_tests.append("HOD001 not found in faculty teachers list")
                self.log(f"❌ HOD001 not found in faculty teachers list", "FAIL")
            if not teacher_found:
                self.failed_tests.append("T001 not found in faculty teachers list")
                self.log(f"❌ T001 not found in faculty teachers list", "FAIL")
                
            return hod_found and teacher_found
        return False

    def test_faculty_assignments(self):
        """Test HOD can see faculty assignments"""
        success, response = self.run_test(
            "Faculty Assignments (HOD)",
            "GET",
            "api/faculty/assignments",
            200,
            user_type="hod"
        )
        if success:
            self.log(f"✅ Found {len(response)} faculty assignments", "PASS")
            # Should return 3 assignments (2 for Dr. Sarah Johnson, 1 for Dr. Venkat Rao)
            if len(response) >= 3:
                self.log(f"✅ Expected 3+ assignments, found {len(response)}", "PASS")
                return True
            else:
                self.failed_tests.append(f"Expected 3+ assignments, found {len(response)}")
                self.log(f"❌ Expected 3+ assignments, found {len(response)}", "FAIL")
                return False
        return False

    def test_hod_marks_assignments(self):
        """Test HOD marks entry assignments"""
        success, response = self.run_test(
            "HOD Marks Assignments",
            "GET",
            "api/marks/my-assignments",
            200,
            user_type="hod"
        )
        if success:
            # Should return 1 assignment (Big Data Analytics for HOD)
            big_data_found = False
            for assignment in response:
                if assignment.get('subject_name') == 'Big Data Analytics':
                    big_data_found = True
                    self.log(f"✅ Big Data Analytics assignment found for HOD", "PASS")
                    break
            
            if not big_data_found:
                self.failed_tests.append("Big Data Analytics assignment not found for HOD")
                self.log(f"❌ Big Data Analytics assignment not found for HOD", "FAIL")
            
            return big_data_found
        return False

    def test_students_for_marks(self):
        """Test getting students for marks entry"""
        success, response = self.run_test(
            "Students for Marks (DS/2022/A)",
            "GET",
            "api/marks/students?department=DS&batch=2022&section=A",
            200,
            user_type="hod"
        )
        if success:
            # Should return 8 students
            if len(response) == 8:
                self.log(f"✅ Found exactly 8 DS students in batch 2022 section A", "PASS")
                return True
            else:
                self.failed_tests.append(f"Expected 8 students, found {len(response)}")
                self.log(f"❌ Expected 8 students, found {len(response)}", "FAIL")
                return False
        return False

    def test_admin_dashboard(self):
        """Test admin dashboard returns real data"""
        success, response = self.run_test(
            "Admin Dashboard",
            "GET",
            "api/dashboard/admin",
            200,
            user_type="admin"
        )
        if success:
            # Check for real counts
            total_students = response.get('total_students', 0)
            total_teachers = response.get('total_teachers', 0)
            total_hods = response.get('total_hods', 0)
            active_quizzes = response.get('active_quizzes', 0)
            
            self.log(f"Admin Dashboard - Students: {total_students}, Teachers: {total_teachers}, HODs: {total_hods}, Active Quizzes: {active_quizzes}", "INFO")
            
            # Expected: 10 students, 3 teachers, 3 HODs, 3 active quizzes
            checks = [
                (total_students == 10, f"Students: expected 10, got {total_students}"),
                (total_teachers == 3, f"Teachers: expected 3, got {total_teachers}"),
                (total_hods == 3, f"HODs: expected 3, got {total_hods}"),
                (active_quizzes >= 1, f"Active quizzes: expected ≥1, got {active_quizzes}")
            ]
            
            all_passed = True
            for check, message in checks:
                if check:
                    self.log(f"✅ {message}", "PASS")
                else:
                    self.failed_tests.append(f"Admin Dashboard - {message}")
                    self.log(f"❌ {message}", "FAIL")
                    all_passed = False
            
            return all_passed
        return False

    def test_teacher_dashboard(self):
        """Test teacher dashboard returns real data"""
        success, response = self.run_test(
            "Teacher Dashboard",
            "GET",
            "api/dashboard/teacher",
            200,
            user_type="teacher"
        )
        if success:
            quizzes = response.get('quizzes', [])
            total_students = response.get('total_students', 0)
            
            self.log(f"Teacher Dashboard - Quizzes: {len(quizzes)}, Total Students: {total_students}", "INFO")
            
            if len(quizzes) > 0:
                self.log(f"✅ Teacher has {len(quizzes)} quizzes", "PASS")
                return True
            else:
                self.failed_tests.append("Teacher dashboard shows no quizzes")
                self.log(f"❌ Teacher dashboard shows no quizzes", "FAIL")
                return False
        return False

    def test_hod_dashboard(self):
        """Test HOD dashboard returns real data"""
        success, response = self.run_test(
            "HOD Dashboard",
            "GET",
            "api/dashboard/hod",
            200,
            user_type="hod"
        )
        if success:
            total_teachers = response.get('total_teachers', 0)
            total_students = response.get('total_students', 0)
            total_assignments = response.get('total_assignments', 0)
            
            self.log(f"HOD Dashboard - Teachers: {total_teachers}, Students: {total_students}, Assignments: {total_assignments}", "INFO")
            
            # Check for DS department stats
            checks = [
                (total_students >= 8, f"Students: expected ≥8, got {total_students}"),
                (total_teachers >= 1, f"Teachers: expected ≥1, got {total_teachers}"),
                (total_assignments >= 1, f"Assignments: expected ≥1, got {total_assignments}")
            ]
            
            all_passed = True
            for check, message in checks:
                if check:
                    self.log(f"✅ {message}", "PASS")
                else:
                    self.failed_tests.append(f"HOD Dashboard - {message}")
                    self.log(f"❌ {message}", "FAIL")
                    all_passed = False
            
            return all_passed
        return False

def main():
    tester = QuizPortalAPITester()
    
    print("🚀 Starting QuizPortal Backend API Tests")
    print("=" * 60)
    
    # Test health check
    tester.test_health_check()
    
    # Test logins for all required roles
    credentials = [
        ("A001", "admin123", "admin"),
        ("T001", "teacher123", "teacher"), 
        ("HOD001", "hod123", "hod"),
        ("EC001", "exam123", "exam_cell"),
        ("22WJ8A6745", "student123", "student")
    ]
    
    login_success = True
    for college_id, password, user_type in credentials:
        if not tester.test_login(college_id, password, user_type):
            login_success = False
            tester.log(f"❌ Login failed for {user_type}, skipping dependent tests", "ERROR")
    
    if not login_success:
        print(f"\n📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
        return 1
    
    # Test auth/me for all users to verify tokens work
    print("\n🔐 Testing Token Validation:")
    print("-" * 30)
    for user_type in ["admin", "teacher", "hod", "exam_cell", "student"]:
        success, response = tester.run_test(
            f"Auth Me ({user_type})",
            "GET",
            "api/auth/me", 
            200,
            user_type=user_type
        )
        if success:
            tester.log(f"✅ {user_type} token valid - role: {response.get('role')}", "PASS")
        else:
            tester.log(f"❌ {user_type} token invalid", "FAIL")
    
    # Test specific QuizPortal features mentioned in review request
    print("\n🔍 Testing QuizPortal Specific Features:")
    print("-" * 40)
    
    # 1. HOD in faculty teachers list
    tester.test_faculty_teachers_list()
    
    # 2. Faculty assignments
    tester.test_faculty_assignments()
    
    # 3. HOD marks entry
    tester.test_hod_marks_assignments()
    
    # 4. Students for marks
    tester.test_students_for_marks()
    
    # 5. Admin dashboard
    tester.test_admin_dashboard()
    
    # 6. Teacher dashboard
    tester.test_teacher_dashboard()
    
    # 7. HOD dashboard
    tester.test_hod_dashboard()
    
    print("\n" + "=" * 60)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failed in tester.failed_tests:
            print(f"  - {failed}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())