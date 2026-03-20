import sqlite3

conn = sqlite3.connect("pos.db")
cursor = conn.cursor()

cursor.execute("""
ALTER TABLE events
ADD COLUMN ticket_id INTEGER
""")

conn.commit()
conn.close()

print("ticket_id column added to events table.")