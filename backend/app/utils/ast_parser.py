import ast
import re

def strip_comments_advanced(code: str, language: str) -> str:
    """
    Pre-Flight AST Parsing: Immunizes against prompt-injections hidden in comments 
    without destroying string literals. Essential for secure Code Execution pipelines.
    """
    if language.lower() in ("python", "py"):
        try:
            parsed = ast.parse(code)
            # Rip out module, class, and function-level docstrings securely
            for node in ast.walk(parsed):
                if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.AsyncFunctionDef, ast.Module)):
                    if ast.get_docstring(node) and len(node.body) > 0:
                        if isinstance(node.body[0], ast.Expr) and isinstance(node.body[0].value, ast.Constant):
                            node.body.pop(0)
            return ast.unparse(parsed)
        except Exception:
            pass # Fallback to regex if syntax is incomplete
            
    # Fallback for non-Python languages
    return re.sub(r'//.*|/\*[\s\S]*?\*/|#.*', '', code, flags=re.DOTALL)
