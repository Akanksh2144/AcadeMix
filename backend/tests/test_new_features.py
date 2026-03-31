"""
Backend tests for new features:
1. Code execution endpoint (Python, JavaScript)
2. Login API
3. Analytics API
4. Quiz listing with coding quiz
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://repo-analyzer-208.preview.emergentagent.com').rstrip('/')

class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_student_login_success(self):
        """Test student login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "22WJ8A6745",
            "password": "student123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["role"] == "student"
        assert data["college_id"] == "22WJ8A6745"
        print(f"✓ Student login successful: {data['name']}")
        return data["access_token"]
    
    def test_login_auto_capitalize(self):
        """Test that login works with lowercase college ID (backend should handle uppercase)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "22wj8a6745",  # lowercase
            "password": "student123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["college_id"] == "22WJ8A6745"  # Should be uppercase
        print("✓ Login auto-capitalize works (backend accepts lowercase)")
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "INVALID",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid login returns 401")


class TestCodeExecution:
    """Code execution endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "22WJ8A6745",
            "password": "student123"
        })
        return response.json().get("access_token")
    
    def test_python_code_execution(self, auth_token):
        """Test Python code execution"""
        response = requests.post(
            f"{BASE_URL}/api/code/execute",
            json={
                "code": "print('Hello, World!')",
                "language": "python",
                "test_input": ""
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "output" in data
        assert "Hello, World!" in data["output"]
        print(f"✓ Python execution output: {data['output'].strip()}")
    
    def test_python_factorial(self, auth_token):
        """Test Python factorial function"""
        code = """
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
"""
        response = requests.post(
            f"{BASE_URL}/api/code/execute",
            json={
                "code": code,
                "language": "python",
                "test_input": ""
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "120" in data["output"]
        print(f"✓ Python factorial(5) = {data['output'].strip()}")
    
    def test_javascript_code_execution(self, auth_token):
        """Test JavaScript code execution"""
        response = requests.post(
            f"{BASE_URL}/api/code/execute",
            json={
                "code": "console.log('Hello from JS!');",
                "language": "javascript",
                "test_input": ""
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "output" in data
        assert "Hello from JS!" in data["output"]
        print(f"✓ JavaScript execution output: {data['output'].strip()}")
    
    def test_javascript_fibonacci(self, auth_token):
        """Test JavaScript fibonacci function"""
        code = """
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
console.log(fibonacci(10));
"""
        response = requests.post(
            f"{BASE_URL}/api/code/execute",
            json={
                "code": code,
                "language": "javascript",
                "test_input": ""
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "55" in data["output"]
        print(f"✓ JavaScript fibonacci(10) = {data['output'].strip()}")
    
    def test_unsupported_language(self, auth_token):
        """Test unsupported language returns error"""
        response = requests.post(
            f"{BASE_URL}/api/code/execute",
            json={
                "code": "print('test')",
                "language": "ruby",
                "test_input": ""
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 400
        print("✓ Unsupported language returns 400")
    
    def test_code_execution_requires_auth(self):
        """Test code execution requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/code/execute",
            json={
                "code": "print('test')",
                "language": "python",
                "test_input": ""
            }
        )
        assert response.status_code == 401
        print("✓ Code execution requires authentication")


class TestQuizzes:
    """Quiz listing and coding quiz tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "22WJ8A6745",
            "password": "student123"
        })
        return response.json().get("access_token")
    
    def test_list_quizzes(self, auth_token):
        """Test quiz listing returns quizzes including coding quiz"""
        response = requests.get(
            f"{BASE_URL}/api/quizzes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        quizzes = response.json()
        assert isinstance(quizzes, list)
        assert len(quizzes) >= 3  # Should have at least 3 quizzes
        
        # Find Python Coding Challenge
        coding_quiz = next((q for q in quizzes if "Python Coding" in q.get("title", "")), None)
        assert coding_quiz is not None, "Python Coding Challenge quiz not found"
        print(f"✓ Found {len(quizzes)} quizzes including '{coding_quiz['title']}'")
        
        # Verify quiz titles
        titles = [q["title"] for q in quizzes]
        print(f"  Quiz titles: {titles}")
    
    def test_get_coding_quiz_details(self, auth_token):
        """Test getting coding quiz details"""
        # First get quiz list
        response = requests.get(
            f"{BASE_URL}/api/quizzes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        quizzes = response.json()
        coding_quiz = next((q for q in quizzes if "Python Coding" in q.get("title", "")), None)
        
        if coding_quiz:
            # Get quiz details
            response = requests.get(
                f"{BASE_URL}/api/quizzes/{coding_quiz['id']}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code == 200
            quiz = response.json()
            
            # Verify coding questions
            questions = quiz.get("questions", [])
            coding_questions = [q for q in questions if q.get("type") == "coding"]
            assert len(coding_questions) >= 1, "No coding questions found"
            
            # Check coding question structure
            for q in coding_questions:
                assert "language" in q, "Coding question missing language"
                assert "starter_code" in q, "Coding question missing starter_code"
                print(f"  ✓ Coding question: {q['question'][:50]}...")
            
            print(f"✓ Coding quiz has {len(coding_questions)} coding questions")


class TestAnalytics:
    """Analytics endpoint tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "22WJ8A6745",
            "password": "student123"
        })
        token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session, response.json()
    
    def test_student_analytics(self, auth_session):
        """Test student analytics endpoint"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/analytics/student/{user['id']}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify analytics structure
        assert "total_quizzes" in data
        assert "avg_score" in data
        assert "semesters" in data
        assert "latest_cgpa" in data
        
        print(f"✓ Student analytics: {data['total_quizzes']} quizzes, CGPA: {data['latest_cgpa']}")
        print(f"  Semesters: {len(data['semesters'])}")
    
    def test_student_dashboard(self, auth_session):
        """Test student dashboard endpoint"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/dashboard/student")
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard structure
        assert "upcoming_quizzes" in data
        assert "recent_results" in data
        assert "cgpa" in data
        
        print(f"✓ Student dashboard: {len(data['upcoming_quizzes'])} active quizzes, CGPA: {data['cgpa']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
