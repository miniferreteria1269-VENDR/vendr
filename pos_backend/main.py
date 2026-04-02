from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pos_backend.rebuild_products import rebuild_products

from datetime import datetime, timezone
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from fastapi import UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import psycopg2
app = FastAPI()

REQUIRED_COLUMNS = [
    "name",
    "initial_stock",
    "cost",
    "price",
    "tracks_stock",
    "low_stock_threshold"
]






app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def db():
    return psycopg2.connect(os.environ.get("DATABASE_URL"))

def init_db():

    conn = db()
    cursor = conn.cursor()

    # USERS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        store_id INTEGER,
        created_at TEXT
    )
    """)

    # STORES
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stores (
        store_id SERIAL PRIMARY KEY,
        name TEXT,
        created_at TEXT,
        organization_id INTEGER
    )
    """)

    # PRODUCTS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        product_id INTEGER,
        store_id INTEGER,
        name TEXT,
        stock INTEGER,
        cost REAL,
        price REAL,
        tracks_stock INTEGER,
        is_active INTEGER,
        low_stock_threshold INTEGER DEFAULT 0,
        created_at TEXT
    )
    """)

    # EVENTS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        event_id SERIAL PRIMARY KEY,
        store_id INTEGER,
        event_type TEXT,
        product_id INTEGER,
        product_name_at_time TEXT,
        quantity INTEGER,
        cost_at_time REAL,
        price_at_time REAL,
        event_datetime TEXT,
        ticket_id INTEGER
    )
    """)

    conn.commit()
    conn.close()
@app.on_event("startup")
def startup():
    init_db()

class SaleItem(BaseModel):
    product_id: int
    quantity: int
    price: float  # 🔥 REQUIRED


class SaleTicket(BaseModel):
    store_id: int
    items: List[SaleItem]


class IntakeItem(BaseModel):
    product_id: int
    quantity: int
    cost: float
    price: float


class IntakeTicket(BaseModel):
    store_id: int
    items: List[IntakeItem]
    paid: bool = False

class CashEventRequest(BaseModel):
    store_id: int
    amount: float
    type: str  # "revenue" or "expense"
    category: str
    note: Optional[str] = None

class ReturnItem(BaseModel):
    product_id: int
    quantity: int
    cost: float
    price: float


class ReturnRequest(BaseModel):
    store_id: int
    amount: float
    items: List[ReturnItem] = []
    note: Optional[str] = ""

class LoginRequest(BaseModel):
    email: str
    password: str

@app.get("/")
def root():
    return {"message": "POS backend is alive"}


# -----------------------------
# STORES
# -----------------------------

@app.post("/create-store/{name}")
def create_store(name: str, organization_id: int = None):

    conn = db()
    cursor = conn.cursor()

    created_at = datetime.now(timezone.utc).isoformat()

    try:
        cursor.execute(
            "INSERT INTO stores (name, created_at, organization_id) VALUES (%s, %s, %s)",
            (name, created_at, organization_id)
        )
        conn.commit()
        message = "store created"

    except Exception as e:
        conn.close()
        return {"error": str(e)}

    conn.close()

    return {"status": message, "name": name}


@app.get("/stores")
def get_stores():

    conn = db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM stores")

    rows = cursor.fetchall()
    conn.close()

    return {"stores": rows}


# -----------------------------
# PRODUCT CREATION
# -----------------------------

