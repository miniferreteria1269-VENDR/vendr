from pos_backend.inventory_engine import InventoryEngine

import os
import psycopg2


def db():
    return psycopg2.connect(
        os.environ.get("DATABASE_URL")
    )


def _apply_stock_delta(
    engine: InventoryEngine,
    product_id: int,
    quantity_delta
):
    """
    Apply a stock-only movement without changing
    product cost or price.

    Used for:
    - returns
    - transfers
    - stock adjustments
    """

    product = engine.products.get(product_id)

    if product is None:
        print(
            "REBUILD WARNING:",
            f"Product {product_id} received a stock "
            "movement before its create event"
        )
        return

    tracks_stock = bool(
        product.get("tracks_stock", True)
    )

    if not tracks_stock:
        return

    current_stock = (
        product.get("stock") or 0
    )

    product["stock"] = (
        current_stock + quantity_delta
    )


def rebuild_products(store_id: int):

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        # ---------------------------------------------
        # LOAD ALL EVENTS FOR THIS STORE
        # ---------------------------------------------
        cursor.execute(
            """
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
            """,
            (
                store_id,
            )
        )

        events = cursor.fetchall()

        engine = InventoryEngine()

        # Canonical projected attributes that are not
        # maintained directly by InventoryEngine.
        product_names = {}
        low_stock_thresholds = {}
        lst_reviewed_values = {}

        # ---------------------------------------------
        # REPLAY EVENTS
        # ---------------------------------------------
        for event in events:

            event_type = str(
                event[0] or ""
            ).strip().lower()

            product_id = event[1]
            product_name = event[2]

            quantity = (
                event[3]
                if event[3] is not None
                else 0
            )

            cost = (
                event[4]
                if event[4] is not None
                else 0
            )

            price = (
                event[5]
                if event[5] is not None
                else 0
            )

            event_tracks_stock = event[6]

            # -----------------------------------------
            # CREATE
            # -----------------------------------------
            if event_type == "create":

                tracks_stock = (
                    bool(event_tracks_stock)
                    if event_tracks_stock is not None
                    else True
                )

                engine.create(
                    product_id,
                    quantity,
                    cost,
                    price,
                    tracks_stock
                )

                product_names[product_id] = (
                    str(product_name).strip()
                    if product_name
                    else "Unknown"
                )

                low_stock_thresholds[
                    product_id
                ] = 0

                lst_reviewed_values[
                    product_id
                ] = False

            # -----------------------------------------
            # INTAKE
            # -----------------------------------------
            elif event_type == "intake":

                if product_id not in engine.products:
                    print(
                        "REBUILD WARNING:",
                        f"Skipping intake for unknown "
                        f"product {product_id}"
                    )
                    continue

                engine.intake(
                    product_id,
                    quantity,
                    cost,
                    price
                )

            # -----------------------------------------
            # SALE
            # -----------------------------------------
            elif event_type == "sale":

                if product_id not in engine.products:
                    print(
                        "REBUILD WARNING:",
                        f"Skipping sale for unknown "
                        f"product {product_id}"
                    )
                    continue

                engine.sale(
                    product_id,
                    quantity
                )

            # -----------------------------------------
            # CUSTOMER RETURN
            # -----------------------------------------
            elif event_type == "return":

                _apply_stock_delta(
                    engine,
                    product_id,
                    quantity
                )

            # -----------------------------------------
            # LOSS
            # -----------------------------------------
            elif event_type == "loss":

                if product_id not in engine.products:
                    print(
                        "REBUILD WARNING:",
                        f"Skipping loss for unknown "
                        f"product {product_id}"
                    )
                    continue

                engine.loss(
                    product_id,
                    quantity
                )

            # -----------------------------------------
            # PRICE CHANGE
            # -----------------------------------------
            elif event_type == "price_change":

                if product_id not in engine.products:
                    print(
                        "REBUILD WARNING:",
                        f"Skipping price change for "
                        f"unknown product {product_id}"
                    )
                    continue

                engine.price_change(
                    product_id,
                    cost,
                    price
                )

            # -----------------------------------------
            # TRANSFER INTO STORE
            # -----------------------------------------
            elif event_type == "transfer_in":

                _apply_stock_delta(
                    engine,
                    product_id,
                    quantity
                )

            # -----------------------------------------
            # TRANSFER OUT OF STORE
            # -----------------------------------------
            elif event_type == "transfer_out":

                _apply_stock_delta(
                    engine,
                    product_id,
                    -quantity
                )

            # -----------------------------------------
            # POSITIVE STOCK ADJUSTMENT
            # -----------------------------------------
            elif (
                event_type
                == "stock_adjustment_positive"
            ):

                _apply_stock_delta(
                    engine,
                    product_id,
                    quantity
                )

            # -----------------------------------------
            # NEGATIVE STOCK ADJUSTMENT
            # -----------------------------------------
            elif (
                event_type
                == "stock_adjustment_negative"
            ):

                _apply_stock_delta(
                    engine,
                    product_id,
                    -quantity
                )

            # -----------------------------------------
            # PRODUCT NAME CHANGE
            # -----------------------------------------
            elif (
                event_type
                == "product_name_change"
            ):

                if product_name:
                    product_names[product_id] = (
                        str(product_name).strip()
                    )

            # -----------------------------------------
            # LOW-STOCK THRESHOLD CHANGE
            # -----------------------------------------
            elif event_type == "lst_change":

                threshold = int(
                    quantity or 0
                )

                if threshold < 0:
                    threshold = 0

                low_stock_thresholds[
                    product_id
                ] = threshold

                lst_reviewed_values[
                    product_id
                ] = threshold > 0

            # -----------------------------------------
            # UNKNOWN EVENT
            # -----------------------------------------
            else:
                print(
                    "REBUILD WARNING:",
                    f"Unsupported event type "
                    f"'{event_type}' for product "
                    f"{product_id}"
                )

        # ---------------------------------------------
        # REPLACE PRODUCT PROJECTION
        # ---------------------------------------------
        cursor.execute(
            """
            DELETE FROM products
            WHERE store_id = %s
            """,
            (
                store_id,
            )
        )

        # ---------------------------------------------
        # REBUILD PRODUCTS TABLE
        # ---------------------------------------------
        for product_id, product in (
            engine.products.items()
        ):

            name = product_names.get(
                product_id,
                "Unknown"
            )

            low_stock_threshold = (
                low_stock_thresholds.get(
                    product_id,
                    0
                )
            )

            lst_reviewed = (
                lst_reviewed_values.get(
                    product_id,
                    False
                )
            )

            tracks_stock_value = (
                1
                if bool(
                    product.get(
                        "tracks_stock",
                        True
                    )
                )
                else 0
            )

            cursor.execute(
                """
                INSERT INTO products (
                    product_id,
                    store_id,
                    name,
                    stock,
                    cost,
                    price,
                    tracks_stock,
                    low_stock_threshold,
                    lst_reviewed,
                    is_active,
                    created_at
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    NOW()
                )
                """,
                (
                    product_id,
                    store_id,
                    name,
                    product.get(
                        "stock",
                        0
                    ),
                    product.get(
                        "cost",
                        0
                    ),
                    product.get(
                        "price",
                        0
                    ),
                    tracks_stock_value,
                    low_stock_threshold,
                    lst_reviewed,
                    1
                )
            )

        conn.commit()

        print(
            "REBUILD COMPLETE:",
            f"Store {store_id}, "
            f"{len(engine.products)} products"
        )

    except Exception as error:

        if conn:
            conn.rollback()

        print(
            "REBUILD PRODUCTS ERROR:",
            repr(error)
        )

        raise

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()
