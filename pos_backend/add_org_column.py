import sqlite3

conn = sqlite3.connect("pos.db")
cursor = conn.cursor()

cursor.execute("""
ALTER TABLE stores
ADD COLUMN organization_id INTEGER;
""")

conn.commit()
conn.close()

print("Column added successfully.")