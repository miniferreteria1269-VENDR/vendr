import sqlite3
import os

# Show which database file is being used
db_path = os.path.abspath("pos.db")
print("Using database:", db_path)

conn = sqlite3.connect("pos.db")
cursor = conn.cursor()

print("\nTables in database:")

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

for table in tables:
    print(table[0])

print("\nProducts table contents:")

cursor.execute("SELECT * FROM products")
rows = cursor.fetchall()

if not rows:
    print("Products table is empty.")
else:
    for row in rows:
        print(row)

conn.close()