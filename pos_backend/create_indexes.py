import sqlite3

conn = sqlite3.connect("pos.db")
cursor = conn.cursor()

cursor.execute("""
CREATE INDEX IF NOT EXISTS idx_events_store_time
ON events(store_id, event_datetime)
""")

cursor.execute("""
CREATE INDEX IF NOT EXISTS idx_events_product
ON events(product_id)
""")

conn.commit()
conn.close()

print("Indexes created successfully")