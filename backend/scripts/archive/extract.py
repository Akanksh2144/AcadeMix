import re

with open(r'c:\AcadMix\backend\server_new.py', 'r', encoding='utf-8') as f:
    text = f.read()

# We need to extract the portion that contains Pydantic schemas. 
# Usually starts with class LoginRequest(BaseModel):
start_idx = text.find("class LoginRequest(BaseModel):")
# Ends before the first @app.get or async def get_current_academic_year or async def get_current_user?
# Actually, the original app/schemas.py ended right before the routes, around line 850.
end_idx = text.find("async def get_current_academic_year")
if end_idx == -1:
    end_idx = text.find("@app.get")

schemas_text = text[start_idx:end_idx]

imports = """from typing import Optional, List
from pydantic import BaseModel, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone
from app import models
"""

with open(r'c:\AcadMix\backend\app\schemas.py', 'w', encoding='utf-8') as f:
    f.write(imports + "\n" + schemas_text)

print("Extracted app/schemas.py successfully.")