@app.post("/create-product")
def create_product(
    store_id: int,
    name: str,
    initial_stock: int,
    cost: float,
    price: float,
    tracks_stock: bool = True,
    low_stock_threshold: int = 0
):

    conn = db()
    cursor = conn.cursor()

    # -----------------------------
    # Normalize name
    # -----------------------------
    if not name or str(name).strip().lower() in ["", "none", "nan"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid product name")

    name = name.strip()
    name_key = name.lower()

    # -----------------------------
    # Prevent duplicates (EVENT-BASED)
    # -----------------------------
    cursor.execute("""
        SELECT 1
        FROM events
        WHERE store_id = %s
        AND event_type = 'create'
        AND LOWER(product_name_at_time) = LOWER(%s)
    """, (store_id, name_key))

    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Product already exists")

    # -----------------------------
    # Generate next product_id (EVENT-BASED)
    # -----------------------------
    cursor.execute("""
        SELECT COALESCE(MAX(product_id), 0)
        FROM events
        WHERE store_id = %s
    """, (store_id,))

    product_id = cursor.fetchone()[0] + 1

    now = datetime.now(timezone.utc).isoformat()

    # -----------------------------
    # CREATE EVENT (NOT direct product insert)
    # -----------------------------
    cursor.execute("""
        INSERT INTO events (
            store_id,
            event_type,
            product_id,
            product_name_at_time,
            quantity,
            cost_at_time,
            price_at_time,
            tracks_stock,
            low_stock_threshold,
            event_datetime
        )
        VALUES (%s, 'create', %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        store_id,
        product_id,
        name,
        initial_stock,
        cost,
        price,
        tracks_stock,
        low_stock_threshold,
        now
    ))

    conn.commit()
    conn.close()

    # -----------------------------
    # Rebuild products table
    # -----------------------------
    from pos_backend.rebuild_products import rebuild_products
    rebuild_products(store_id)

    return {"product_id": product_id}
# -----------------------------
# SALES
# -----------------------------

@app.post("/sale")
def sale_product(store_id: int, product_id: int, quantity: int):

    conn = db()
    cursor = conn.cursor()

    now = datetime.now(timezone.utc).isoformat()

    # -----------------------------
    # Get product snapshot + tracks_stock
    # -----------------------------
    cursor.execute("""
        SELECT name, cost, price, tracks_stock
        FROM products
        WHERE product_id = %s AND store_id = %s
    """, (product_id, store_id))

    product = cursor.fetchone()

    if product is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")

    name, cost, price, tracks_stock = product

    # Normalize tracks_stock
    tracks_stock_bool = True if tracks_stock == 1 else False

    # -----------------------------
    # Write event (ALWAYS)
    # -----------------------------
    cursor.execute("""
        INSERT INTO events (
            store_id,
            event_type,
            product_id,
            product_name_at_time,
            quantity,
            cost_at_time,
            price_at_time,
            event_datetime
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        store_id,
        "sale",
        product_id,
        name,
        quantity,
        cost,
        price,
        now
    ))

    # -----------------------------
    # Update stock ONLY if tracked
    # (ALLOW NEGATIVE)
    # -----------------------------
    if tracks_stock_bool:
        cursor.execute("""
            UPDATE products
            SET stock = COALESCE(stock, 0) - %s
            WHERE product_id = %s
            AND store_id = %s
        """, (
            quantity,
            product_id,
            store_id
        ))

    conn.commit()
    conn.close()

    return {"message": "Sale recorded"}
# -----------------------------
# SALE TICKET
# -----------------------------

@app.post("/sale-ticket")
def sale_ticket(ticket: SaleTicket):

    conn = db()
    cursor = conn.cursor()

    print("🔥 SALE ENDPOINT HIT")

    cursor.execute("SELECT MAX(ticket_id) FROM events")
    result = cursor.fetchone()[0]
    ticket_id = 1 if result is None else result + 1

    now = datetime.now(timezone.utc).isoformat()

    total_revenue = 0.0

    for item in ticket.items:

        cursor.execute("""
            SELECT name, cost
            FROM products
            WHERE product_id = %s AND store_id = %s
        """, (item.product_id, ticket.store_id))

        product = cursor.fetchone()

        if not product:
            raise ValueError("Product not found")

        name, cost = product

        # 🔥 USE DISCOUNTED PRICE FROM FRONTEND (ROUNDED)
        price = round(float(item.price), 2)

        line_total = round(price * item.quantity, 2)

        # INSERT EVENT
        cursor.execute("""
            INSERT INTO events
            (store_id, event_type, product_id, product_name_at_time,
            quantity, cost_at_time, price_at_time, event_datetime, ticket_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            ticket.store_id,
            "sale",
            item.product_id,
            name,
            item.quantity,
            cost,
            price,
            now,
            ticket_id
        ))

        # ACCUMULATE TOTAL SAFELY
        total_revenue += line_total

        # UPDATE STOCK
        cursor.execute("""
            UPDATE products
            SET stock = stock - %s
            WHERE product_id = %s
            AND store_id = %s
            AND tracks_stock = 1
        """, (item.quantity, item.product_id, ticket.store_id))

    # 🔥 FINAL ROUNDING (CRITICAL)
    total_revenue = round(total_revenue, 2)

    # -----------------------------
    # INSERT CASH EVENT
    # -----------------------------

    print("💰 INSERTING CASH EVENT:", total_revenue)

    cursor.execute("""
        SELECT organization_id
        FROM stores
        WHERE store_id = %s
    """, (ticket.store_id,))

    result = cursor.fetchone()
    org_id = result[0] if result and result[0] is not None else None

    cursor.execute("""
        INSERT INTO cash_events (
            organization_id,
            store_id,
            type,
            direction,
            amount,
            note,
            reference_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        org_id,
        ticket.store_id,
        "sale",
        1,
        total_revenue,
        "POS sale",
        ticket_id
    ))

    conn.commit()
    conn.close()

    return {"ticket_id": ticket_id}
# -----------------------------
# INTAKE
# -----------------------------

@app.post("/intake")
def intake_product(store_id:int,product_id:int,quantity:int,cost:float,price:float):

    conn=db()
    cursor=conn.cursor()

    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        SELECT name FROM products
        WHERE product_id=%s AND store_id=%s
    """,(product_id,store_id))

    name=cursor.fetchone()[0]

    cursor.execute("""
        INSERT INTO events
        (store_id,event_type,product_id,product_name_at_time,
        quantity,cost_at_time,price_at_time,event_datetime)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """,(store_id,"intake",product_id,name,quantity,cost,price,now))

    cursor.execute("""
        UPDATE products
        SET stock = stock + %s, cost=%s, price=%s
        WHERE product_id=%s 
        AND store_id=%s 
        AND tracks_stock = 1
    """,(quantity,cost,price,product_id,store_id))

    conn.commit()
    conn.close()

    return {"message":"Inventory updated"}


# -----------------------------
# LOSS
# -----------------------------

@app.post("/loss")
def record_loss(store_id:int,product_id:int,quantity:int):

    conn=db()
    cursor=conn.cursor()

    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        INSERT INTO events
        (store_id,event_type,product_id,product_name_at_time,
        quantity,event_datetime)
        VALUES (%s, %s, %s, %s, %s, %s)
    """,(store_id,"loss",product_id,None,quantity,now))

    cursor.execute("""
        UPDATE products
        SET stock = stock - %s
        WHERE product_id=%s AND store_id=%s
    """,(quantity,product_id,store_id))

    conn.commit()
    conn.close()

    return {"message":"Loss recorded"}


# -----------------------------
# PRICE CHANGE
# -----------------------------

