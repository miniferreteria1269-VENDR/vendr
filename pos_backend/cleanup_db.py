import sqlite3

conn = sqlite3.connect("pos.db")
cursor = conn.cursor()

cursor.execute("DROP TABLE IF EXISTS test_items")

conn.commit()
conn.close()

print("Cleanup complete.")