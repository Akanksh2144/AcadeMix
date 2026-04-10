import ast

with open(r'c:\AcadMix\backend\server_new.py', 'r', encoding='utf-8') as f:
    source = f.read()

tree = ast.parse(source)

imports = """from typing import Optional, List
from pydantic import BaseModel, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone
from app import models
"""

classes = []
for node in tree.body:
    if isinstance(node, ast.ClassDef):
        # Only keep BaseModel subclasses
        is_pydantic = False
        for base in node.bases:
            if isinstance(base, ast.Name) and base.id == 'BaseModel':
                is_pydantic = True
        if is_pydantic:
            # Get source segment
            start_lineno = node.lineno - 1
            if hasattr(node, 'end_lineno') and node.end_lineno:
                end_lineno = node.end_lineno
            else:
                end_lineno = start_lineno + 1 # rough fallback
            
            lines = source.split('\n')[start_lineno:end_lineno]
            classes.append('\n'.join(lines))

with open(r'c:\AcadMix\backend\app\schemas.py', 'w', encoding='utf-8') as f:
    f.write(imports + '\n\n')
    for c in classes:
        f.write(c + '\n\n')

print("Extracted Pydantic models using AST.")
