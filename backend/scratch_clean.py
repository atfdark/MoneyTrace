import sqlite3
con = sqlite3.connect("moneytrace_test.db")
con.execute("DELETE FROM users WHERE email='admin@test.com'")
con.commit()
con.close()
