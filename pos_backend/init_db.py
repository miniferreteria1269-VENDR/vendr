import sqlite3

conn = sqlite3.connect("pos.db")
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    product_id INTEGER,
    product_name_at_time TEXT,
    quantity INTEGER,
    cost_at_time REAL,
    price_at_time REAL,
    ticket_id INTEGER,
    reason TEXT,
    event_datetime TEXT NOT NULL,
    device_id TEXT
);
""")

conn.commit()
conn.close()

print("Events table created successfully.")