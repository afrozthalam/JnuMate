import sqlite3

conn = sqlite3.connect('hackmate.db')
conn.execute("UPDATE students SET name = 'manjari' WHERE r_id = 'R42695'")
conn.commit()
print("Updated student name to manjari")
row = conn.execute("SELECT * FROM students WHERE r_id = 'R42695'").fetchone()
print("Updated row:", row)