@app.post("/price-change")
def change_price(store_id:int,product_id:int,cost:float,price:float):

    conn=db()
    cursor=conn.cursor()

    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        SELECT name FROM products
        WHERE product_id=%s AND store_id=%s
    """,(product_id,store_id))

    name=cursor.fetchone()[0]

    cursor.execute("""
        INSERT INTO events
        (store_id,event_type,product_id,product_name_at_time,
        cost_at_time,price_at_time,event_datetime)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """,(store_id,"price_change",product_id,name,cost,price,now))

    cursor.execute("""
        UPDATE products
        SET cost=%s, price=%s
        WHERE product_id=%s AND store_id=%s
    """,(cost,price,product_id,store_id))

    conn.commit()
    conn.close()

    return {"message":"Price updated"}

@app.post("/intake-ticket")
def intake_ticket(ticket: IntakeTicket):

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute("SELECT MAX(ticket_id) FROM events")
        result = cursor.fetchone()[0]
        ticket_id = 1 if result is None else result + 1

        now = datetime.now(timezone.utc).isoformat()

        total_cost = 0  # ✅ NEW

        # -----------------------------
        # PROCESS ITEMS (UNCHANGED LOGIC)
        # -----------------------------
        for item in ticket.items:

            cursor.execute("""
                SELECT name
                FROM products
                WHERE product_id = %s AND store_id = %s
            """, (item.product_id, ticket.store_id))

            product = cursor.fetchone()

            if not product:
                raise ValueError("Product not found")

            name = product[0]

            # INSERT EVENT (inventory truth)
            cursor.execute("""
                INSERT INTO events
                (store_id, event_type, product_id, product_name_at_time,
                quantity, cost_at_time, price_at_time, event_datetime, ticket_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                ticket.store_id,
                "intake",
                item.product_id,
                name,
                item.quantity,
                item.cost,
                item.price,
                now,
                ticket_id
            ))

            # UPDATE STOCK
            cursor.execute("""
                UPDATE products
                SET stock = stock + %s,
                    cost = %s,
                    price = %s
                WHERE product_id = %s AND store_id = %s
            """, (
                item.quantity,
                item.cost,
                item.price,
                item.product_id,
                ticket.store_id
            ))

            # ✅ ACCUMULATE COST
            total_cost += item.cost * item.quantity

        # -----------------------------
        # CASH EVENT (ONLY IF PAID)
        # -----------------------------
        if ticket.paid:

            cursor.execute("""
                SELECT organization_id
                FROM stores
                WHERE store_id = %s
            """, (ticket.store_id,))

            result = cursor.fetchone()
            org_id = result[0] if result and result[0] is not None else None

            cursor.execute("""
                INSERT INTO cash_events (
                    organization_id,
                    store_id,
                    type,
                    direction,
                    amount,
                    category,
                    note,
                    reference_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                org_id,
                ticket.store_id,
                "intake_paid",
                -1,
                total_cost,
                "inventory",
                "Paid intake",
                ticket_id
            ))

        # -----------------------------
        # COMMIT (single atomic operation)
        # -----------------------------
        conn.commit()
        conn.close()

        return {"ticket_id": ticket_id}

    except Exception as e:
        print("🔥 INTAKE ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
# -----------------------------
# ADMIN RECOVERY
# -----------------------------

@app.post("/admin/rebuild-store")
def rebuild_store(store_id:int):

    rebuild_products(store_id)

    return {"message":f"Store {store_id} rebuilt"}

@app.get("/products")
def get_products(store_id: int):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT product_id, name, stock, cost, price, tracks_stock, low_stock_threshold
        FROM products
        WHERE store_id = %s
        AND is_active = 1
        ORDER BY LOWER(name) ASC
    """, (store_id,))

    rows = cursor.fetchall()
    conn.close()

    products = []

    for row in rows:
        products.append({
            "product_id": row[0],
            "name": row[1],
            "stock": row[2],
            "cost": row[3],
            "price": row[4],
            "tracks_stock": row[5],
            "low_stock_threshold": row[6]
        })

    return {"products": products}




@app.get("/products/search")
def search_products(store_id: int, name: str, include_inactive: bool = False):

    conn = db()
    cursor = conn.cursor()

    if include_inactive:

        cursor.execute("""
            SELECT product_id, name, stock, cost, price, is_active
            FROM products
            WHERE store_id = %s
            AND LOWER(name) LIKE %s
        """, (store_id, '%' + name.lower() + '%'))

    else:

        cursor.execute("""
            SELECT product_id, name, stock, cost, price, is_active
            FROM products
            WHERE store_id = %s
            AND is_active = 1
            AND LOWER(name) LIKE %s
        """, (store_id, '%' + name.lower() + '%'))

    rows = cursor.fetchall()
    conn.close()

    results = []

    for row in rows:
        results.append({
            "product_id": row[0],
            "name": row[1],
            "stock": row[2],
            "cost": row[3],   # ✅ now correct
            "price": row[4],
            "is_active": row[5]
        })

    return {"products": results}
@app.get("/product/{product_id}")
def get_product(store_id: int, product_id: int):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT product_id, name, stock, cost, price
        FROM products
        WHERE product_id = %s
        AND store_id = %s
    """, (product_id, store_id))

    row = cursor.fetchone()
    conn.close()

    if row is None:
        raise ValueError("Product not found")

    return {
        "product_id": row[0],
        "name": row[1],
        "stock": row[2],
        "cost": row[3],
        "price": row[4]
    }

@app.get("/inventory-value")
def inventory_value(store_id: int):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT stock, cost
        FROM products
        WHERE store_id = %s
        AND is_active = 1
    """, (store_id,))

    rows = cursor.fetchall()
    conn.close()

    total_value = 0

    for stock, cost in rows:

        stock = stock if stock else 0
        cost = cost if cost else 0

        total_value += stock * cost

    return {
        "store_id": store_id,
        "inventory_value": total_value
    }

