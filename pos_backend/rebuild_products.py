from pos_backend.inventory_engine import InventoryEngine
import psycopg2
import os

def db():
    return psycopg2.connect(os.environ.get("DATABASE_URL"))


def rebuild_products(store_id):

    conn = db()
    cursor = conn.cursor()

    # -----------------------------
    # Load events for this store (EXPLICIT COLUMNS - FIXED)
    # -----------------------------
    cursor.execute("""
        SELECT 
            event_type,
            product_id,
            product_name_at_time,
            quantity,
            cost_at_time,
            price_at_time,
            tracks_stock
        FROM events
        WHERE store_id = %s
        ORDER BY event_id
    """, (store_id,))
    
    events = cursor.fetchall()

    engine = InventoryEngine()
    product_names = {}

    # -----------------------------
    # Replay events
    # -----------------------------
    for event in events:

        event_type = (event[0] or "").strip().lower()
        product_id = event[1]
        product_name = event[2]
        quantity = event[3] or 0
        cost = event[4] or 0
        price = event[5] or 0
        tracks_stock = event[6]

        if product_name:
            product_names[product_id] = product_name

        if event_type == "create":
            engine.create(
                product_id,
                quantity,
                cost,
                price,
                tracks_stock if tracks_stock is not None else True  # ✅ FIX
            )

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
                low_stock_threshold,
                is_active,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (
            product_id,
            store_id,
            name,
            p["stock"],
            p["cost"],
            p["price"],
            int(bool(p.get("tracks_stock", True)))
            0,
            1,
        ))

    conn.commit()
    conn.close()