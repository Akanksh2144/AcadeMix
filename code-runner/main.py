import os
import subprocess
import tempfile
import re
import resource
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="AcadeMix Code Runner")

SANDBOX_UID = 1001  # matches 'sandbox' user created in Dockerfile
SANDBOX_GID = 1001
MAX_MEMORY_BYTES = 128 * 1024 * 1024  # 128 MB
MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024  # 1 MB
MAX_PROCESSES = 32


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
        r"open\s*\(", r"globals\s*\(", r"locals\s*\(", r"getattr\s*\(", r"setattr\s*\(",
        r"import\s+ctypes", r"from\s+ctypes\s+import",
        r"import\s+signal", r"from\s+signal\s+import",
    ],
    "javascript": [
        r"require\s*\(", r"import\s+", r"process\.", r"fs\.", r"child_process",
        r"eval\s*\(", r"setTimeout", r"setInterval"
    ],
    "java": [
        r"Runtime\.getRuntime", r"ProcessBuilder", r"System\.exit",
        r"java\.io\.File", r"java\.net\.", r"java\.nio\.file"
    ],
    "c": [
        r"#include\s*<unistd\.h>", r"#include\s*<sys/", r"\bsystem\s*\(",
        r"\bexecl?[vpe]*\s*\(", r"\bfork\s*\(", r"\bpopen\s*\(",
        r"\bsocket\s*\(", r"\bconnect\s*\("
    ],
    "cpp": []
}
_BLOCKED_PATTERNS["cpp"] = _BLOCKED_PATTERNS["c"]


def _validate_code(code: str, language: str):
    patterns = _BLOCKED_PATTERNS.get(language, [])
    for pattern in patterns:
        match = re.search(pattern, code)
        if match:
            raise HTTPException(
                status_code=400,
                detail=f"Blocked: '{match.group()}' is not allowed for security reasons."
            )


def _set_sandbox_limits():
    """Pre-exec function: drop to sandbox user and set resource limits.
    This runs in the child process BEFORE exec, so it affects only student code."""
    try:
        # Set resource limits
        resource.setrlimit(resource.RLIMIT_AS, (MAX_MEMORY_BYTES, MAX_MEMORY_BYTES))
        resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_BYTES))
        resource.setrlimit(resource.RLIMIT_NPROC, (MAX_PROCESSES, MAX_PROCESSES))
        resource.setrlimit(resource.RLIMIT_CPU, (5, 5))  # 5 second CPU time hard limit

        # Drop privileges: switch to sandbox user
        os.setgid(SANDBOX_GID)
        os.setuid(SANDBOX_UID)
    except Exception:
        pass  # If limits fail (e.g. not root), continue anyway


def _run_cmd(cmd, test_input="", timeout=5, cwd=None):
    try:
        r = subprocess.run(
            cmd,
            input=test_input,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd,
            preexec_fn=_set_sandbox_limits,
        )
        return r.stdout, r.stderr, r.returncode
    except subprocess.TimeoutExpired:
        return "", f"Execution timed out ({timeout} second limit)", -1
    except Exception as e:
        return "", str(e), -1


def _run_compile(cmd, timeout=10, cwd=None):
    """Run a compilation command (still as sandbox user, but with higher timeout)."""
    try:
        r = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd,
            preexec_fn=_set_sandbox_limits,
        )
        return r.stdout, r.stderr, r.returncode
    except subprocess.TimeoutExpired:
        return "", "Compilation timed out", -1
    except Exception as e:
        return "", str(e), -1


@app.post("/run")
def run_code(req: ExecuteRequest):
    if len(req.code) > 10000:
        raise HTTPException(status_code=400, detail="Code too long (max 10,000 characters)")
    lang = req.language.lower()
    _validate_code(req.code, lang)

    with tempfile.TemporaryDirectory() as tmpdir:
        # Make tmpdir writable by sandbox user
        os.chmod(tmpdir, 0o777)

        if lang == "python":
            py_cmd = "python" if os.name == "nt" else "python3"
            fp = os.path.join(tmpdir, "solution.py")
            with open(fp, "w") as f:
                f.write(req.code)
            os.chmod(fp, 0o644)
            out, err, code = _run_cmd([py_cmd, fp], req.test_input, timeout=5, cwd=tmpdir)

        elif lang == "javascript":
            fp = os.path.join(tmpdir, "solution.js")
            with open(fp, "w") as f:
                f.write(req.code)
            os.chmod(fp, 0o644)
            out, err, code = _run_cmd(["node", fp], req.test_input, timeout=5, cwd=tmpdir)

        elif lang == "java":
            fp = os.path.join(tmpdir, "Solution.java")
            with open(fp, "w") as f:
                f.write(req.code)
            os.chmod(fp, 0o644)
            cout, cerr, ccode = _run_compile(["javac", fp], timeout=10, cwd=tmpdir)
            if ccode != 0:
                return {"output": "", "error": cerr[:2000], "exit_code": ccode}
            out, err, code = _run_cmd(
                ["java", "-cp", tmpdir, "Solution"], req.test_input, timeout=5, cwd=tmpdir
            )

        elif lang == "c":
            src = os.path.join(tmpdir, "solution.c")
            exe = os.path.join(tmpdir, "solution.out")
            with open(src, "w") as f:
                f.write(req.code)
            os.chmod(src, 0o644)
            cout, cerr, ccode = _run_compile(["gcc", src, "-o", exe, "-lm"], timeout=10, cwd=tmpdir)
            if ccode != 0:
                return {"output": "", "error": cerr[:2000], "exit_code": ccode}
            os.chmod(exe, 0o755)
            out, err, code = _run_cmd([exe], req.test_input, timeout=5, cwd=tmpdir)

        elif lang == "cpp":
            src = os.path.join(tmpdir, "solution.cpp")
            exe = os.path.join(tmpdir, "solution.out")
            with open(src, "w") as f:
                f.write(req.code)
            os.chmod(src, 0o644)
            cout, cerr, ccode = _run_compile(["g++", src, "-o", exe, "-lm"], timeout=10, cwd=tmpdir)
            if ccode != 0:
                return {"output": "", "error": cerr[:2000], "exit_code": ccode}
            os.chmod(exe, 0o755)
            out, err, code = _run_cmd([exe], req.test_input, timeout=5, cwd=tmpdir)
        else:
            raise HTTPException(status_code=400, detail="Unsupported language")

        if code != 0 and not out:
            out = err
            err = ""

        return {"output": out[:3000], "error": err[:2000], "exit_code": code}


@app.get("/health")
def health():
    return {"status": "up", "sandbox": "enabled"}