@app.get("/sales-summary")
def sales_summary(store_id: int):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT quantity, cost_at_time, price_at_time
        FROM events
        WHERE store_id = %s
        AND event_type = 'sale'
    """, (store_id,))

    rows = cursor.fetchall()
    conn.close()

    revenue = 0
    cost_total = 0
    items = 0

    for qty, cost, price in rows:

        qty = qty if qty else 0
        cost = cost if cost else 0
        price = price if price else 0

        items += qty
        revenue += qty * price
        cost_total += qty * cost

    return {
        "items_sold": items,
        "revenue": revenue,
        "cost": cost_total,
        "profit": revenue - cost_total
    }

@app.get("/sales")
def get_sales(store_id: int, start_date: str = None, end_date: str = None):

    conn = db()
    cursor = conn.cursor()

    query = """
        SELECT quantity, cost_at_time, price_at_time
        FROM events
        WHERE store_id = %s
        AND event_type = 'sale'
    """

    params = [store_id]

    # -----------------------------
    # Date filters (FIXED)
    # -----------------------------
    if start_date:
        query += " AND event_datetime::timestamp >= %s"
        params.append(start_date)

    if end_date:
        query += " AND event_datetime::timestamp < (%s::date + INTERVAL '1 day')"
        params.append(end_date)

    cursor.execute(query, params)

    rows = cursor.fetchall()
    conn.close()

    revenue = 0
    cost_total = 0
    items = 0

    for qty, cost, price in rows:

        qty = qty or 0
        cost = cost or 0
        price = price or 0

        items += qty
        revenue += qty * price
        cost_total += qty * cost

    return {
        "items_sold": items,
        "revenue": revenue,
        "cost": cost_total,
        "profit": revenue - cost_total
    }

@app.get("/quick-items")
def quick_items(store_id: int):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            e.product_id,
            p.name,
            p.stock,
            p.price,
            COUNT(*) as sale_count
        FROM events e
        JOIN products p
        ON e.product_id = p.product_id
        AND e.store_id = p.store_id
        WHERE e.store_id = %s
        AND e.event_type = 'sale'
        AND e.event_datetime::timestamptz >= NOW() - INTERVAL '90 days'
        GROUP BY e.product_id, p.name, p.stock, p.price
        ORDER BY sale_count DESC
        LIMIT 6
    """, (store_id,))

    rows = cursor.fetchall()
    conn.close()

    products = []

    for row in rows:
        products.append({
            "product_id": row[0],
            "name": row[1],
            "stock": row[2],
            "price": row[3]
        })

    return {"products": products}
@app.post("/set-low-stock")
def set_low_stock(store_id:int, product_id:int, threshold:int):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE products
        SET low_stock_threshold = %s
        WHERE product_id = %s
        AND store_id = %s
    """, (threshold, product_id, store_id))

    conn.commit()
    conn.close()

    return {"message":"Threshold updated"}

@app.get("/low-stock")
def get_low_stock(store_id: int):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT product_id, name, stock, low_stock_threshold
        FROM products
        WHERE store_id = %s
        AND is_active = 1
        AND tracks_stock = 1
        AND stock <= low_stock_threshold
    """, (store_id,))

    rows = cursor.fetchall()
    conn.close()

    low_stock = []

    for row in rows:
        low_stock.append({
            "product_id": row[0],
            "name": row[1],
            "stock": row[2],
            "threshold": row[3]
        })

    return {"low_stock": low_stock}


@app.get("/sales-history")
def sales_history(store_id: int, start_date: str = None, end_date: str = None):

    conn = db()
    cursor = conn.cursor()

    query = """
        SELECT
            ticket_id,
            MIN(event_datetime::timestamp) as event_datetime,
            COUNT(*) as items,
            SUM(quantity * price_at_time) as revenue,
            SUM(quantity * cost_at_time) as cost
        FROM events
        WHERE store_id = %s
        AND event_type = 'sale'
    """

    params = [store_id]

    # -----------------------------
    # Date filters (FIXED)
    # -----------------------------
    if start_date:
        query += " AND event_datetime::timestamp >= %s"
        params.append(start_date)

    if end_date:
        query += " AND event_datetime::timestamp < (%s::date + INTERVAL '1 day')"
        params.append(end_date)

    query += """
        GROUP BY ticket_id
        ORDER BY event_datetime DESC
        LIMIT 100
    """

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    history = []

    for row in rows:

        revenue = row[3] or 0
        cost = row[4] or 0

        history.append({
            "ticket_id": row[0],
            "datetime": row[1],
            "items": row[2],
            "revenue": revenue,
            "profit": revenue - cost
        })

    return {"sales": history}

@app.get("/stock-report")
def stock_report(store_id: int, name: str = None):

    conn = db()
    cursor = conn.cursor()

    query = """
        SELECT
            name,
            stock,
            cost,
            price
        FROM products
        WHERE store_id = %s
        AND is_active = 1
        AND tracks_stock = 1
    """

    params = [store_id]

    if name:
        query += " AND LOWER(name) LIKE %s"
        params.append("%" + name.lower() + "%")

    query += " ORDER BY name"

    cursor.execute(query, params)

    rows = cursor.fetchall()

    conn.close()

    products = []
    total_cost_value = 0
    total_price_value = 0

    for name, stock, cost, price in rows:

        stock = stock or 0
        cost = cost or 0
        price = price or 0

        investment = stock * cost
        valuation = stock * price

        total_cost_value += investment
        total_price_value += valuation

        products.append({
            "name": name,
            "quantity": stock,
            "cost": cost,
            "price": price,
            "investment": investment,
            "valuation": valuation
        })

    return {
        "products": products,
        "total_inventory_cost": total_cost_value,
        "total_inventory_price": total_price_value
    }


