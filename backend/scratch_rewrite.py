import re

filepath = "alembic/versions/35765b1d4c43_sync_missing_fields.py"
with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip_alter = False

header = """
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

def table_exists(table_name):
    bind = op.get_context().bind
    insp = Inspector.from_engine(bind)
    return insp.has_table(table_name)

def column_exists(table_name, column_name):
    bind = op.get_context().bind
    insp = Inspector.from_engine(bind)
    if not insp.has_table(table_name):
        return False
    columns = [c['name'] for c in insp.get_columns(table_name)]
    return column_name in columns
"""

i = 0
while i < len(lines):
    line = lines[i]
    if line.startswith("from alembic import op"):
        new_lines.append(header)
        i += 2
        continue
    
    if "op.create_table(" in line:
        match = re.search(r"op\.create_table\('([^']+)'", line)
        if match:
            table_name = match.group(1)
            new_lines.append(f"    if not table_exists('{table_name}'):\n")
            new_lines.append("    " + line)
            i += 1
            while i < len(lines) and not lines[i].startswith("    op.create_table(") and not lines[i].startswith("    op.create_index(") and not lines[i].startswith("    with "):
                new_lines.append("    " + lines[i])
                i += 1
            continue
            
    elif "op.create_index(" in line:
        match = re.search(r"op\.create_index\([^,]+,\s*'([^']+)'", line)
        if match:
            table_name = match.group(1)
            new_lines.append(f"    if not table_exists('{table_name}'):\n")
            new_lines.append("    " + line)
        else:
            new_lines.append("    try:\n")
            new_lines.append("    " + line)
            new_lines.append("    except Exception:\n")
            new_lines.append("        pass\n")
            
    elif "op.add_column(" in line:
        match = re.search(r"op\.add_column\('([^']+)',\s*sa\.Column\('([^']+)'", line)
        if match:
            table_name = match.group(1)
            col_name = match.group(2)
            new_lines.append(f"    if not column_exists('{table_name}', '{col_name}'):\n")
            new_lines.append("    " + line)
        else:
            new_lines.append(line)
            
    elif "op.alter_column(" in line or "op.drop_index(" in line:
        # skip these lines
        pass
    else:
        new_lines.append(line)
    i += 1

with open(filepath, "w", encoding="utf-8") as f:
    f.writelines(new_lines)
