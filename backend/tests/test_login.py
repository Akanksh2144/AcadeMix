from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_login(username, password):
    response = client.post("/api/auth/login", json={"college_id": username, "password": password})
    print(f"Login {username}: Status {response.status_code}")
    print(response.json())

print("Testing N001:")
test_login("N001", "nodal123")

print("\nTesting TPO001:")
test_login("TPO001", "tpo123")
