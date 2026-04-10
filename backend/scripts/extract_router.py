import ast
import re

server_path = 'c:\\AcadMix\\backend\\server.py'

def extract_routes(prefixes, router_name):
    with open(server_path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    tree = ast.parse(code)
    lines = code.split('\n')
    
    route_nodes = []
    
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for dec in node.decorator_list:
                if isinstance(dec, ast.Call) and getattr(dec.func, 'value', None):
                    if getattr(dec.func.value, 'id', '') == 'app':
                        if dec.args and isinstance(dec.args[0], ast.Constant):
                            path = dec.args[0].value
                            for p in prefixes:
                                if path.startswith(p):
                                    route_nodes.append(node)
                                    break
                                
    # Grab the source code for these nodes
    extracted_code = []
    drops = []
    
    for node in route_nodes:
        start = node.lineno
        if node.decorator_list:
            start = min(d.lineno for d in node.decorator_list)
        while start > 1 and not lines[start-2].strip():
            start -= 1
        end = node.end_lineno
        
        drops.append((start, end))
        
        node_lines = lines[start-1:end]
        extracted_code.append('\n'.join(node_lines).replace('@app.', '@router.'))
        
    router_code = f"""from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from database import get_db
from app.core.security import get_current_user
from app.core.deps import require_role
from app import models
import server as server_schemas # fallback for pydantic models

router = APIRouter()

""" + '\n\n'.join(extracted_code)

    router_path = f"c:\\AcadMix\\backend\\app\\routers\\{router_name}.py"
    with open(router_path, "w", encoding="utf-8") as f:
        f.write(router_code)
        
    # Now slice from server.py
    drops.sort(key=lambda x: x[0], reverse=True)
    new_lines = list(lines)
    for s, e in drops:
        del new_lines[s-1:e]
        
    # Wire it
    wired = False
    for i, line in enumerate(new_lines):
        if "from app.routers import " in line and router_name not in line:
            new_lines[i] = line + f", {router_name}"
        if "app.include_router(" in line and not wired:
            new_lines.insert(i, f"app.include_router({router_name}.router, prefix=\"/api\", tags=[\"{router_name}\"])")
            wired = True
            
    with open(server_path, "w", encoding="utf-8") as f:
        f.write('\n'.join(new_lines))
        
    print(f"Extracted {len(route_nodes)} routes into {router_name}.py")

if __name__ == "__main__":
    import sys
    args = sys.argv[1:]
    name = args[0]
    prefixes = args[1:]
    extract_routes(prefixes, name)
