# Alembic Migration Versions

This directory contains database migration scripts.
Place each migration as a separate Python file with:
- Revision ID (unique, e.g., `abc123def456`)
- Downgrade revision (previous revision or `None`)
- `upgrade()` function to apply changes
- `downgrade()` function to roll back changes
