import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get('DATABASE_URL')
if not db_url: db_url = 'postgresql://postgres:postgres@localhost:5432/acadmix'

# Convert to sync driver assuming pg8000 is installed, otherwise standard psycopg2-binary
db_url = db_url.replace("postgresql+asyncpg", "postgresql")

engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        print("Connected! Checking table...")
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'activity_permissions'"))
        columns = res.fetchall()
        if columns:
            print("âœ… PASS: activity_permissions exists!")
            for col in columns:
                print(col)
        else:
            print("â Œ FAIL: activity_permissions missing!")
except Exception as e:
    print("Error:", e)
