import re
import ast

filepath = "alembic/versions/c611d5081891_sync_missing_fields_safe.py"
with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

header = """from alembic import op
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

new_lines = []
skip = False
i = 0
while i < len(lines):
    line = lines[i]
    if line.startswith("from alembic import op"):
        new_lines.append(header)
        i += 2
        continue
    
    # Strip alter_column blocks
    if "op.alter_column(" in line:
        skip = True
        i += 1
        continue
    if skip:
        if line.strip().endswith(")"):
            skip = False
        i += 1
        continue
        
    # Strip drop_index blocks
    if "op.drop_index(" in line:
        i += 1
        continue

    # Wrap create_table
    if "op.create_table(" in line:
        match = re.search(r"op\.create_table\('([^']+)'", line)
        if match:
            table_name = match.group(1)
            new_lines.append(f"    if not table_exists('{table_name}'):\n")
            new_lines.append("    " + line)
            i += 1
            while i < len(lines) and not (lines[i].strip().startswith("op.") or lines[i].strip().startswith("# ###")):
                new_lines.append("    " + lines[i])
                i += 1
            continue

    # Wrap create_index
    if "op.create_index(" in line:
        new_lines.append("    try:\n")
        new_lines.append("    " + line)
        new_lines.append("    except Exception:\n")
        new_lines.append("        pass\n")
        i += 1
        continue

    # Wrap add_column
    if "op.add_column(" in line:
        match = re.search(r"op\.add_column\('([^']+)',\s*sa\.Column\('([^']+)'", line)
        if match:
            table_name = match.group(1)
            col_name = match.group(2)
            new_lines.append(f"    if not column_exists('{table_name}', '{col_name}'):\n")
            new_lines.append("    " + line)
        else:
            new_lines.append(line)
        i += 1
        continue

    new_lines.append(line)
    i += 1

with open(filepath, "w", encoding="utf-8") as f:
    f.writelines(new_lines)
