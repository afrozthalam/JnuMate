import sqlite3
conn = sqlite3.connect('hackmate.db')
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print('Tables:', tables)
for t in tables:
    tname = t[0]
    cols = conn.execute(f"PRAGMA table_info({tname})").fetchall()
    print(f"Table {tname}: {[c[1] for c in cols]}")
