import sqlite3
import os

DB_PATHS = [
    os.path.abspath("backend/moneytrace.db"),
    os.path.abspath("moneytrace.db")
]

TABLES_TO_CLEAR = [
    "transactions",
    "fraud_alerts",
    "recovery_cases",
    "investigation_cases",
    "investigator_chats",
    "investigator_notes",
    "case_playbook_steps",
    "case_evidence",
    "case_timeline_events",
    "scenario_runs",
    "audit_logs",
]

for db_path in DB_PATHS:
    if not os.path.exists(db_path):
        print(f"Skipping {db_path} (does not exist)")
        continue
    
    print(f"\n==========================================")
    print(f"Cleaning database: {db_path}")
    print(f"==========================================")
    
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    
    for table in TABLES_TO_CLEAR:
        try:
            cur.execute(f"DELETE FROM {table}")
            print(f"Cleared table: {table}")
        except sqlite3.OperationalError as e:
            print(f"Table {table} skipped: {e}")
            
    # Delete temporary simulation users and accounts
    try:
        cur.execute("DELETE FROM accounts WHERE account_number LIKE 'SIM%'")
        print("Removed temporary SIM accounts")
    except Exception as e:
        print(f"Accounts cleanup note: {e}")
        
    try:
        cur.execute("DELETE FROM users WHERE email LIKE 'sim_%'")
        print("Removed temporary simulation users")
    except Exception as e:
        print(f"Users cleanup note: {e}")

    # Unfreeze all accounts
    try:
        cur.execute("UPDATE accounts SET status='active'")
        print("Reset account status to active for all remaining accounts")
    except Exception as e:
        print(f"Status update note: {e}")

    con.commit()
    
    # Verification
    print("\nVerification counts:")
    for table in TABLES_TO_CLEAR:
        try:
            cur.execute(f"SELECT count(*) FROM {table}")
            cnt = cur.fetchone()[0]
            print(f"  {table}: {cnt} rows")
        except Exception:
            pass

    cur.execute("SELECT count(*) FROM users")
    print(f"  users remaining: {cur.fetchone()[0]}")
    cur.execute("SELECT count(*) FROM accounts")
    print(f"  accounts remaining: {cur.fetchone()[0]}")

    con.close()

print("\nDatabase cleaning completed successfully!")