@app.get("/inventory-pareto")
def inventory_pareto(store_id: int):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            p.product_id,
            p.name,
            COALESCE(p.stock, 0) as stock,
            COALESCE(p.cost, 0) as cost,

            -- Investment (current stock value)
            COALESCE(p.stock * p.cost, 0) as investment,

            -- Revenue (from sales events)
            COALESCE(SUM(
                CASE 
                    WHEN e.event_type = 'sale' 
                    THEN e.quantity * e.price_at_time
                    ELSE 0 
                END
            ), 0) as revenue,

            -- Cost of goods sold
            COALESCE(SUM(
                CASE 
                    WHEN e.event_type = 'sale' 
                    THEN e.quantity * e.cost_at_time
                    ELSE 0 
                END
            ), 0) as cost_of_sales

        FROM products p

        LEFT JOIN events e
        ON p.product_id = e.product_id
        AND e.store_id = p.store_id

        WHERE p.store_id = %s
        AND p.is_active = 1

        GROUP BY p.product_id, p.name, p.stock, p.cost
    """, (store_id,))

    rows = cursor.fetchall()
    conn.close()

    results = []

    for row in rows:

        investment = row[4] or 0
        revenue = row[5] or 0
        cost_of_sales = row[6] or 0
        profit = revenue - cost_of_sales

        results.append({
            "product_id": row[0],
            "name": row[1],
            "investment": investment,
            "revenue": revenue,
            "profit": profit
        })

    return {"products": results}



@app.get("/dead-stock")
def dead_stock(store_id: int, days: int = 90):

    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                p.product_id,
                p.name,
                p.stock,
                p.cost,
                MAX(
                    CASE
                        WHEN e.event_datetime IS NOT NULL
                        AND e.event_datetime <> ''
                        THEN e.event_datetime::timestamp
                        ELSE NULL
                    END
                ) AS last_sale
            FROM products p
            LEFT JOIN events e
                ON p.product_id = e.product_id
                AND e.event_type = 'sale'
                AND e.store_id = p.store_id
            WHERE p.store_id = %s
                AND p.is_active = 1
            GROUP BY p.product_id, p.name, p.stock, p.cost
            HAVING
                MAX(
                    CASE
                        WHEN e.event_datetime IS NOT NULL
                        AND e.event_datetime <> ''
                        THEN e.event_datetime::timestamp
                        ELSE NULL
                    END
                ) IS NULL
                OR MAX(
                    CASE
                        WHEN e.event_datetime IS NOT NULL
                        AND e.event_datetime <> ''
                        THEN e.event_datetime::timestamp
                        ELSE NULL
                    END
                ) <= NOW() - (%s * INTERVAL '1 day')
            ORDER BY (p.stock * p.cost) DESC
        """, (store_id, days))

        rows = cursor.fetchall()

    except Exception as e:
        print("DEAD STOCK ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()

    results = []

    for row in rows:

        product_id = row[0]
        name = row[1]
        stock = row[2] or 0
        cost = row[3] or 0
        last_sale = row[4]

        investment = stock * cost

        days_since_sale = None

        if last_sale:
            if last_sale.tzinfo is None:
                last_sale = last_sale.replace(tzinfo=timezone.utc)

            days_since_sale = (datetime.now(timezone.utc) - last_sale).days

        results.append({
            "product_id": product_id,
            "name": name,
            "stock": stock,
            "cost": cost,
            "investment": investment,
            "last_sale": last_sale,
            "days_since_sale": days_since_sale
        })

    return {"products": results}

@app.post("/edit-product")
def edit_product(
    store_id: int,
    product_id: int,
    name: str,
    low_stock_threshold: int,
    tracks_stock: bool
):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE products
        SET
            name = %s,
            low_stock_threshold = %s,
            tracks_stock = %s
        WHERE product_id = %s
        AND store_id = %s
    """, (
        name,
        low_stock_threshold,
        tracks_stock,
        product_id,
        store_id
    ))

    conn.commit()
    conn.close()

    return {"message": "Product updated"}

@app.post("/archive-product")
def archive_product(store_id: int, product_id: int, is_active: bool):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE products
        SET is_active = %s
        WHERE product_id = %s
        AND store_id = %s
    """, (
        1 if is_active else 0,
        product_id,
        store_id
    ))

    conn.commit()
    conn.close()

    return {"message": "Product status updated"}


