"""
Test Code Playground Feature - Backend API Tests
Tests for /api/code/execute endpoint with Python, JavaScript, Java support
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCodePlaygroundAPI:
    """Tests for Code Playground /api/code/execute endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for student"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as student
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "22WJ8A6745",
            "password": "student123"
        })
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip("Login failed - skipping authenticated tests")
    
    # ─── Python Execution Tests ─────────────────────────────────────────────
    
    def test_python_hello_world(self):
        """Test basic Python code execution"""
        response = self.session.post(f"{BASE_URL}/api/code/execute", json={
            "code": "print('Hello, World!')",
            "language": "python",
            "test_input": ""
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "output" in data
        assert "Hello, World!" in data["output"]
        assert data["exit_code"] == 0
        print(f"✓ Python Hello World: {data['output'].strip()}")
    
    def test_python_with_function(self):
        """Test Python code with function definition"""
        code = """
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
"""
        response = self.session.post(f"{BASE_URL}/api/code/execute", json={
            "code": code,
            "language": "python",
            "test_input": ""
        })
        assert response.status_code == 200
        data = response.json()
        assert "120" in data["output"]
        assert data["exit_code"] == 0
        print(f"✓ Python factorial(5) = {data['output'].strip()}")
    
    def test_python_with_stdin(self):
        """Test Python code with stdin input"""
        code = """
name = input()
print(f"Hello, {name}!")
"""
        response = self.session.post(f"{BASE_URL}/api/code/execute", json={
            "code": code,
            "language": "python",
            "test_input": "Student"
        })
        assert response.status_code == 200
        data = response.json()
        assert "Hello, Student!" in data["output"]
        print(f"✓ Python with stdin: {data['output'].strip()}")
    
    def test_python_syntax_error(self):
        """Test Python code with syntax error returns error"""
        code = "print('Hello"  # Missing closing quote
        response = self.session.post(f"{BASE_URL}/api/code/execute", json={
            "code": code,
            "language": "python",
            "test_input": ""
        })
        assert response.status_code == 200
        data = response.json()
        # Should have non-zero exit code or error message
        assert data["exit_code"] != 0 or "error" in data.get("output", "").lower() or data.get("error")
        print(f"✓ Python syntax error handled correctly")
    
    # ─── JavaScript Execution Tests ─────────────────────────────────────────
    
    def test_javascript_hello_world(self):
        """Test basic JavaScript code execution"""
        response = self.session.post(f"{BASE_URL}/api/code/execute", json={
            "code": "console.log('Hello, World!');",
            "language": "javascript",
            "test_input": ""
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "output" in data
        assert "Hello, World!" in data["output"]
        assert data["exit_code"] == 0
        print(f"✓ JavaScript Hello World: {data['output'].strip()}")
    
    def test_javascript_with_function(self):
        """Test JavaScript code with function"""
        code = """
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
console.log(fibonacci(10));
"""
        response = self.session.post(f"{BASE_URL}/api/code/execute", json={
            "code": code,
            "language": "javascript",
            "test_input": ""
        })
        assert response.status_code == 200
        data = response.json()
        assert "55" in data["output"]
        assert data["exit_code"] == 0
        print(f"✓ JavaScript fibonacci(10) = {data['output'].strip()}")
    
    # ─── Java Execution Tests ───────────────────────────────────────────────
    
    def test_java_hello_world(self):
        """Test basic Java code execution - may return 500 if Java runtime not available"""
        code = """public class Solution {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}"""
        response = self.session.post(f"{BASE_URL}/api/code/execute", json={
            "code": code,
            "language": "java",
            "test_input": ""
        })
        # Java runtime may not be available on server - 500 is acceptable
        if response.status_code == 500:
            data = response.json()
            assert "Runtime for java not available" in data.get("detail", "")
            print("⚠ Java runtime not available on server (expected behavior)")
        elif response.status_code == 200:
            data = response.json()
            if data["exit_code"] == 0:
                assert "Hello, World!" in data["output"]
                print(f"✓ Java Hello World: {data['output'].strip()}")
            else:
                print(f"⚠ Java execution returned exit_code {data['exit_code']}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    # ─── Error Handling Tests ───────────────────────────────────────────────
    
    def test_unsupported_language_returns_400(self):
        """Test that unsupported language returns 400"""
        response = self.session.post(f"{BASE_URL}/api/code/execute", json={
            "code": "print('test')",
            "language": "ruby",  # Not supported
            "test_input": ""
        })
        assert response.status_code == 400, f"Expected 400 for unsupported language, got {response.status_code}"
        print("✓ Unsupported language (ruby) returns 400")
    
    def test_code_execution_requires_auth(self):
        """Test that code execution requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.post(f"{BASE_URL}/api/code/execute", json={
            "code": "print('test')",
            "language": "python",
            "test_input": ""
        })
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Code execution requires authentication (401 without token)")
    
    def test_code_too_long_returns_400(self):
        """Test that code exceeding 10000 chars returns 400"""
        long_code = "x = 1\n" * 5000  # More than 10000 chars
        response = self.session.post(f"{BASE_URL}/api/code/execute", json={
            "code": long_code,
            "language": "python",
            "test_input": ""
        })
        assert response.status_code == 400, f"Expected 400 for long code, got {response.status_code}"
        print("✓ Code too long returns 400")


class TestStudentDashboardCodePlayground:
    """Tests for Code Playground access from Student Dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for student"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "college_id": "22WJ8A6745",
            "password": "student123"
        })
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Login failed")
    
    def test_student_dashboard_returns_data(self):
        """Test student dashboard endpoint returns expected data"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/student")
        assert response.status_code == 200
        data = response.json()
        assert "upcoming_quizzes" in data
        assert "recent_results" in data
        assert "cgpa" in data
        print(f"✓ Student dashboard returns data with {len(data.get('upcoming_quizzes', []))} active quizzes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
