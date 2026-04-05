import os
import subprocess
import ast
import tempfile
import re
import sys

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="AcadeMix Code Runner")

# On Linux (container), apply resource limits; on Windows (local dev), skip.
IS_LINUX = sys.platform == "linux"

if IS_LINUX:
    import resource
    SANDBOX_UID = 1001
    SANDBOX_GID = 1001
    # 768MB is the sweet spot for a 1GB Fly machine (leaves room for kernel/Docker)
    MAX_MEMORY_BYTES = 768 * 1024 * 1024
    MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024  # 1 MB
    MAX_PROCESSES = 32
    # Compilation is CPU-heavy — 60s for g++/javac on shared VMs
    CPU_COMPILE = 60
    CPU_EXECUTE = 10


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
        r"require\s*\(", r"process\.", r"fs\.", r"child_process",
        r"eval\s*\(",
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
    "cpp": [],
    "sql": [r"(?i)\bATTACH\b", r"(?i)\bPRAGMA\b", r"(?i)\bDROP\b", r"(?i)\bDELETE\b", r"(?i)\bUPDATE\b", r"(?i)\bINSERT\b", r"(?i)\bALTER\b"]
}
_BLOCKED_PATTERNS["cpp"] = _BLOCKED_PATTERNS["c"]


def _validate_code(code: str, language: str):
    if language == "python":
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for name in node.names:
                        if name.name.split('.')[0] in ["os", "sys", "subprocess", "socket", "builtins", "ctypes", "signal"]:
                            raise HTTPException(status_code=400, detail=f"Blocked import: {name.name}")
                elif isinstance(node, ast.ImportFrom):
                    if node.module and node.module.split('.')[0] in ["os", "sys", "subprocess", "socket", "builtins", "ctypes", "signal"]:
                        raise HTTPException(status_code=400, detail=f"Blocked import: {node.module}")
                elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                    if node.func.id in ["eval", "exec", "open", "globals", "locals", "getattr", "setattr", "__import__"]:
                        raise HTTPException(status_code=400, detail=f"Blocked function: {node.func.id}")
                elif isinstance(node, ast.Name) and node.id in ["__builtins__", "__import__"]:
                    raise HTTPException(status_code=400, detail=f"Blocked identifier: {node.id}")
        except SyntaxError:
            pass  # Let the python runner catch syntax errors naturally
    else:
        patterns = _BLOCKED_PATTERNS.get(language, [])
        for pattern in patterns:
            match = re.search(pattern, code)
            if match:
                raise HTTPException(
                    status_code=400,
                    detail=f"Blocked: '{match.group()}' is not allowed for security reasons."
                )


def _make_sandbox_limits(cpu_seconds: int):
    """Return a preexec_fn that sets resource limits and drops to sandbox user."""
    if not IS_LINUX:
        return None

    def _fn():
        try:
            resource.setrlimit(resource.RLIMIT_DATA, (MAX_MEMORY_BYTES, MAX_MEMORY_BYTES))
            resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_BYTES))
            resource.setrlimit(resource.RLIMIT_NPROC, (MAX_PROCESSES, MAX_PROCESSES))
            resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds))
            os.setgid(SANDBOX_GID)
            os.setuid(SANDBOX_UID)
        except Exception:
            pass 

    return _fn


def _run_cmd(cmd, test_input="", wall_timeout=10, cpu_seconds=10, cwd=None):
    try:
        r = subprocess.run(
            cmd,
            input=test_input or None,
            capture_output=True,
            text=True,
            timeout=wall_timeout,
            cwd=cwd,
            preexec_fn=_make_sandbox_limits(cpu_seconds),
        )
        return r.stdout, r.stderr, r.returncode
    except subprocess.TimeoutExpired:
        return "", f"Time limit exceeded ({wall_timeout}s)", -1
    except Exception as e:
        return "", str(e), -1


def _run_compile(cmd, wall_timeout=60, cpu_seconds=60, cwd=None):
    try:
        r = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=wall_timeout,
            cwd=cwd,
            preexec_fn=_make_sandbox_limits(cpu_seconds),
        )
        return r.stdout, r.stderr, r.returncode
    except subprocess.TimeoutExpired:
        return "", f"Compilation timed out ({wall_timeout}s limit — try simplifying your code)", -1
    except Exception as e:
        return "", str(e), -1


