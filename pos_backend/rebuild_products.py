from inventory_engine import InventoryEngine
from db import db  # use your existing DB connection


def rebuild_products(store_id):

    conn = db()
    cursor = conn.cursor()

    # -----------------------------
    # Load events for this store
    # -----------------------------
    cursor.execute(
        "SELECT * FROM events WHERE store_id = %s ORDER BY event_id",
        (store_id,)
    )
    events = cursor.fetchall()

    engine = InventoryEngine()
    product_names = {}

    # -----------------------------
    # Replay events
    # -----------------------------
    for event in events:

        event_type = (event[2] or "").strip().lower()
        product_id = event[3]
        product_name = event[4]
        quantity = event[5] or 0
        cost = event[6] or 0
        price = event[7] or 0

        if product_name:
            product_names[product_id] = product_name

        if event_type == "create":
            engine.create(product_id, quantity, cost, price, True)

        elif event_type == "intake":
            engine.intake(product_id, quantity, cost, price)

        elif event_type == "sale":
            engine.sale(product_id, quantity)

        elif event_type == "loss":
            engine.loss(product_id, quantity)

        elif event_type == "price_change":
            engine.price_change(product_id, cost, price)

    # -----------------------------
    # Clear existing products
    # -----------------------------
    cursor.execute(
        "DELETE FROM products WHERE store_id = %s",
        (store_id,)
    )

    # -----------------------------
    # Rebuild products table
    # -----------------------------
    for product_id, p in engine.products.items():

        name = product_names.get(product_id, "Unknown")

        cursor.execute("""
            INSERT INTO products (
                product_id,
                store_id,
                name,
                stock,
                cost,
                price,
                tracks_stock,
                is_active,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (
            product_id,
            store_id,
            name,
            p["stock"],
            p["cost"],
            p["price"],
            1,
            1
        ))

    conn.commit()
    conn.close()