@app.get("/sales-analysis")
def sales_analysis(store_id: int, start_date: str, end_date: str):

    conn = db()
    cursor = conn.cursor()

    # -----------------------------
    # SUMMARY METRICS
    # -----------------------------
    cursor.execute("""
        SELECT
            SUM(quantity * price_at_time),
            SUM(quantity * cost_at_time),
            COUNT(DISTINCT ticket_id),
            COUNT(DISTINCT (event_datetime::timestamp)::date)
        FROM events
        WHERE store_id = %s
        AND event_type = 'sale'
        AND event_datetime::timestamp BETWEEN %s AND (%s::date + INTERVAL '1 day')
    """, (store_id, start_date, end_date))

    row = cursor.fetchone()

    revenue = row[0] or 0
    cost = row[1] or 0
    tickets = row[2] or 0
    days = row[3] or 1

    profit = revenue - cost

    summary = {
        "revenue": revenue,
        "profit": profit,
        "tickets": tickets,
        "avg_daily_revenue": revenue / days,
        "avg_daily_profit": profit / days,
        "avg_ticket_value": revenue / tickets if tickets else 0
    }

    # -----------------------------
    # TOP REVENUE PRODUCTS
    # -----------------------------
    cursor.execute("""
        SELECT
            product_id,
            product_name_at_time,
            SUM(quantity * price_at_time) AS revenue
        FROM events
        WHERE store_id = %s
        AND event_type = 'sale'
        AND event_datetime::timestamp BETWEEN %s AND (%s::date + INTERVAL '1 day')
        GROUP BY product_id, product_name_at_time
        ORDER BY revenue DESC
        LIMIT 10
    """, (store_id, start_date, end_date))

    top_revenue = [
        {"name": r[1], "revenue": r[2] or 0}
        for r in cursor.fetchall()
    ]

    # -----------------------------
    # TOP PROFIT PRODUCTS
    # -----------------------------
    cursor.execute("""
        SELECT
            product_id,
            product_name_at_time,
            SUM(quantity * (price_at_time - cost_at_time)) AS profit
        FROM events
        WHERE store_id = %s
        AND event_type = 'sale'
        AND event_datetime::timestamp BETWEEN %s AND (%s::date + INTERVAL '1 day')
        GROUP BY product_id, product_name_at_time
        ORDER BY profit DESC
        LIMIT 10
    """, (store_id, start_date, end_date))

    top_profit = [
        {"name": r[1], "profit": r[2] or 0}
        for r in cursor.fetchall()
    ]

    # -----------------------------
    # TOP VOLUME PRODUCTS
    # -----------------------------
    cursor.execute("""
        SELECT
            product_id,
            product_name_at_time,
            SUM(quantity) AS units
        FROM events
        WHERE store_id = %s
        AND event_type = 'sale'
        AND event_datetime::timestamp BETWEEN %s AND (%s::date + INTERVAL '1 day')
        GROUP BY product_id, product_name_at_time
        ORDER BY units DESC
        LIMIT 10
    """, (store_id, start_date, end_date))

    top_volume = [
        {"name": r[1], "units": r[2] or 0}
        for r in cursor.fetchall()
    ]

    conn.close()

    return {
        "summary": summary,
        "top_revenue_products": top_revenue,
        "top_profit_products": top_profit,
        "top_volume_products": top_volume
    }

@app.post("/import-products")
async def import_products(
    store_id: int,
    file: UploadFile = File(...)
):

    # -----------------------------
    # Read file
    # -----------------------------
    try:
        if file.filename.endswith(".xlsx"):
            df = pd.read_excel(file.file)

        elif file.filename.endswith(".csv"):
            df = pd.read_csv(file.file)

        else:
            raise HTTPException(status_code=400, detail="Invalid file format")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File read error: {str(e)}")

    # -----------------------------
    # Normalize column names
    # -----------------------------
    df.columns = [str(col).strip().lower() for col in df.columns]

    # -----------------------------
    # Validate structure
    # -----------------------------
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]

    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {missing}"
        )

    conn = db()
    cursor = conn.cursor()

    created = 0
    rejected = []

    # -----------------------------
    # Get next product_id
    # -----------------------------
    cursor.execute(
        "SELECT COALESCE(MAX(product_id), 0) FROM events WHERE store_id = %s",
        (store_id,)
    )

    next_product_id = cursor.fetchone()[0] + 1

    now = datetime.now(timezone.utc).isoformat()

    # -----------------------------
    # Process rows
    # -----------------------------
    for i, row in df.iterrows():

        try:
            # -----------------------------
            # NAME (required)
            # -----------------------------
            name = str(row["name"]).strip()

            if not name:
                raise ValueError("Missing product name")

            # -----------------------------
            # DUPLICATE CHECK
            # -----------------------------
            cursor.execute(
                """
                SELECT 1 FROM products
                WHERE store_id = %s
                AND LOWER(name) = LOWER(%s)
                """,
                (store_id, name)
            )

            if cursor.fetchone():
                raise ValueError("Duplicate product name")

            # -----------------------------
            # PARSE NUMBERS (STRICT)
            # -----------------------------
            try:
                initial_stock = int(row["initial_stock"])
            except:
                raise ValueError("Invalid initial_stock")

            try:
                cost = float(row["cost"])
            except:
                raise ValueError("Invalid cost")

            try:
                price = float(row["price"])
            except:
                raise ValueError("Invalid price")

            # -----------------------------
            # BOOLEAN (tracks_stock)
            # -----------------------------
            tracks_stock_raw = str(row["tracks_stock"]).strip().lower()

            if tracks_stock_raw not in ["true", "false"]:
                raise ValueError("tracks_stock must be TRUE or FALSE")

            tracks_stock = tracks_stock_raw == "true"

            # -----------------------------
            # LOW STOCK (optional)
            # -----------------------------
            try:
                low_stock_threshold = int(row["low_stock_threshold"])
            except:
                low_stock_threshold = 0

            # -----------------------------
            # INSERT EVENT
            # -----------------------------
            cursor.execute("""
                INSERT INTO events (
                    store_id,
                    event_type,
                    product_id,
                    product_name_at_time,
                    quantity,
                    cost_at_time,
                    price_at_time,
                    event_datetime
                )
                VALUES (%s, 'create', %s, %s, %s, %s, %s, %s)
            """, (
                store_id,
                next_product_id,
                name,
                initial_stock,
                cost,
                price,
                now
            ))

            next_product_id += 1
            created += 1

        except Exception as e:
            rejected.append({
                "row": i + 2,
                "error": str(e)
            })

    conn.commit()
    conn.close()

    # -----------------------------
    # REBUILD PRODUCTS
    # -----------------------------
    
    rebuild_products(store_id)

    return {
        "created": created,
        "rejected": rejected
    }