@app.post("/run")
def run_code(req: ExecuteRequest):
    if len(req.code) > 15000: # Increased from 10k for heavy stress tests
        raise HTTPException(status_code=400, detail="Code too long")
    lang = req.language.lower()
    _validate_code(req.code, lang)

    with tempfile.TemporaryDirectory() as tmpdir:
        os.chmod(tmpdir, 0o777)

        # ── Python ────────────────────────────────────────────────────────────
        if lang == "python":
            py_cmd = "python" if os.name == "nt" else "python3"
            fp = os.path.join(tmpdir, "solution.py")
            with open(fp, "w") as f:
                f.write(req.code)
            os.chmod(fp, 0o644)
            out, err, code = _run_cmd([py_cmd, "-u", fp], req.test_input, wall_timeout=10, cpu_seconds=10, cwd=tmpdir)

        # ── JavaScript ────────────────────────────────────────────────────────
        elif lang == "javascript":
            fp = os.path.join(tmpdir, "solution.js")
            with open(fp, "w") as f:
                f.write(req.code)
            os.chmod(fp, 0o644)
            out, err, code = _run_cmd(["node", "--max-old-space-size=512", fp], req.test_input, wall_timeout=10, cpu_seconds=10, cwd=tmpdir)

        # ── Java ──────────────────────────────────────────────────────────────
        elif lang == "java":
            fp = os.path.join(tmpdir, "Solution.java")
            with open(fp, "w") as f:
                f.write(req.code)
            os.chmod(fp, 0o644)
            cout, cerr, ccode = _run_compile(["javac", fp], wall_timeout=30, cpu_seconds=30, cwd=tmpdir)
            if ccode != 0:
                return {"output": "", "error": cerr[:2000], "exit_code": ccode}
            
            out, err, code = _run_cmd(
                [
                    "java",
                    "-Xmx512m", "-Xms64m", "-Xss512k",
                    "-XX:TieredStopAtLevel=1",
                    "-XX:+UseSerialGC",
                    "-cp", tmpdir,
                    "Solution"
                ],
                req.test_input,
                wall_timeout=15, cpu_seconds=15, cwd=tmpdir
            )

        # ── C ─────────────────────────────────────────────────────────────────
        elif lang == "c":
            src = os.path.join(tmpdir, "solution.c")
            exe = os.path.join(tmpdir, "solution.out")
            with open(src, "w") as f:
                f.write(req.code)
            os.chmod(src, 0o644)
            # Use -O0 for maximum compilation speed
            cout, cerr, ccode = _run_compile(["gcc", "-O0", src, "-o", exe, "-lm"], wall_timeout=60, cpu_seconds=60, cwd=tmpdir)
            if ccode != 0:
                return {"output": "", "error": cerr[:2000], "exit_code": ccode}
            os.chmod(exe, 0o755)
            out, err, code = _run_cmd([exe], req.test_input, wall_timeout=10, cpu_seconds=10, cwd=tmpdir)

        # ── C++ ───────────────────────────────────────────────────────────────
        elif lang == "cpp":
            src = os.path.join(tmpdir, "solution.cpp")
            exe = os.path.join(tmpdir, "solution.out")
            with open(src, "w") as f:
                f.write(req.code)
            os.chmod(src, 0o644)
            # Use -O0 (no optimization) for much faster g++ builds
            cout, cerr, ccode = _run_compile(["g++", "-O0", "-std=c++17", src, "-o", exe, "-lm"], wall_timeout=60, cpu_seconds=60, cwd=tmpdir)
            if ccode != 0:
                return {"output": "", "error": cerr[:2000], "exit_code": ccode}
            os.chmod(exe, 0o755)
            out, err, code = _run_cmd([exe], req.test_input, wall_timeout=10, cpu_seconds=10, cwd=tmpdir)

        # ── SQL ───────────────────────────────────────────────────────────────
        elif lang == "sql":
            init_file = os.path.join(tmpdir, "init.sql")
            with open(init_file, "w") as f:
                f.write(req.test_input)
            
            query_file = os.path.join(tmpdir, "query.sql")
            with open(query_file, "w") as f:
                f.write(req.code)
                
            db_file = os.path.join(tmpdir, "test.db")
            
            # Form schema
            if req.test_input.strip():
                _run_cmd(["sqlite3", db_file, f".read {init_file}"], wall_timeout=5, cpu_seconds=5, cwd=tmpdir)
            
            # Run student query
            out, err, code = _run_cmd([
                "sqlite3", "-header", "-markdown", db_file, f".read {query_file}"
            ], wall_timeout=10, cpu_seconds=10, cwd=tmpdir)

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported language")

        if code != 0 and not out.strip():
            out = err
            err = ""

        return {"output": out[:5000], "error": err[:2000], "exit_code": code}


@app.get("/health")
def health():
    return {"status": "up", "sandbox": "enabled", "platform": sys.platform}
