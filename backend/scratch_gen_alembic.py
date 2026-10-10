import os
import subprocess

db_path = os.path.abspath("moneytrace_test.db").replace("\\", "/")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"

print("Generating alembic migration...")
subprocess.run(["alembic", "revision", "--autogenerate", "-m", "sync_missing_fields"], check=True)
print("Alembic autogenerate completed.")
