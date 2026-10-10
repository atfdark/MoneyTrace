import os
import subprocess

db_path = os.path.abspath("moneytrace_test.db").replace("\\", "/")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"

print(f"Running alembic against {db_path}...")
subprocess.run(["alembic", "upgrade", "head"], check=True)
print("Alembic upgrade head completed successfully on fresh DB.")
