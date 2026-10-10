import os
import subprocess

db_path = os.path.abspath("moneytrace_test.db").replace("\\", "/")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"

# Upgrade to 62bc1a4ced62
subprocess.run(["alembic", "upgrade", "62bc1a4ced62"], check=True)

# Generate new migration
subprocess.run(["alembic", "revision", "--autogenerate", "-m", "sync_missing_fields_safe"], check=True)
