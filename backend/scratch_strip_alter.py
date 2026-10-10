import re

filepath = "alembic/versions/5d07626cb439_sync_missing_fields.py"
with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if line.strip().startswith("op.alter_column('"):
        skip = True
        continue
    if skip:
        if line.strip().startswith("existing_type=") or line.strip().startswith("type_=") or line.strip().startswith("existing_nullable="):
            continue
        if line.strip().endswith(")"):
            skip = False
            continue
        skip = False
    
    # Also drop index removal since it's redundant
    if line.strip().startswith("op.drop_index("):
        continue
        
    new_lines.append(line)

with open(filepath, "w", encoding="utf-8") as f:
    f.writelines(new_lines)
