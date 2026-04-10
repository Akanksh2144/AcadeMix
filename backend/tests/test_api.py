import requests
import json

# Login
login = requests.post('http://localhost:8001/api/auth/login', json={
    'college_id': '22WJ8A6745', 'password': 'student123'
})
token = login.json().get('access_token', '')
headers = {'Authorization': f'Bearer {token}'}

tests = [
    ("python", 'print("Hello from Python")'),
    ("javascript", 'console.log("Hello from JS")'),
    ("c", '#include <stdio.h>\nint main() { printf("Hello from C\\n"); return 0; }'),
    ("cpp", '#include <iostream>\nusing namespace std;\nint main() { cout << "Hello from C++" << endl; return 0; }'),
]

for lang, code in tests:
    r = requests.post('http://localhost:8001/api/code/execute', json={
        'code': code, 'language': lang, 'test_input': ''
    }, headers=headers)
    d = r.json()
    status = "OK" if d['exit_code'] == 0 else "FAIL"
    print(f"[{status}] {lang:12s} -> output: {d['output'].strip()!r:40s} error: {d['error']!r}")
