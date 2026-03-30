import requests
import sys
import json
from datetime import datetime

class CollegeQuizAPITester:
    def __init__(self, base_url="https://quiz-portal-23.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tokens = {}
        self.users = {}
        self.tests_run = 0
        self.tests_passed = 0

    def log(self, message, status="INFO"):
        print(f"[{status}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, user_type=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = self.session.headers.copy()
        
        # Add auth token if user_type specified
        if user_type and user_type in self.tokens:
            test_headers['Authorization'] = f'Bearer {self.tokens[user_type]}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                try:
                    self.log(f"Response: {response.json()}", "ERROR")
                except:
                    self.log(f"Response: {response.text}", "ERROR")
                return False, {}

        except Exception as e:
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
            return True
        return False

    def test_invalid_login(self):
        """Test invalid login credentials"""
        return self.run_test(
            "Invalid Login",
            "POST", 
            "api/auth/login",
            401,
            data={"college_id": "INVALID", "password": "wrong"}
        )

    def test_auth_me(self, user_type):
        """Test /auth/me endpoint"""
        return self.run_test(
            f"Auth Me ({user_type})",
            "GET",
            "api/auth/me", 
            200,
            user_type=user_type
        )

    def test_student_dashboard(self):
        """Test student dashboard endpoint"""
        return self.run_test(
            "Student Dashboard",
            "GET",
            "api/dashboard/student",
            200,
            user_type="student"
        )

    def test_teacher_dashboard(self):
        """Test teacher dashboard endpoint"""
        return self.run_test(
            "Teacher Dashboard", 
            "GET",
            "api/dashboard/teacher",
            200,
            user_type="teacher"
        )

    def test_admin_dashboard(self):
        """Test admin dashboard endpoint"""
        return self.run_test(
            "Admin Dashboard",
            "GET", 
            "api/dashboard/admin",
            200,
            user_type="admin"
        )

    def test_list_quizzes(self, user_type):
        """Test list quizzes endpoint"""
        return self.run_test(
            f"List Quizzes ({user_type})",
            "GET",
            "api/quizzes",
            200,
            user_type=user_type
        )

    def test_get_quiz(self, quiz_id, user_type):
        """Test get specific quiz"""
        return self.run_test(
            f"Get Quiz {quiz_id} ({user_type})",
            "GET",
            f"api/quizzes/{quiz_id}",
            200,
            user_type=user_type
        )

    def test_start_quiz_attempt(self, quiz_id):
        """Test starting a quiz attempt"""
        return self.run_test(
            f"Start Quiz Attempt {quiz_id}",
            "POST",
            f"api/quizzes/{quiz_id}/start",
            200,
            user_type="student"
        )

    def test_submit_answer(self, attempt_id, question_index, answer):
        """Test submitting an answer"""
        return self.run_test(
            f"Submit Answer Q{question_index + 1}",
            "POST",
            f"api/attempts/{attempt_id}/answer",
            200,
            data={"question_index": question_index, "answer": answer},
            user_type="student"
        )

    def test_submit_quiz_attempt(self, attempt_id):
        """Test submitting quiz attempt"""
        return self.run_test(
            f"Submit Quiz Attempt {attempt_id}",
            "POST",
            f"api/attempts/{attempt_id}/submit",
            200,
            user_type="student"
        )

    def test_get_attempt_result(self, attempt_id):
        """Test getting attempt result"""
        return self.run_test(
            f"Get Attempt Result {attempt_id}",
            "GET",
            f"api/attempts/{attempt_id}/result",
            200,
            user_type="student"
        )

    def test_list_attempts(self):
        """Test listing student attempts"""
        return self.run_test(
            "List Student Attempts",
            "GET",
            "api/attempts",
            200,
            user_type="student"
        )

    def test_semester_results(self, student_id):
        """Test semester results endpoint"""
        return self.run_test(
            f"Semester Results for {student_id}",
            "GET",
            f"api/results/semester/{student_id}",
            200,
            user_type="student"
        )

    def test_student_analytics(self, student_id):
        """Test student analytics endpoint"""
        return self.run_test(
            f"Student Analytics for {student_id}",
            "GET",
            f"api/analytics/student/{student_id}",
            200,
            user_type="student"
        )

    def test_leaderboard(self):
        """Test leaderboard endpoint"""
        return self.run_test(
            "Leaderboard",
            "GET",
            "api/leaderboard",
            200,
            user_type="student"
        )

    def test_logout(self, user_type):
        """Test logout endpoint"""
        return self.run_test(
            f"Logout ({user_type})",
            "POST",
            "api/auth/logout",
            200,
            user_type=user_type
        )

def main():
    tester = CollegeQuizAPITester()
    
    print("🚀 Starting College Quiz Platform API Tests")
    print("=" * 60)
    
    # Test health check
    tester.test_health_check()
    
    # Test invalid login
    tester.test_invalid_login()
    
    # Test valid logins for all user types
    credentials = [
        ("22WJ8A6745", "student123", "student"),
        ("T001", "teacher123", "teacher"), 
        ("A001", "admin123", "admin")
    ]
    
    login_success = True
    for college_id, password, user_type in credentials:
        if not tester.test_login(college_id, password, user_type):
            login_success = False
            tester.log(f"❌ Login failed for {user_type}, skipping dependent tests", "ERROR")
    
    if not login_success:
        print(f"\n📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
        return 1
    
    # Test auth/me for all users
    for user_type in ["student", "teacher", "admin"]:
        tester.test_auth_me(user_type)
    
    # Test dashboards
    tester.test_student_dashboard()
    tester.test_teacher_dashboard() 
    tester.test_admin_dashboard()
    
    # Test quiz functionality
    for user_type in ["student", "teacher", "admin"]:
        success, quizzes = tester.test_list_quizzes(user_type)
        if success and quizzes:
            # Test getting first quiz
            first_quiz = quizzes[0]
            quiz_id = first_quiz.get('id')
            if quiz_id:
                tester.test_get_quiz(quiz_id, user_type)
                
                # Test quiz attempt flow (student only)
                if user_type == "student":
                    success, attempt = tester.test_start_quiz_attempt(quiz_id)
                    if success and attempt.get('id'):
                        attempt_id = attempt['id']
                        
                        # Submit some sample answers
                        tester.test_submit_answer(attempt_id, 0, 1)  # MCQ answer
                        tester.test_submit_answer(attempt_id, 1, True)  # Boolean answer
                        tester.test_submit_answer(attempt_id, 2, "Sample short answer")  # Short answer
                        
                        # Submit the attempt
                        tester.test_submit_quiz_attempt(attempt_id)
                        
                        # Get the result
                        tester.test_get_attempt_result(attempt_id)
    
    # Test student-specific endpoints
    if "student" in tester.users:
        student_id = tester.users["student"].get("id")
        if student_id:
            tester.test_semester_results(student_id)
            tester.test_student_analytics(student_id)
    
    # Test attempts list
    tester.test_list_attempts()
    
    # Test leaderboard
    tester.test_leaderboard()
    
    # Test logout for all users
    for user_type in ["student", "teacher", "admin"]:
        tester.test_logout(user_type)
    
    print("\n" + "=" * 60)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())