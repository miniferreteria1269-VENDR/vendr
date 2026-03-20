import sqlite3

conn = sqlite3.connect("pos.db")
cursor = conn.cursor()

print("\n--- STORES TABLE SCHEMA ---\n")

cursor.execute("PRAGMA table_info(stores)")
columns = cursor.fetchall()

for col in columns:
    print(f"Column ID: {col[0]}")
    print(f"Name: {col[1]}")
    print(f"Type: {col[2]}")
    print(f"Not Null: {col[3]}")
    print(f"Default: {col[4]}")
    print(f"Primary Key: {col[5]}")
    print("-" * 30)

print("\n--- STORES DATA ---\n")

cursor.execute("SELECT * FROM stores")
rows = cursor.fetchall()

for row in rows:
    print(row)

conn.close()