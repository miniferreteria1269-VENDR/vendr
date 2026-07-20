import os

import psycopg2


def migrate() -> None:
    database_url = os.environ.get("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")

    conn = psycopg2.connect(database_url)

    try:
        cursor = conn.cursor()

        cursor.execute("""
            ALTER TABLE events
            ADD COLUMN IF NOT EXISTS client_event_id TEXT
        """)

        cursor.execute("""
            ALTER TABLE events
            ADD COLUMN IF NOT EXISTS device_id TEXT
        """)

        cursor.execute("""
            ALTER TABLE events
            ADD COLUMN IF NOT EXISTS client_created_at TEXT
        """)

        cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS
            idx_events_store_client_event_product
            ON events (store_id, client_event_id, product_id)
            WHERE client_event_id IS NOT NULL
        """)

        conn.commit()
        print("Offline sale fields added successfully.")

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
