import sqlite3
con = sqlite3.connect('moneytrace.db')
con.execute("UPDATE alembic_version SET version_num='62bc1a4ced62'")
con.commit()

con2 = sqlite3.connect('moneytrace_test.db')
con2.execute("UPDATE alembic_version SET version_num='62bc1a4ced62'")
con2.commit()
