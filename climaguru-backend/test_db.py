
import os
from sqlalchemy import create_engine, text

# Load from .env manually to be sure
# Actually, I'll just use the string directly to test
db_url = "mysql+pymysql://user:password@127.0.0.1:3306/climaguru"

try:
    engine = create_engine(db_url)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print(f"Connection successful: {result.scalar()}")
except Exception as e:
    print(f"Connection failed: {e}")
