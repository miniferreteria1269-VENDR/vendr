import sqlite3

conn = sqlite3.connect("pos.db")
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY,
    store_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    stock INTEGER DEFAULT 0,
    cost REAL,
    price REAL,
    tracks_stock INTEGER NOT NULL,
    is_active INTEGER NOT NULL,
    created_at TEXT NOT NULL
);
""")

conn.commit()
conn.close()

print("Products table created successfully.")