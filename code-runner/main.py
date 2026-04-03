import os
import subprocess
import tempfile
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="AcadeMix Code Runner")

class ExecuteRequest(BaseModel):
    language: str
    code: str
    test_input: str = ""

_BLOCKED_PATTERNS = {
    "python": [
        r"import\s+os\b(?!.*path)", r"from\s+os\s+import\b(?!.*path)",
        r"import\s+sys", r"from\s+sys\s+import",
        r"import\s+subprocess", r"from\s+subprocess\s+import",
        r"import\s+socket", r"from\s+socket\s+import",
        r"import\s+builtins", r"__import__", r"eval\s*\(", r"exec\s*\(",
        r"open\s*\(", r"globals\s*\(", r"locals\s*\(", r"getattr\s*\(", r"setattr\s*\("
    ],
    "javascript": [
        r"require\s*\(", r"import\s+", r"process\.", r"fs\.", r"child_process", r"eval\s*\(", r"setTimeout", r"setInterval"
    ],
    "java": [
        r"Runtime\.getRuntime", r"ProcessBuilder", r"System\.exit", r"java\.io\.File", r"java\.net\.", r"java\.nio\.file"
    ],
    "c": [
        r"#include\s*<unistd\.h>", r"#include\s*<sys/", r"\bsystem\s*\(", r"\bexecl?[vpe]*\s*\(", r"\bfork\s*\(", r"\bpopen\s*\(", r"\bsocket\s*\("
    ],
    "cpp": []
}
_BLOCKED_PATTERNS["cpp"] = _BLOCKED_PATTERNS["c"]

def _validate_code(code: str, language: str):
    patterns = _BLOCKED_PATTERNS.get(language, [])
    for pattern in patterns:
        match = re.search(pattern, code)
        if match:
            raise HTTPException(status_code=400, detail=f"Blocked: '{match.group()}' is not allowed for security reasons.")

def _run_cmd(cmd, test_input="", timeout=5, cwd=None):
    try:
        r = subprocess.run(cmd, input=test_input, capture_output=True, text=True, timeout=timeout, cwd=cwd)
        return r.stdout, r.stderr, r.returncode
    except subprocess.TimeoutExpired:
        return "", f"Execution timed out ({timeout} second limit)", -1
    except Exception as e:
        return "", str(e), -1

@app.post("/run")
def run_code(req: ExecuteRequest):
    if len(req.code) > 10000:
        raise HTTPException(status_code=400, detail="Code too long")
    lang = req.language.lower()
    _validate_code(req.code, lang)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        if lang == "python":
            py_cmd = "python" if os.name == "nt" else "python3"
            fp = os.path.join(tmpdir, "solution.py")
            with open(fp, "w") as f: f.write(req.code)
            out, err, code = _run_cmd([py_cmd, fp], req.test_input, timeout=5, cwd=tmpdir)
            
        elif lang == "javascript":
            fp = os.path.join(tmpdir, "solution.js")
            with open(fp, "w") as f: f.write(req.code)
            out, err, code = _run_cmd(["node", fp], req.test_input, timeout=5, cwd=tmpdir)
            
        elif lang == "java":
            fp = os.path.join(tmpdir, "Solution.java")
            with open(fp, "w") as f: f.write(req.code)
            cout, cerr, ccode = _run_cmd(["javac", fp], timeout=10, cwd=tmpdir)
            if ccode != 0: return {"output": "", "error": cerr[:2000], "exit_code": ccode}
            out, err, code = _run_cmd(["java", "-cp", tmpdir, "Solution"], req.test_input, timeout=5, cwd=tmpdir)
            
        elif lang == "c":
            src = os.path.join(tmpdir, "solution.c")
            exe = os.path.join(tmpdir, "solution.out")
            with open(src, "w") as f: f.write(req.code)
            cout, cerr, ccode = _run_cmd(["gcc", src, "-o", exe, "-lm"], timeout=10, cwd=tmpdir)
            if ccode != 0: return {"output": "", "error": cerr[:2000], "exit_code": ccode}
            out, err, code = _run_cmd([exe], req.test_input, timeout=5, cwd=tmpdir)
            
        elif lang == "cpp":
            src = os.path.join(tmpdir, "solution.cpp")
            exe = os.path.join(tmpdir, "solution.out")
            with open(src, "w") as f: f.write(req.code)
            cout, cerr, ccode = _run_cmd(["g++", src, "-o", exe, "-lm"], timeout=10, cwd=tmpdir)
            if ccode != 0: return {"output": "", "error": cerr[:2000], "exit_code": ccode}
            out, err, code = _run_cmd([exe], req.test_input, timeout=5, cwd=tmpdir)
        else:
            raise HTTPException(status_code=400, detail="Unsupported language")
            
        if code != 0 and not out:
            out = err
            err = ""
            
        return {"output": out[:3000], "error": err[:2000], "exit_code": code}

@app.get("/health")
def health():
    return {"status": "up"}