@app.get("/ticket-details")
def ticket_details(store_id: int, ticket_id: int):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            product_name_at_time,
            quantity,
            price_at_time,
            cost_at_time
        FROM events
        WHERE store_id = %s
        AND ticket_id = %s
        AND event_type = 'sale'
    """, (store_id, ticket_id))

    rows = cursor.fetchall()
    conn.close()

    items = []
    total = 0
    cost_total = 0

    for name, qty, price, cost in rows:

        line_total = qty * price
        total += line_total
        cost_total += qty * cost

        items.append({
            "name": name,
            "quantity": qty,
            "price": price,
            "line_total": line_total
        })

    return {
        "ticket_id": ticket_id,
        "items": items,
        "total": total,
        "profit": total - cost_total
    }


from datetime import datetime, timezone
from fastapi import HTTPException

class SignupRequest(BaseModel):
    email: str
    password: str
    store_name: str


@app.post("/signup")
def signup(data: SignupRequest):

    conn = db()
    cursor = conn.cursor()

    created_at = datetime.now(timezone.utc).isoformat()

    # 1. Check if user exists
    cursor.execute(
        "SELECT user_id FROM users WHERE email = %s",
        (data.email,)
    )
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="User already exists")

    # 2. Create store
    cursor.execute("""
        INSERT INTO stores (name, created_at, organization_id)
        VALUES (%s, %s, NULL)
        RETURNING store_id
    """, (data.store_name, created_at))

    store_id = cursor.fetchone()[0]

    # 3. Create user
    cursor.execute("""
        INSERT INTO users (email, password, store_id, created_at)
        VALUES (%s, %s, %s, %s)
        RETURNING user_id
    """, (data.email, data.password, store_id, created_at))

    user_id = cursor.fetchone()[0]

    conn.commit()
    conn.close()

    return {
        "user_id": user_id,
        "store_id": store_id,
        "email": data.email
    }



@app.post("/login")
def login(data: LoginRequest):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT u.user_id, u.password, u.store_id, s.name
        FROM users u
        JOIN stores s ON u.store_id = s.store_id
        WHERE u.email = %s
    """, (data.email,))

    user = cursor.fetchone()

    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    user_id, stored_password, store_id, store_name = user

    if data.password != stored_password:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid password")

    conn.close()

    return {
        "user_id": user_id,
        "store_id": store_id,
        "store_name": store_name,
        "email": data.email
    }

@app.get("/service-report")
def service_report(
    store_id: int,
    start_date: str = None,
    end_date: str = None
):

    conn = db()
    cursor = conn.cursor()

    query = """
        SELECT
            e.product_id,
            e.product_name_at_time,
            SUM(e.quantity) as instances,
            SUM(e.quantity * e.cost_at_time) as cost,
            SUM(e.quantity * e.price_at_time) as revenue
        FROM events e
        JOIN products p
        ON e.product_id = p.product_id
        AND e.store_id = p.store_id
        WHERE e.store_id = %s
        AND e.event_type = 'sale'
        AND p.tracks_stock = 0
    """

    params = [store_id]

    # -----------------------------
    # DATE FILTERING
    # -----------------------------

    if start_date:
        query += " AND e.event_datetime::timestamp >= %s::timestamp"
        params.append(start_date)

    if end_date:
        query += " AND e.event_datetime::timestamp < %s::timestamp"
        params.append(end_date + " 23:59:59")

    query += """
        GROUP BY e.product_id, e.product_name_at_time
        ORDER BY revenue DESC
    """

    cursor.execute(query, params)

    rows = cursor.fetchall()
    conn.close()

    services = []

    for r in rows:
        cost = r[3] or 0
        revenue = r[4] or 0

        services.append({
            "product_id": r[0],
            "name": r[1],
            "instances": r[2] or 0,
            "cost": cost,
            "revenue": revenue,
            "profit": revenue - cost
        })

    return {"services": services}

@app.get("/test-insert-cash")
def test_insert_cash():

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO cash_events (
            organization_id,
            store_id,
            type,
            direction,
            amount,
            category,
            note
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        None,              # standalone store (adjust if needed)
        1,                 # use your actual store_id
        "test",
        1,
        100.00,
        "debug",
        "first test entry"
    ))

    conn.commit()
    conn.close()

    return {"message": "test cash event inserted"}

@app.get("/test-cash-table")
def test_cash_table():

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, store_id, type, direction, amount, category, note
        FROM cash_events
        ORDER BY id DESC
        LIMIT 5
    """)

    rows = cursor.fetchall()

    conn.close()

    return {"rows": rows}

@app.get("/test-cash-balance")
def test_cash_balance(store_id: int):

    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COALESCE(SUM(amount * direction), 0)
        FROM cash_events
        WHERE store_id = %s
    """, (store_id,))

    balance = cursor.fetchone()[0]

    conn.close()

    return {"balance": round(float(balance), 2)}

