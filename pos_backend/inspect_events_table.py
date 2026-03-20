import sqlite3

conn = sqlite3.connect("pos.db")
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(events)")
columns = cursor.fetchall()

for col in columns:
    print(col)

conn.close()