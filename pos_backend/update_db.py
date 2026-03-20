import sqlite3

conn = sqlite3.connect("pos.db")
cursor = conn.cursor()

cursor.execute("""
ALTER TABLE products
ADD COLUMN low_stock_threshold INTEGER DEFAULT 0
""")

conn.commit()
conn.close()

print("Column added successfully.")