@app.post("/cash-event")
def create_cash_event(data: CashEventRequest):

    try:
        conn = db()
        cursor = conn.cursor()

        direction = 1 if data.type == "revenue" else -1

        cursor.execute("""
            SELECT organization_id
            FROM stores
            WHERE store_id = %s
        """, (data.store_id,))

        result = cursor.fetchone()
        org_id = result[0] if result and result[0] is not None else None

        cursor.execute("""
            INSERT INTO cash_events (
                organization_id,
                store_id,
                type,
                direction,
                amount,
                category,
                note
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            org_id,
            data.store_id,
            data.type,
            direction,
            data.amount,
            data.category,
            data.note
        ))

        conn.commit()
        conn.close()

        return {"status": "ok"}

    except Exception as e:
        print("🔥 CASH EVENT ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/returns")
def process_return(data: ReturnRequest):

    try:
        conn = db()
        cursor = conn.cursor()

        now = datetime.now(timezone.utc).isoformat()

        cursor.execute("SELECT MAX(ticket_id) FROM events")
        result = cursor.fetchone()[0]
        ticket_id = 1 if result is None else result + 1

        # -----------------------------
        # RETURN (inventory comes back)
        # -----------------------------
        if data.items:

            for item in data.items:

                cursor.execute("""
                    SELECT name, cost, price
                    FROM products
                    WHERE product_id = %s AND store_id = %s
                """, (item.product_id, data.store_id))

                product = cursor.fetchone()

                if not product:
                    raise ValueError("Product not found")

                name, cost, price = product

                cursor.execute("""
                    INSERT INTO events
                    (store_id, event_type, product_id, product_name_at_time,
                    quantity, cost_at_time, price_at_time, event_datetime, ticket_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    data.store_id,
                    "intake",
                    item.product_id,
                    name,
                    item.quantity,
                    cost,
                    price,
                    now,
                    ticket_id
                ))

                cursor.execute("""
                    UPDATE products
                    SET stock = stock + %s
                    WHERE product_id = %s AND store_id = %s
                """, (
                    item.quantity,
                    item.product_id,
                    data.store_id
                ))

            event_type = "return"

        # -----------------------------
        # REFUND (cash only)
        # -----------------------------
        else:
            event_type = "refund"

        # -----------------------------
        # CASH EVENT
        # -----------------------------
        cursor.execute("""
            SELECT organization_id
            FROM stores
            WHERE store_id = %s
        """, (data.store_id,))

        result = cursor.fetchone()
        org_id = result[0] if result and result[0] is not None else None

        cursor.execute("""
            INSERT INTO cash_events (
                organization_id,
                store_id,
                type,
                direction,
                amount,
                note,
                reference_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            org_id,
            data.store_id,
            event_type,
            -1,
            data.amount,
            data.note,
            ticket_id
        ))

        conn.commit()
        conn.close()

        return {"status": "ok"}

    except Exception as e:
        print("🔥 RETURN ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/returns")
def process_return(data: ReturnRequest):

    try:
        conn = db()
        cursor = conn.cursor()

        now = datetime.now(timezone.utc).isoformat()

        # -----------------------------
        # GENERATE TICKET ID (only if needed)
        # -----------------------------
        ticket_id = None

        if len(data.items) > 0:
            cursor.execute("SELECT MAX(ticket_id) FROM events")
            result = cursor.fetchone()[0]
            ticket_id = 1 if result is None else result + 1

        # -----------------------------
        # CASE 1: RETURN (WITH ITEMS)
        # -----------------------------
        if len(data.items) > 0:

            for item in data.items:

                # get product name
                cursor.execute("""
                    SELECT name
                    FROM products
                    WHERE product_id = %s AND store_id = %s
                """, (item.product_id, data.store_id))

                product = cursor.fetchone()

                if not product:
                    raise ValueError("Product not found")

                name = product[0]

                # create intake event (inventory increases)
                cursor.execute("""
                    INSERT INTO events
                    (store_id, event_type, product_id, product_name_at_time,
                    quantity, cost_at_time, price_at_time, event_datetime, ticket_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    data.store_id,
                    "intake",  # ✅ return = intake event
                    item.product_id,
                    name,
                    item.quantity,
                    item.cost,
                    item.price,
                    now,
                    ticket_id
                ))

                # update stock
                cursor.execute("""
                    UPDATE products
                    SET stock = stock + %s
                    WHERE product_id = %s AND store_id = %s
                """, (
                    item.quantity,
                    item.product_id,
                    data.store_id
                ))

        # -----------------------------
        # CASH EVENT (ALWAYS)
        # -----------------------------
        cursor.execute("""
            INSERT INTO cash_events
            (store_id, type, direction, amount, category, note, reference_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.store_id,
            "return" if len(data.items) > 0 else "refund",
            -1,  # money leaving business
            data.amount,
            "Devolucion",
            data.note,
            ticket_id,
            now
        ))

        conn.commit()
        conn.close()

        return {
            "status": "ok",
            "type": "return" if len(data.items) > 0 else "refund"
        }

    except Exception as e:
        print("🔥 RETURN ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cash-movements")
def cash_movements(store_id: int, start_date: str, end_date: str):

    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                created_at,
                amount,
                direction,
                type,
                category,
                note
            FROM cash_events
            WHERE store_id = %s
            AND created_at::date BETWEEN %s AND %s
            AND type != 'sale'
            ORDER BY created_at DESC
        """, (store_id, start_date, end_date))

        rows = cursor.fetchall()

        movements = []

        for r in rows:
            movements.append({
                "datetime": r[0],
                "amount": float(r[1] or 0),
                "direction": int(r[2] or 1),
                "type": str(r[3] or ""),
                "category": r[4] or "",
                "note": r[5] or ""
            })

        return {"movements": movements}

    except Exception as e:
        print("❌ CASH MOVEMENTS ERROR:", e)
        return {"movements": []}

    finally:
        conn.close()

@app.get("/rebuild-products")
def rebuild_products_endpoint(store_id: int):
    rebuild_products(store_id)
    return {"status": "rebuilt"}