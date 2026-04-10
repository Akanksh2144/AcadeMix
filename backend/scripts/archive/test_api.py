import httpx
import traceback
import sys

try:
    print("Sending code execution request...")
    resp = httpx.post(
        'http://localhost:8000/api/v1/auth/login',
        data={'username':'22wj8a0419@gniindia.org','password':'password'},
    )
    print("Auth:", resp.status_code, resp.text)
    if resp.status_code == 200:
        token = resp.json()['access_token']
        res = httpx.post(
            'http://localhost:8000/api/v1/code/execute',
            json={'language': 'python', 'code': 'print("Hello, World!")'},
            headers={'Authorization': f'Bearer {token}'}
        )
        print("Exec:", res.status_code, res.text)
except Exception as e:
    traceback.print_exc()
