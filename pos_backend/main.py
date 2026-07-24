from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pos_backend.rebuild_products import rebuild_products

from datetime import date, datetime, timezone, time, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
import pandas as pd
from fastapi import UploadFile, File, HTTPException, Form
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
        lst_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
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


def round_money(value):
    return round(float(value or 0), 2)


def calculate_percent_change(current, previous):
    current = float(current or 0)
    previous = float(previous or 0)

    if previous == 0:
        if current == 0:
            return 0.0

        return None

    return round(
        ((current - previous) / previous) * 100,
        2
    )


def build_period_boundaries(
    start_date: date,
    end_date: date
):
    if end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail=(
                "end_date must not be before "
                "start_date"
            )
        )

    start_datetime = datetime.combine(
        start_date,
        time.min,
        tzinfo=timezone.utc
    )

    end_exclusive = datetime.combine(
        end_date + timedelta(days=1),
        time.min,
        tzinfo=timezone.utc
    )

    days_in_period = (
        end_date - start_date
    ).days + 1

    return {
        "start": start_datetime,
        "end_exclusive": end_exclusive,
        "days": days_in_period
    }

def build_sales_analysis_data(
    cursor,
    store_id: int,
    start_datetime: datetime,
    end_exclusive: datetime,
    days_in_period: int
):
    # ---------------------------------------------
    # SALES SUMMARY
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT
            COALESCE(
                SUM(quantity * price_at_time),
                0
            ),
            COALESCE(
                SUM(quantity * cost_at_time),
                0
            ),
            COALESCE(
                SUM(quantity),
                0
            ),
            COUNT(DISTINCT ticket_id)
        FROM events
        WHERE store_id = %s
          AND event_type = 'sale'
          AND event_datetime::timestamp >= %s
          AND event_datetime::timestamp < %s
        """,
        (
            store_id,
            start_datetime,
            end_exclusive
        )
    )

    row = cursor.fetchone()

    revenue = float(row[0] or 0)
    cost = float(row[1] or 0)
    units_sold = int(row[2] or 0)
    tickets = int(row[3] or 0)

    gross_profit = revenue - cost

    gross_margin_percent = (
        gross_profit / revenue * 100
        if revenue > 0
        else 0
    )

    average_ticket = (
        revenue / tickets
        if tickets > 0
        else 0
    )

    units_per_ticket = (
        units_sold / tickets
        if tickets > 0
        else 0
    )

    summary = {
        "tickets": tickets,
        "units_sold": units_sold,
        "revenue": round_money(revenue),
        "cost": round_money(cost),
        "gross_profit":
            round_money(gross_profit),
        "gross_margin_percent":
            round(gross_margin_percent, 2),
        "average_ticket":
            round_money(average_ticket),
        "units_per_ticket":
            round(units_per_ticket, 2),
        "average_daily_revenue":
            round_money(
                revenue / days_in_period
            ),
        "average_daily_profit":
            round_money(
                gross_profit / days_in_period
            )
    }

    # ---------------------------------------------
    # PRODUCT PERFORMANCE
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT
            product_id,
            product_name_at_time,
            COALESCE(
                SUM(quantity),
                0
            ) AS units,
            COALESCE(
                SUM(quantity * price_at_time),
                0
            ) AS revenue,
            COALESCE(
                SUM(quantity * cost_at_time),
                0
            ) AS cost,
            COALESCE(
                SUM(
                    quantity *
                    (
                        price_at_time -
                        cost_at_time
                    )
                ),
                0
            ) AS profit
        FROM events
        WHERE store_id = %s
          AND event_type = 'sale'
          AND event_datetime::timestamp >= %s
          AND event_datetime::timestamp < %s
        GROUP BY
            product_id,
            product_name_at_time
        """,
        (
            store_id,
            start_datetime,
            end_exclusive
        )
    )

    products = []

    for row in cursor.fetchall():
        product_revenue = float(
            row[3] or 0
        )

        product_profit = float(
            row[5] or 0
        )

        margin_percent = (
            product_profit /
            product_revenue * 100
            if product_revenue > 0
            else 0
        )

        products.append({
            "product_id": row[0],
            "name": row[1],
            "units": int(row[2] or 0),
            "revenue":
                round_money(row[3]),
            "cost":
                round_money(row[4]),
            "profit":
                round_money(row[5]),
            "margin_percent":
                round(margin_percent, 2)
        })

    top_revenue_products = sorted(
        products,
        key=lambda item:
            item["revenue"],
        reverse=True
    )[:10]

    top_profit_products = sorted(
        products,
        key=lambda item:
            item["profit"],
        reverse=True
    )[:10]

    top_volume_products = sorted(
        products,
        key=lambda item:
            item["units"],
        reverse=True
    )[:10]

    # ---------------------------------------------
    # INTAKE ACTIVITY
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT
            COUNT(
                DISTINCT ticket_id
            ),
            COALESCE(
                SUM(quantity),
                0
            ),
            COALESCE(
                SUM(
                    quantity *
                    cost_at_time
                ),
                0
            )
        FROM events
        WHERE store_id = %s
          AND event_type = 'intake'
          AND event_datetime::timestamp >= %s
          AND event_datetime::timestamp < %s
        """,
        (
            store_id,
            start_datetime,
            end_exclusive
        )
    )

    intake_row = cursor.fetchone()

    inventory = {
        "intake_tickets":
            int(intake_row[0] or 0),

        "intake_units":
            int(intake_row[1] or 0),

        "intake_cost":
            round_money(
                intake_row[2]
            ),

        "positive_adjustment_events": 0,
        "positive_adjustment_units": 0,

        "negative_adjustment_events": 0,
        "negative_adjustment_units": 0,

        "loss_events": 0,
        "loss_units": 0,
        "loss_cost": 0.0,

        "transfer_in_events": 0,
        "transfer_in_units": 0,

        "transfer_out_events": 0,
        "transfer_out_units": 0
    }

    # ---------------------------------------------
    # STOCK ADJUSTMENTS
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT
            event_type,
            COUNT(*) AS event_count,
            COALESCE(
                SUM(quantity),
                0
            ) AS total_units
        FROM events
        WHERE store_id = %s
          AND event_type IN (
              'stock_adjustment_positive',
              'stock_adjustment_negative'
          )
          AND event_datetime::timestamp >= %s
          AND event_datetime::timestamp < %s
        GROUP BY event_type
        """,
        (
            store_id,
            start_datetime,
            end_exclusive
        )
    )

    for (
        event_type,
        event_count,
        total_units
    ) in cursor.fetchall():
        if (
            event_type ==
            "stock_adjustment_positive"
        ):
            inventory[
                "positive_adjustment_events"
            ] = int(
                event_count or 0
            )

            inventory[
                "positive_adjustment_units"
            ] = int(
                total_units or 0
            )

        elif (
            event_type ==
            "stock_adjustment_negative"
        ):
            inventory[
                "negative_adjustment_events"
            ] = int(
                event_count or 0
            )

            inventory[
                "negative_adjustment_units"
            ] = int(
                total_units or 0
            )

    # ---------------------------------------------
    # LOSSES
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT
            COUNT(*) AS event_count,
            COALESCE(
                SUM(quantity),
                0
            ) AS total_units,
            COALESCE(
                SUM(
                    quantity *
                    cost_at_time
                ),
                0
            ) AS total_cost
        FROM events
        WHERE store_id = %s
          AND event_type = 'loss'
          AND event_datetime::timestamp >= %s
          AND event_datetime::timestamp < %s
        """,
        (
            store_id,
            start_datetime,
            end_exclusive
        )
    )

    loss_row = cursor.fetchone()

    inventory["loss_events"] = int(
        loss_row[0] or 0
    )

    inventory["loss_units"] = int(
        loss_row[1] or 0
    )

    inventory["loss_cost"] = round_money(
        loss_row[2]
    )

    # ---------------------------------------------
    # TRANSFERS
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT
            event_type,
            COUNT(*) AS event_count,
            COALESCE(
                SUM(quantity),
                0
            ) AS total_units
        FROM events
        WHERE store_id = %s
          AND event_type IN (
              'transfer_in',
              'transfer_out'
          )
          AND event_datetime::timestamp >= %s
          AND event_datetime::timestamp < %s
        GROUP BY event_type
        """,
        (
            store_id,
            start_datetime,
            end_exclusive
        )
    )

    for (
        event_type,
        event_count,
        total_units
    ) in cursor.fetchall():
        if event_type == "transfer_in":
            inventory[
                "transfer_in_events"
            ] = int(
                event_count or 0
            )

            inventory[
                "transfer_in_units"
            ] = int(
                total_units or 0
            )

        elif event_type == "transfer_out":
            inventory[
                "transfer_out_events"
            ] = int(
                event_count or 0
            )

            inventory[
                "transfer_out_units"
            ] = int(
                total_units or 0
            )

    # ---------------------------------------------
    # RESPONSE
    # ---------------------------------------------
    return {
        "summary": summary,

        "inventory": inventory,

        "top_revenue_products":
            top_revenue_products,

        "top_profit_products":
            top_profit_products,

        "top_volume_products":
            top_volume_products
    }

def build_cash_activity_data(
    cursor,
    store_id: int,
    start_datetime: datetime,
    end_exclusive: datetime
):
    # ---------------------------------------------
    # OVERALL CASH MOVEMENT
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT
            COUNT(*),
            COALESCE(
                SUM(
                    CASE
                        WHEN direction = 1
                        THEN amount
                        ELSE 0
                    END
                ),
                0
            ),
            COALESCE(
                SUM(
                    CASE
                        WHEN direction = -1
                        THEN amount
                        ELSE 0
                    END
                ),
                0
            ),
            COALESCE(
                SUM(
                    amount * direction
                ),
                0
            )
        FROM cash_events
        WHERE store_id = %s
          AND created_at >= %s
          AND created_at < %s
        """,
        (
            store_id,
            start_datetime,
            end_exclusive
        )
    )

    overall_row = cursor.fetchone()

    event_count = int(
        overall_row[0] or 0
    )

    total_inflows = round_money(
        overall_row[1]
    )

    total_outflows = round_money(
        overall_row[2]
    )

    net_cash_movement = round_money(
        overall_row[3]
    )

    # ---------------------------------------------
    # MOVEMENT BY TYPE
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT
            COALESCE(type, ''),
            direction,
            COUNT(*),
            COALESCE(
                SUM(amount),
                0
            )
        FROM cash_events
        WHERE store_id = %s
          AND created_at >= %s
          AND created_at < %s
        GROUP BY
            COALESCE(type, ''),
            direction
        ORDER BY
            COALESCE(type, ''),
            direction DESC
        """,
        (
            store_id,
            start_datetime,
            end_exclusive
        )
    )

    by_type = []

    for (
        event_type,
        direction,
        count,
        total
    ) in cursor.fetchall():
        numeric_direction = int(
            direction or 1
        )

        numeric_total = round_money(
            total
        )

        by_type.append({
            "type": str(
                event_type or ""
            ),
            "direction":
                numeric_direction,
            "count": int(
                count or 0
            ),
            "total":
                numeric_total,
            "signed_total":
                round_money(
                    numeric_total *
                    numeric_direction
                )
        })

    # ---------------------------------------------
    # MOVEMENT BY CATEGORY
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT
            COALESCE(category, ''),
            direction,
            COUNT(*),
            COALESCE(
                SUM(amount),
                0
            )
        FROM cash_events
        WHERE store_id = %s
          AND created_at >= %s
          AND created_at < %s
        GROUP BY
            COALESCE(category, ''),
            direction
        ORDER BY
            COALESCE(category, ''),
            direction DESC
        """,
        (
            store_id,
            start_datetime,
            end_exclusive
        )
    )

    by_category = []

    for (
        category,
        direction,
        count,
        total
    ) in cursor.fetchall():
        numeric_direction = int(
            direction or 1
        )

        numeric_total = round_money(
            total
        )

        by_category.append({
            "category": str(
                category or ""
            ),
            "direction":
                numeric_direction,
            "count": int(
                count or 0
            ),
            "total":
                numeric_total,
            "signed_total":
                round_money(
                    numeric_total *
                    numeric_direction
                )
        })

    # ---------------------------------------------
    # COMMON BUSINESS BUCKETS
    # ---------------------------------------------
    sales_inflow = 0.0
    other_revenue = 0.0
    expenses = 0.0
    paid_intakes = 0.0
    returns_and_refunds = 0.0
    owner_withdrawals = 0.0

    for movement in by_type:
        event_type = (
            movement["type"]
            .strip()
            .lower()
        )

        direction = (
            movement["direction"]
        )

        total = movement["total"]

        if (
            event_type == "sale"
            and direction == 1
        ):
            sales_inflow += total

        elif (
            event_type == "revenue"
            and direction == 1
        ):
            other_revenue += total

        elif (
            event_type == "expense"
            and direction == -1
        ):
            expenses += total

        elif (
            event_type == "intake_paid"
            and direction == -1
        ):
            paid_intakes += total

        elif (
            event_type in {
                "return",
                "refund",
                "return_refund"
            }
            and direction == -1
        ):
            returns_and_refunds += total

    for movement in by_category:
        category = (
            movement["category"]
            .strip()
            .lower()
        )

        if (
            category in {
                "retiro dueño",
                "retiro dueno",
                "owner_draw"
            }
            and
            movement["direction"] == -1
        ):
            owner_withdrawals += (
                movement["total"]
            )

    return {
        "event_count":
            event_count,

        "total_inflows":
            total_inflows,

        "total_outflows":
            total_outflows,

        "net_cash_movement":
            net_cash_movement,

        "sales_inflow":
            round_money(
                sales_inflow
            ),

        "other_revenue":
            round_money(
                other_revenue
            ),

        "expenses":
            round_money(
                expenses
            ),

        "paid_intakes":
            round_money(
                paid_intakes
            ),

        "returns_and_refunds":
            round_money(
                returns_and_refunds
            ),

        "owner_withdrawals":
            round_money(
                owner_withdrawals
            ),

        "by_type":
            by_type,

        "by_category":
            by_category
    }

@app.on_event("startup")
def startup():
    init_db()

class SaleItem(BaseModel):
    product_id: int
    quantity: int
    price: float  # 🔥 REQUIRED

class StockAdjustmentRequest(BaseModel):
    store_id: int
    product_id: int
    quantity: int
    direction: str
    reason: Optional[str] = None
    note: Optional[str] = None

    client_event_id: Optional[str] = None
    device_id: Optional[str] = None
    client_created_at: Optional[str] = None

class StockTransferRequest(BaseModel):
    store_id: int
    product_id: int
    quantity: int
    direction: str  # "in" or "out"
    note: Optional[str] = None

class SaleTicket(BaseModel):
    store_id: int
    items: List[SaleItem]
    client_event_id: Optional[str] = None
    device_id: Optional[str] = None
    client_created_at: Optional[str] = None


class IntakeItem(BaseModel):
    product_id: int
    quantity: int
    cost: float
    price: float


class IntakeTicket(BaseModel):
    store_id: int
    items: List[IntakeItem]
    paid: bool = False

    client_event_id: Optional[str] = None
    device_id: Optional[str] = None
    client_created_at: Optional[str] = None

class CashEventRequest(BaseModel):
    store_id: int
    amount: float
    type: str
    category: str
    note: Optional[str] = None

    client_event_id: Optional[str] = None
    device_id: Optional[str] = None
    client_created_at: Optional[str] = None

class ReturnItem(BaseModel):
    product_id: int
    quantity: int
    cost: float
    price: float

class ReviewLSTRequest(BaseModel):
    store_id: int
    product_id: int
    low_stock_threshold: int

class ReturnRequest(BaseModel):
    store_id: int
    amount: float
    items: List[ReturnItem] = Field(default_factory=list)
    note: Optional[str] = ""
    client_event_id: Optional[str] = None
    device_id: Optional[str] = None
    client_created_at: Optional[str] = None

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
from fastapi import Query, HTTPException
from datetime import datetime, timezone

@app.post("/create-product")
def create_product(
    store_id: int,
    name: str,
    initial_stock: int,
    cost: float,
    price: float,
    tracks_stock: bool = Query(True),  # ✅ FIXED TYPE
    low_stock_threshold: int = 0
):
    print(">>> tracks_stock received:", tracks_stock, type(tracks_stock))

    # -----------------------------
    # Normalize tracks_stock (SAFE)
    # -----------------------------
    if isinstance(tracks_stock, str):
        tracks_stock = tracks_stock.lower() in ["1", "true", "yes"]
    elif isinstance(tracks_stock, int):
        tracks_stock = tracks_stock == 1
    elif isinstance(tracks_stock, bool):
        pass
    else:
        tracks_stock = True

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
    # CREATE EVENT
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
        tracks_stock,  # ✅ BOOLEAN
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

@app.get("/users")
def get_users(store_id: int | None = None):
    conn = db()
    cursor = conn.cursor()

    try:
        if store_id is None:
            cursor.execute("""
                SELECT
                    u.user_id,
                    u.email,
                    u.store_id,
                    s.name,
                    u.created_at
                FROM users u
                LEFT JOIN stores s
                    ON s.store_id = u.store_id
                ORDER BY u.store_id, LOWER(u.email)
            """)
        else:
            cursor.execute("""
                SELECT
                    u.user_id,
                    u.email,
                    u.store_id,
                    s.name,
                    u.created_at
                FROM users u
                LEFT JOIN stores s
                    ON s.store_id = u.store_id
                WHERE u.store_id = %s
                ORDER BY LOWER(u.email)
            """, (store_id,))

        rows = cursor.fetchall()

        return {
            "users": [
                {
                    "user_id": row[0],
                    "email": row[1],
                    "store_id": row[2],
                    "store_name": row[3],
                    "created_at": row[4],
                }
                for row in rows
            ]
        }

    finally:
        cursor.close()
        conn.close()


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

    try:
        print("🔥 SALE ENDPOINT HIT")

        # -------------------------------------------------
        # IDEMPOTENCY CHECK
        # -------------------------------------------------
        if ticket.client_event_id:
            cursor.execute("""
                SELECT ticket_id
                FROM events
                WHERE store_id = %s
                  AND client_event_id = %s
                LIMIT 1
            """, (
                ticket.store_id,
                ticket.client_event_id
            ))

            existing = cursor.fetchone()

            if existing:
                return {
                    "message": "Sale already recorded",
                    "status": "already_processed",
                    "ticket_id": existing[0],
                    "client_event_id": ticket.client_event_id
                }

        # -------------------------------------------------
        # VALIDATE TICKET
        # -------------------------------------------------
        if not ticket.items:
            raise HTTPException(
                status_code=400,
                detail="Sale ticket must contain at least one item"
            )

        for item in ticket.items:
            if item.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Item quantity must be greater than zero"
                )

            if item.price < 0:
                raise HTTPException(
                    status_code=400,
                    detail="Item price cannot be negative"
                )

        # -------------------------------------------------
        # SERIALIZE TICKET NUMBER GENERATION
        #
        # This prevents two simultaneous requests from
        # calculating the same MAX(ticket_id) + 1.
        # The lock is released automatically on commit
        # or rollback.
        # -------------------------------------------------
        cursor.execute("""
            SELECT pg_advisory_xact_lock(%s)
        """, (1269001,))

        cursor.execute("""
            SELECT COALESCE(MAX(ticket_id), 0)
            FROM events
        """)

        ticket_id = cursor.fetchone()[0] + 1

        now = datetime.now(timezone.utc).isoformat()
        total_revenue = 0.0

        # -------------------------------------------------
        # PROCESS SALE ITEMS
        # -------------------------------------------------
        for item in ticket.items:
            cursor.execute("""
                SELECT
                    name,
                    cost
                FROM products
                WHERE product_id = %s
                  AND store_id = %s
                  AND is_active = 1
            """, (
                item.product_id,
                ticket.store_id
            ))

            product = cursor.fetchone()

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product {item.product_id} not found"
                )

            name, cost = product

            cost = round(float(cost or 0), 2)
            price = round(float(item.price), 2)
            line_total = round(price * item.quantity, 2)

            cursor.execute("""
                INSERT INTO events (
                    store_id,
                    event_type,
                    product_id,
                    product_name_at_time,
                    quantity,
                    cost_at_time,
                    price_at_time,
                    event_datetime,
                    ticket_id,
                    client_event_id,
                    device_id,
                    client_created_at
                )
                VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s
                )
            """, (
                ticket.store_id,
                "sale",
                item.product_id,
                name,
                item.quantity,
                cost,
                price,
                now,
                ticket_id,
                ticket.client_event_id,
                ticket.device_id,
                ticket.client_created_at
            ))

            total_revenue += line_total

            # Stock is reduced only for tracked products.
            # Negative stock remains allowed.
            cursor.execute("""
                UPDATE products
                SET stock = COALESCE(stock, 0) - %s
                WHERE product_id = %s
                  AND store_id = %s
                  AND tracks_stock = 1
            """, (
                item.quantity,
                item.product_id,
                ticket.store_id
            ))

        total_revenue = round(total_revenue, 2)

        # -------------------------------------------------
        # GET ORGANIZATION
        # -------------------------------------------------
        cursor.execute("""
            SELECT organization_id
            FROM stores
            WHERE store_id = %s
        """, (ticket.store_id,))

        store = cursor.fetchone()

        if not store:
            raise HTTPException(
                status_code=404,
                detail="Store not found"
            )

        organization_id = (
            store[0]
            if store[0] is not None
            else None
        )

        # -------------------------------------------------
        # RECORD CASH EVENT
        # -------------------------------------------------
        print("💰 INSERTING CASH EVENT:", total_revenue)

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
            organization_id,
            ticket.store_id,
            "sale",
            1,
            total_revenue,
            "POS sale",
            ticket_id
        ))

        conn.commit()

        return {
            "message": "Sale recorded",
            "status": "accepted",
            "ticket_id": ticket_id,
            "client_event_id": ticket.client_event_id
        }

    except psycopg2.errors.UniqueViolation:
        conn.rollback()

        # A concurrent request may have recorded the same
        # client_event_id after the initial duplicate check.
        if ticket.client_event_id:
            cursor.execute("""
                SELECT ticket_id
                FROM events
                WHERE store_id = %s
                  AND client_event_id = %s
                LIMIT 1
            """, (
                ticket.store_id,
                ticket.client_event_id
            ))

            existing = cursor.fetchone()

            if existing:
                return {
                    "message": "Sale already recorded",
                    "status": "already_processed",
                    "ticket_id": existing[0],
                    "client_event_id": ticket.client_event_id
                }

        raise HTTPException(
            status_code=409,
            detail="Duplicate sale event"
        )

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        print("🔥 SALE TICKET ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        cursor.close()
        conn.close()
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

@app.get("/intake-history")
def intake_history(
    store_id: int,
    start_date: str,
    end_date: str
):
    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                ticket_id,
                MIN(event_datetime::timestamptz) AS intake_datetime,
                COUNT(*) AS product_lines,
                SUM(quantity) AS total_units,
                SUM(quantity * cost_at_time) AS total_cost
            FROM events
            WHERE store_id = %s
              AND event_type = 'intake'
              AND ticket_id IS NOT NULL
              AND event_datetime::timestamptz >= %s::date
              AND event_datetime::timestamptz < (%s::date + INTERVAL '1 day')
            GROUP BY ticket_id
            ORDER BY intake_datetime DESC, ticket_id DESC
        """, (
            store_id,
            start_date,
            end_date
        ))

        rows = cursor.fetchall()

        return {
            "store_id": store_id,
            "start_date": start_date,
            "end_date": end_date,
            "intakes": [
                {
                    "ticket_id": row[0],
                    "datetime": row[1].isoformat() if row[1] else None,
                    "product_lines": row[2],
                    "total_units": row[3],
                    "total_cost": round(float(row[4] or 0), 2)
                }
                for row in rows
            ]
        }

    except Exception as e:
        print("INTAKE HISTORY ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()

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
    conn = None
    cursor = None

    try:
        if not ticket.items:
            raise HTTPException(
                status_code=400,
                detail="Intake ticket must contain at least one item"
            )

        for item in ticket.items:
            if item.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Item quantity must be greater than zero"
                )

            if item.cost < 0:
                raise HTTPException(
                    status_code=400,
                    detail="Item cost cannot be negative"
                )

            if item.price < 0:
                raise HTTPException(
                    status_code=400,
                    detail="Item price cannot be negative"
                )

        conn = db()
        cursor = conn.cursor()

        # ---------------------------------------------
        # IDEMPOTENCY CHECK
        # ---------------------------------------------
        if ticket.client_event_id:
            cursor.execute(
                """
                SELECT ticket_id
                FROM events
                WHERE store_id = %s
                  AND client_event_id = %s
                  AND event_type = 'intake'
                LIMIT 1
                """,
                (
                    ticket.store_id,
                    ticket.client_event_id
                )
            )

            existing = cursor.fetchone()

            if existing:
                return {
                    "status": "already_processed",
                    "ticket_id": existing[0],
                    "client_event_id":
                        ticket.client_event_id
                }

        # ---------------------------------------------
        # SERIALIZE TICKET ID GENERATION
        # ---------------------------------------------
        cursor.execute(
            """
            SELECT pg_advisory_xact_lock(%s)
            """,
            (1269002,)
        )

        cursor.execute(
            """
            SELECT COALESCE(MAX(ticket_id), 0)
            FROM events
            """
        )

        ticket_id = cursor.fetchone()[0] + 1

        now = datetime.now(
            timezone.utc
        ).isoformat()

        total_cost = 0.0

        # ---------------------------------------------
        # PROCESS INTAKE ITEMS
        # ---------------------------------------------
        for item in ticket.items:
            cursor.execute(
                """
                SELECT name
                FROM products
                WHERE product_id = %s
                  AND store_id = %s
                  AND is_active = 1
                """,
                (
                    item.product_id,
                    ticket.store_id
                )
            )

            product = cursor.fetchone()

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"Product {item.product_id} "
                        "not found"
                    )
                )

            product_name = product[0]

            quantity = int(item.quantity)
            cost = round(
                float(item.cost),
                2
            )
            price = round(
                float(item.price),
                2
            )

            cursor.execute(
                """
                INSERT INTO events (
                    store_id,
                    event_type,
                    product_id,
                    product_name_at_time,
                    quantity,
                    cost_at_time,
                    price_at_time,
                    event_datetime,
                    ticket_id,
                    client_event_id,
                    device_id,
                    client_created_at
                )
                VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s
                )
                """,
                (
                    ticket.store_id,
                    "intake",
                    item.product_id,
                    product_name,
                    quantity,
                    cost,
                    price,
                    now,
                    ticket_id,
                    ticket.client_event_id,
                    ticket.device_id,
                    ticket.client_created_at
                )
            )

            cursor.execute(
                """
                UPDATE products
                SET
                    stock =
                        COALESCE(stock, 0) + %s,
                    cost = %s,
                    price = %s
                WHERE product_id = %s
                  AND store_id = %s
                """,
                (
                    quantity,
                    cost,
                    price,
                    item.product_id,
                    ticket.store_id
                )
            )

            total_cost += (
                cost * quantity
            )

        total_cost = round(
            total_cost,
            2
        )

        # ---------------------------------------------
        # PAID INTAKE CASH OUTFLOW
        # ---------------------------------------------
        if ticket.paid:
            cursor.execute(
                """
                SELECT organization_id
                FROM stores
                WHERE store_id = %s
                """,
                (ticket.store_id,)
            )

            store = cursor.fetchone()

            if not store:
                raise HTTPException(
                    status_code=404,
                    detail="Store not found"
                )

            organization_id = store[0]

            cursor.execute(
                """
                INSERT INTO cash_events (
                    organization_id,
                    store_id,
                    type,
                    direction,
                    amount,
                    category,
                    note,
                    reference_id,
                    client_event_id,
                    device_id,
                    client_created_at
                )
                VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s
                )
                """,
                (
                    organization_id,
                    ticket.store_id,
                    "intake_paid",
                    -1,
                    total_cost,
                    "inventory",
                    "Paid intake",
                    ticket_id,
                    ticket.client_event_id,
                    ticket.device_id,
                    ticket.client_created_at
                )
            )

        conn.commit()

        return {
            "status": "accepted",
            "ticket_id": ticket_id,
            "client_event_id":
                ticket.client_event_id
        }

    except psycopg2.errors.UniqueViolation:
        if conn:
            conn.rollback()

        if (
            cursor and
            ticket.client_event_id
        ):
            cursor.execute(
                """
                SELECT ticket_id
                FROM events
                WHERE store_id = %s
                  AND client_event_id = %s
                  AND event_type = 'intake'
                LIMIT 1
                """,
                (
                    ticket.store_id,
                    ticket.client_event_id
                )
            )

            existing = cursor.fetchone()

            if existing:
                return {
                    "status":
                        "already_processed",
                    "ticket_id":
                        existing[0],
                    "client_event_id":
                        ticket.client_event_id
                }

        raise HTTPException(
            status_code=409,
            detail="Duplicate intake event"
        )

    except HTTPException:
        if conn:
            conn.rollback()

        raise

    except Exception as error:
        if conn:
            conn.rollback()

        print(
            "🔥 INTAKE ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
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
            SELECT
                product_id,
                name,
                stock,
                cost,
                price,
                is_active,
                tracks_stock,
                low_stock_threshold
            FROM products
            WHERE store_id = %s
              AND LOWER(name) LIKE %s
        """, (store_id, '%' + name.lower() + '%'))

    else:
        cursor.execute("""
            SELECT
                product_id,
                name,
                stock,
                cost,
                price,
                is_active,
                tracks_stock,
                low_stock_threshold
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
            "cost": row[3],
            "price": row[4],
            "is_active": row[5],
            "tracks_stock": row[6],
            "low_stock_threshold": row[7]
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
@app.post("/stock-adjustment")
def stock_adjustment(data: StockAdjustmentRequest):
    conn = None
    cursor = None

    try:
        if data.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be greater than zero"
            )

        if data.direction not in (
            "positive",
            "negative"
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Direction must be "
                    "'positive' or 'negative'"
                )
            )

        conn = db()
        cursor = conn.cursor()

        # ---------------------------------------------
        # IDEMPOTENCY CHECK
        # ---------------------------------------------
        if data.client_event_id:
            cursor.execute(
                """
                SELECT event_id
                FROM events
                WHERE store_id = %s
                  AND client_event_id = %s
                  AND event_type IN (
                    'stock_adjustment_positive',
                    'stock_adjustment_negative'
                  )
                LIMIT 1
                """,
                (
                    data.store_id,
                    data.client_event_id
                )
            )

            existing = cursor.fetchone()

            if existing:
                return {
                    "status": "already_processed",
                    "event_id": existing[0],
                    "client_event_id":
                        data.client_event_id
                }

        now = datetime.now(
            timezone.utc
        ).isoformat()

        cursor.execute(
            """
            SELECT
                name,
                cost,
                price,
                tracks_stock
            FROM products
            WHERE product_id = %s
              AND store_id = %s
              AND is_active = 1
            """,
            (
                data.product_id,
                data.store_id
            )
        )

        product = cursor.fetchone()

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        name, cost, price, tracks_stock = product

        if tracks_stock != 1:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Product does not track stock"
                )
            )

        event_type = (
            "stock_adjustment_positive"
            if data.direction == "positive"
            else "stock_adjustment_negative"
        )

        stock_delta = (
            data.quantity
            if data.direction == "positive"
            else -data.quantity
        )

        note_parts = []

        if data.reason:
            note_parts.append(
                f"Reason: {data.reason}"
            )

        if data.note:
            note_parts.append(
                f"Note: {data.note}"
            )

        adjustment_note = (
            " | ".join(note_parts)
            if note_parts
            else None
        )

        cursor.execute(
            """
            INSERT INTO events (
                store_id,
                event_type,
                product_id,
                product_name_at_time,
                quantity,
                cost_at_time,
                price_at_time,
                event_datetime,
                note,
                client_event_id,
                device_id,
                client_created_at
            )
            VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s
            )
            RETURNING event_id
            """,
            (
                data.store_id,
                event_type,
                data.product_id,
                name,
                data.quantity,
                cost,
                price,
                now,
                adjustment_note,
                data.client_event_id,
                data.device_id,
                data.client_created_at
            )
        )

        event_id = cursor.fetchone()[0]

        cursor.execute(
            """
            UPDATE products
            SET stock =
                COALESCE(stock, 0) + %s
            WHERE product_id = %s
              AND store_id = %s
              AND tracks_stock = 1
            """,
            (
                stock_delta,
                data.product_id,
                data.store_id
            )
        )

        conn.commit()

        return {
            "status": "accepted",
            "event_id": event_id,
            "event_type": event_type,
            "product_id": data.product_id,
            "product_name": name,
            "quantity": data.quantity,
            "stock_delta": stock_delta,
            "client_event_id":
                data.client_event_id
        }

    except psycopg2.errors.UniqueViolation:
        if conn:
            conn.rollback()

        if (
            cursor and
            data.client_event_id
        ):
            cursor.execute(
                """
                SELECT event_id
                FROM events
                WHERE store_id = %s
                  AND client_event_id = %s
                  AND event_type IN (
                    'stock_adjustment_positive',
                    'stock_adjustment_negative'
                  )
                LIMIT 1
                """,
                (
                    data.store_id,
                    data.client_event_id
                )
            )

            existing = cursor.fetchone()

            if existing:
                return {
                    "status":
                        "already_processed",
                    "event_id":
                        existing[0],
                    "client_event_id":
                        data.client_event_id
                }

        raise HTTPException(
            status_code=409,
            detail=(
                "Duplicate stock adjustment event"
            )
        )

    except HTTPException:
        if conn:
            conn.rollback()

        raise

    except Exception as error:
        if conn:
            conn.rollback()

        print(
            "🔥 STOCK ADJUSTMENT ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()

@app.post("/stock-transfer")
def stock_transfer(data: StockTransferRequest):
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero")

    if data.direction not in ["in", "out"]:
        raise HTTPException(status_code=400, detail="Direction must be 'in' or 'out'")

    conn = db()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        SELECT name, stock, cost, price, tracks_stock
        FROM products
        WHERE product_id = %s
          AND store_id = %s
          AND is_active = 1
    """, (data.product_id, data.store_id))

    product = cursor.fetchone()

    if not product:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")

    name, stock, cost, price, tracks_stock = product

    if tracks_stock != 1:
        conn.close()
        raise HTTPException(status_code=400, detail="Product does not track stock")

    if data.direction == "out" and stock < data.quantity:
        conn.close()
        raise HTTPException(status_code=400, detail="Not enough stock to transfer out")

    event_type = "transfer_in" if data.direction == "in" else "transfer_out"
    stock_delta = data.quantity if data.direction == "in" else -data.quantity

    cursor.execute("""
        INSERT INTO events (
            store_id,
            event_type,
            product_id,
            product_name_at_time,
            quantity,
            cost_at_time,
            price_at_time,
            event_datetime,
            note
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        data.store_id,
        event_type,
        data.product_id,
        name,
        data.quantity,
        cost,
        price,
        now,
        data.note
    ))

    cursor.execute("""
        UPDATE products
        SET stock = COALESCE(stock, 0) + %s
        WHERE product_id = %s
          AND store_id = %s
          AND tracks_stock = 1
    """, (stock_delta, data.product_id, data.store_id))

    conn.commit()
    conn.close()

    return {
        "message": "Stock transfer recorded",
        "event_type": event_type,
        "product_id": data.product_id,
        "product_name": name,
        "quantity": data.quantity,
        "stock_delta": stock_delta
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
def set_low_stock(
    store_id: int,
    product_id: int,
    threshold: int
):
    if threshold < 0:
        raise HTTPException(
            status_code=400,
            detail="Low stock threshold cannot be negative"
        )

    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE products
            SET
                low_stock_threshold = %s,
                lst_reviewed = CASE
                    WHEN %s > 0 THEN TRUE
                    ELSE FALSE
                END
            WHERE product_id = %s
              AND store_id = %s
            RETURNING
                product_id,
                low_stock_threshold,
                lst_reviewed
        """, (
            threshold,
            threshold,
            product_id,
            store_id
        ))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        conn.commit()

        return {
            "message": "Threshold updated",
            "product_id": row[0],
            "low_stock_threshold": row[1],
            "lst_reviewed": row[2]
        }

    except Exception:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()

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

@app.get("/product-movement-summary")
def product_movement_summary(store_id: int, start_date: str, end_date: str):
    conn = db()
    cursor = conn.cursor()

    cursor.execute("""
        WITH movement AS (
            SELECT
                product_id,
                product_name_at_time,
                SUM(CASE WHEN event_type = 'intake' THEN quantity ELSE 0 END) AS purchase,
                SUM(CASE WHEN event_type = 'sale' THEN quantity ELSE 0 END) AS sale,
                SUM(CASE WHEN event_type = 'loss' THEN quantity ELSE 0 END) AS loss,
                SUM(CASE WHEN event_type = 'transfer_in' THEN quantity ELSE 0 END) AS transfer_in,
                SUM(CASE WHEN event_type = 'transfer_out' THEN quantity ELSE 0 END) AS transfer_out,
                SUM(CASE WHEN event_type = 'stock_adjustment_positive' THEN quantity ELSE 0 END) AS adjustment_positive,
                SUM(CASE WHEN event_type = 'stock_adjustment_negative' THEN quantity ELSE 0 END) AS adjustment_negative
            FROM events
            WHERE store_id = %s
              AND event_datetime >= %s
              AND event_datetime < %s
              AND product_id IS NOT NULL
              AND event_type IN (
                'intake',
                'sale',
                'loss',
                'transfer_in',
                'transfer_out',
                'stock_adjustment_positive',
                'stock_adjustment_negative'
              )
            GROUP BY product_id, product_name_at_time
        )
        SELECT
            p.product_id,
            COALESCE(m.product_name_at_time, p.name) AS product_name,
            p.stock,
            m.purchase,
            m.sale,
            m.loss,
            m.transfer_in,
            m.transfer_out,
            m.adjustment_positive,
            m.adjustment_negative
        FROM movement m
        JOIN products p
          ON p.product_id = m.product_id
         AND p.store_id = %s
        WHERE p.tracks_stock = 1
        ORDER BY product_name
    """, (store_id, start_date, end_date, store_id))

    rows = cursor.fetchall()
    conn.close()

    summary = []

    for row in rows:
        (
            product_id,
            product_name,
            current_stock,
            purchase,
            sale,
            loss,
            transfer_in,
            transfer_out,
            adjustment_positive,
            adjustment_negative
        ) = row

        net_movement = (
            purchase
            - sale
            - loss
            + transfer_in
            - transfer_out
            + adjustment_positive
            - adjustment_negative
        )

        final_stock = current_stock
        initial_stock = current_stock - net_movement

        summary.append({
            "product_id": product_id,
            "product": product_name,
            "initial_stock": initial_stock,
            "purchase": purchase,
            "sale": sale,
            "loss": loss,
            "transfer_in": transfer_in,
            "transfer_out": transfer_out,
            "adjustment_positive": adjustment_positive,
            "adjustment_negative": adjustment_negative,
            "final_stock": final_stock
        })

    return {"summary": summary}
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

@app.get("/intake-ticket-details")
def intake_ticket_details(store_id: int, ticket_id: int):
    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                event_id,
                product_id,
                product_name_at_time,
                quantity,
                cost_at_time,
                price_at_time,
                event_datetime,
                note
            FROM events
            WHERE store_id = %s
              AND ticket_id = %s
              AND event_type = 'intake'
            ORDER BY event_id ASC
        """, (store_id, ticket_id))

        rows = cursor.fetchall()

        if not rows:
            raise HTTPException(
                status_code=404,
                detail="Intake ticket not found"
            )

        items = []
        total_units = 0
        total_cost = 0.0

        for row in rows:
            quantity = row[3] or 0
            unit_cost = float(row[4] or 0)
            line_cost = quantity * unit_cost

            total_units += quantity
            total_cost += line_cost

            items.append({
                "event_id": row[0],
                "product_id": row[1],
                "product_name": row[2],
                "quantity": quantity,
                "unit_cost": unit_cost,
                "price_at_time": float(row[5] or 0),
                "line_cost": round(line_cost, 2),
                "datetime": row[6],
                "note": row[7]
            })

        return {
            "ticket_id": ticket_id,
            "store_id": store_id,
            "datetime": rows[0][6],
            "product_lines": len(items),
            "total_units": total_units,
            "total_cost": round(total_cost, 2),
            "items": items
        }

    finally:
        cursor.close()
        conn.close()

@app.get("/product-diagnostics")
def product_diagnostics(store_id: int):
    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                product_id,
                name,
                stock,
                cost,
                price,
                is_active,
                tracks_stock,
                low_stock_threshold,
                lst_reviewed
            FROM products
            WHERE store_id = %s
              AND is_active = 1
              AND (
                    price < cost
                 OR cost = 0
                 OR price = 0
                 OR stock < 0
                 OR (
                        low_stock_threshold = 0
                    AND lst_reviewed = FALSE
                 )
              )
            ORDER BY LOWER(name)
        """, (store_id,))

        rows = cursor.fetchall()
        products = []

        for row in rows:
            product_id = row[0]
            name = row[1]
            stock = row[2] or 0
            cost = float(row[3] or 0)
            price = float(row[4] or 0)
            is_active = row[5]
            tracks_stock = row[6]
            low_stock_threshold = row[7] or 0
            lst_reviewed = bool(row[8])

            issues = []

            if price < cost:
                issues.append({
                    "type": "price_below_cost",
                    "label": "Price below cost",
                    "recommended_action": "price_change"
                })

            if cost == 0:
                issues.append({
                    "type": "zero_cost",
                    "label": "Cost is zero",
                    "recommended_action": "price_change"
                })

            if price == 0:
                issues.append({
                    "type": "zero_price",
                    "label": "Price is zero",
                    "recommended_action": "price_change"
                })

            if stock < 0:
                issues.append({
                    "type": "negative_stock",
                    "label": "Stock is negative",
                    "recommended_action": "stock_adjustment"
                })

            if low_stock_threshold == 0 and not lst_reviewed:
                issues.append({
                    "type": "lst_unreviewed",
                    "label": "Low stock threshold requires review",
                    "recommended_action": "review_lst"
                })

            products.append({
                "product_id": product_id,
                "name": name,
                "stock": stock,
                "cost": cost,
                "price": price,
                "is_active": is_active,
                "tracks_stock": tracks_stock,
                "low_stock_threshold": low_stock_threshold,
                "lst_reviewed": lst_reviewed,
                "issues": issues
            })

        return {
            "store_id": store_id,
            "product_count": len(products),
            "issue_count": sum(
                len(product["issues"])
                for product in products
            ),
            "products": products
        }

    finally:
        cursor.close()
        conn.close()
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
    if low_stock_threshold < 0:
        raise HTTPException(
            status_code=400,
            detail="Low stock threshold cannot be negative"
        )

    if not name or not name.strip():
        raise HTTPException(
            status_code=400,
            detail="Product name is required"
        )

    if isinstance(tracks_stock, bool):
        tracks_stock_value = 1 if tracks_stock else 0
    elif isinstance(tracks_stock, str):
        tracks_stock_value = (
            1
            if tracks_stock.lower() in ["1", "true", "yes"]
            else 0
        )
    else:
        tracks_stock_value = 1 if tracks_stock else 0

    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE products
            SET
                name = %s,
                low_stock_threshold = %s,
                lst_reviewed = CASE
                    WHEN %s > 0 THEN TRUE
                    ELSE FALSE
                END,
                tracks_stock = %s
            WHERE product_id = %s
              AND store_id = %s
            RETURNING
                product_id,
                name,
                low_stock_threshold,
                lst_reviewed,
                tracks_stock
        """, (
            name.strip(),
            low_stock_threshold,
            low_stock_threshold,
            tracks_stock_value,
            product_id,
            store_id
        ))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        conn.commit()

        return {
            "message": "Product updated",
            "product_id": row[0],
            "name": row[1],
            "low_stock_threshold": row[2],
            "lst_reviewed": row[3],
            "tracks_stock": row[4]
        }

    except Exception:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()

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

@app.post("/review-lst")
def review_lst(data: ReviewLSTRequest):
    if data.low_stock_threshold < 0:
        raise HTTPException(
            status_code=400,
            detail="Low stock threshold cannot be negative"
        )

    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE products
            SET
                low_stock_threshold = %s,
                lst_reviewed = TRUE
            WHERE store_id = %s
              AND product_id = %s
              AND is_active = 1
            RETURNING
                product_id,
                low_stock_threshold,
                lst_reviewed
        """, (
            data.low_stock_threshold,
            data.store_id,
            data.product_id
        ))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Active product not found"
            )

        conn.commit()

        return {
            "message": "Low stock threshold reviewed",
            "product_id": row[0],
            "low_stock_threshold": row[1],
            "lst_reviewed": row[2]
        }

    except Exception:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()
        
@app.get("/sales-analysis")
def sales_analysis(
    store_id: int,
    start_date: date,
    end_date: date
):
    conn = None
    cursor = None

    try:
        period = build_period_boundaries(
            start_date,
            end_date
        )

        conn = db()
        cursor = conn.cursor()

        analysis = build_sales_analysis_data(
            cursor=cursor,
            store_id=store_id,
            start_datetime=period["start"],
            end_exclusive=period["end_exclusive"],
            days_in_period=period["days"]
        )

        summary = analysis["summary"]

        return {
            "summary": {
                "revenue": summary["revenue"],
                "profit": summary["gross_profit"],
                "tickets": summary["tickets"],
                "avg_daily_revenue":
                    summary["average_daily_revenue"],
                "avg_daily_profit":
                    summary["average_daily_profit"],
                "avg_ticket_value":
                    summary["average_ticket"]
            },
            "top_revenue_products":
                analysis["top_revenue_products"],
            "top_profit_products":
                analysis["top_profit_products"],
            "top_volume_products":
                analysis["top_volume_products"]
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "🔥 SALES ANALYSIS ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()

@app.get("/internal/weekly-briefing-data")
def weekly_briefing_data(
    store_id: int,
    week_end: Optional[date] = None
):
    conn = None
    cursor = None

    try:
        # ---------------------------------------------
        # RESOLVE REPORT PERIOD
        # ---------------------------------------------
        if week_end is None:
            week_end = (
                datetime.now(
                    timezone.utc
                ).date()
                - timedelta(days=1)
            )

        week_start = (
            week_end
            - timedelta(days=6)
        )

        previous_end = (
            week_start
            - timedelta(days=1)
        )

        previous_start = (
            previous_end
            - timedelta(days=6)
        )

        current_period = (
            build_period_boundaries(
                week_start,
                week_end
            )
        )

        previous_period = (
            build_period_boundaries(
                previous_start,
                previous_end
            )
        )

        # ---------------------------------------------
        # DATABASE
        # ---------------------------------------------
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                name,
                organization_id
            FROM stores
            WHERE store_id = %s
            """,
            (store_id,)
        )

        store = cursor.fetchone()

        if not store:
            raise HTTPException(
                status_code=404,
                detail="Store not found"
            )

        store_name = store[0]
        organization_id = store[1]

        # ---------------------------------------------
        # CURRENT WEEK SALES + INVENTORY
        # ---------------------------------------------
        current_analysis = (
            build_sales_analysis_data(
                cursor=cursor,
                store_id=store_id,
                start_datetime=
                    current_period["start"],
                end_exclusive=
                    current_period[
                        "end_exclusive"
                    ],
                days_in_period=
                    current_period["days"]
            )
        )

        # ---------------------------------------------
        # PREVIOUS WEEK SALES + INVENTORY
        # ---------------------------------------------
        previous_analysis = (
            build_sales_analysis_data(
                cursor=cursor,
                store_id=store_id,
                start_datetime=
                    previous_period["start"],
                end_exclusive=
                    previous_period[
                        "end_exclusive"
                    ],
                days_in_period=
                    previous_period["days"]
            )
        )

        # ---------------------------------------------
        # CURRENT WEEK CASH ACTIVITY
        # ---------------------------------------------
        current_cash = (
            build_cash_activity_data(
                cursor=cursor,
                store_id=store_id,
                start_datetime=
                    current_period["start"],
                end_exclusive=
                    current_period[
                        "end_exclusive"
                    ]
            )
        )

        # ---------------------------------------------
        # PREVIOUS WEEK CASH ACTIVITY
        # ---------------------------------------------
        previous_cash = (
            build_cash_activity_data(
                cursor=cursor,
                store_id=store_id,
                start_datetime=
                    previous_period["start"],
                end_exclusive=
                    previous_period[
                        "end_exclusive"
                    ]
            )
        )

        current_summary = (
            current_analysis["summary"]
        )

        previous_summary = (
            previous_analysis["summary"]
        )

        # ---------------------------------------------
        # PERIOD COMPARISON
        # ---------------------------------------------
        comparison = {
            "revenue_change_percent":
                calculate_percent_change(
                    current_summary["revenue"],
                    previous_summary["revenue"]
                ),

            "profit_change_percent":
                calculate_percent_change(
                    current_summary[
                        "gross_profit"
                    ],
                    previous_summary[
                        "gross_profit"
                    ]
                ),

            "ticket_change_percent":
                calculate_percent_change(
                    current_summary["tickets"],
                    previous_summary["tickets"]
                ),

            "average_ticket_change_percent":
                calculate_percent_change(
                    current_summary[
                        "average_ticket"
                    ],
                    previous_summary[
                        "average_ticket"
                    ]
                ),

            "units_sold_change_percent":
                calculate_percent_change(
                    current_summary[
                        "units_sold"
                    ],
                    previous_summary[
                        "units_sold"
                    ]
                ),

            "margin_change_points": (
                round(
                    current_summary[
                        "gross_margin_percent"
                    ]
                    -
                    previous_summary[
                        "gross_margin_percent"
                    ],
                    2
                )
                if (
                    current_summary["revenue"] > 0
                    and
                    previous_summary["revenue"] > 0
                )
                else None
            ),

            "cash_inflow_change_percent":
                calculate_percent_change(
                    current_cash[
                        "total_inflows"
                    ],
                    previous_cash[
                        "total_inflows"
                    ]
                ),

            "cash_outflow_change_percent":
                calculate_percent_change(
                    current_cash[
                        "total_outflows"
                    ],
                    previous_cash[
                        "total_outflows"
                    ]
                ),

            "net_cash_movement_change_percent":
                calculate_percent_change(
                    current_cash[
                        "net_cash_movement"
                    ],
                    previous_cash[
                        "net_cash_movement"
                    ]
                )
        }

        # ---------------------------------------------
        # DEFAULT INVENTORY OBJECT
        # ---------------------------------------------
        empty_inventory = {
            "intake_tickets": 0,
            "intake_units": 0,
            "intake_cost": 0.0,

            "positive_adjustment_events": 0,
            "positive_adjustment_units": 0,

            "negative_adjustment_events": 0,
            "negative_adjustment_units": 0,

            "loss_events": 0,
            "loss_units": 0,
            "loss_cost": 0.0,

            "transfer_in_events": 0,
            "transfer_in_units": 0,

            "transfer_out_events": 0,
            "transfer_out_units": 0
        }

        # ---------------------------------------------
        # RESPONSE
        # ---------------------------------------------
        return {
            "metadata": {
                "store_id":
                    store_id,

                "store_name":
                    store_name,

                "organization_id":
                    organization_id,

                "period_start":
                    week_start.isoformat(),

                "period_end":
                    week_end.isoformat(),

                "previous_period_start":
                    previous_start.isoformat(),

                "previous_period_end":
                    previous_end.isoformat(),

                "days_in_period":
                    current_period["days"],

                "generated_at":
                    datetime.now(
                        timezone.utc
                    ).isoformat()
            },

            "sales":
                current_summary,

            "previous_sales":
                previous_summary,

            "comparison":
                comparison,

            "products": {
                "top_revenue":
                    current_analysis[
                        "top_revenue_products"
                    ],

                "top_profit":
                    current_analysis[
                        "top_profit_products"
                    ],

                "top_volume":
                    current_analysis[
                        "top_volume_products"
                    ]
            },

            "inventory": {
                "current_week":
                    current_analysis.get(
                        "inventory",
                        empty_inventory.copy()
                    ),

                "previous_week":
                    previous_analysis.get(
                        "inventory",
                        empty_inventory.copy()
                    )
            },

            "cash": {
                "current_week":
                    current_cash,

                "previous_week":
                    previous_cash
            }
        }

    except HTTPException:
        if conn:
            conn.rollback()

        raise

    except Exception as error:
        if conn:
            conn.rollback()

        print(
            "🔥 WEEKLY BRIEFING DATA ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
            

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
    conn = None
    cursor = None

    try:
        if data.type not in ("revenue", "expense"):
            raise HTTPException(
                status_code=400,
                detail="Cash event type must be revenue or expense"
            )

        if data.amount <= 0:
            raise HTTPException(
                status_code=400,
                detail="Amount must be greater than zero"
            )

        conn = db()
        cursor = conn.cursor()

        # ---------------------------------------------
        # IDEMPOTENCY CHECK
        # ---------------------------------------------
        if data.client_event_id:
            cursor.execute(
                """
                SELECT 1
                FROM cash_events
                WHERE store_id = %s
                  AND client_event_id = %s
                LIMIT 1
                """,
                (
                    data.store_id,
                    data.client_event_id
                )
            )

            if cursor.fetchone():
                return {
                    "status": "already_processed",
                    "client_event_id":
                        data.client_event_id
                }

        # ---------------------------------------------
        # VALIDATE STORE
        # ---------------------------------------------
        cursor.execute(
            """
            SELECT organization_id
            FROM stores
            WHERE store_id = %s
            """,
            (data.store_id,)
        )

        store = cursor.fetchone()

        if not store:
            raise HTTPException(
                status_code=404,
                detail="Store not found"
            )

        organization_id = store[0]

        direction = (
            1
            if data.type == "revenue"
            else -1
        )

        # ---------------------------------------------
        # RECORD CASH EVENT
        # ---------------------------------------------
        cursor.execute(
            """
            INSERT INTO cash_events (
                organization_id,
                store_id,
                type,
                direction,
                amount,
                category,
                note,
                client_event_id,
                device_id,
                client_created_at
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            """,
            (
                organization_id,
                data.store_id,
                data.type,
                direction,
                data.amount,
                data.category,
                data.note,
                data.client_event_id,
                data.device_id,
                data.client_created_at
            )
        )

        conn.commit()

        return {
            "status": "accepted",
            "client_event_id":
                data.client_event_id
        }

    except psycopg2.errors.UniqueViolation:
        if conn:
            conn.rollback()

        return {
            "status": "already_processed",
            "client_event_id":
                data.client_event_id
        }

    except HTTPException:
        if conn:
            conn.rollback()

        raise

    except Exception as error:
        if conn:
            conn.rollback()

        print(
            "🔥 CASH EVENT ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()

@app.post("/returns")
def process_return(data: ReturnRequest):
    conn = db()
    cursor = conn.cursor()

    try:
        # -------------------------------------------------
        # VALIDATION
        # -------------------------------------------------
        if data.amount <= 0:
            raise HTTPException(
                status_code=400,
                detail="Return/refund amount must be greater than zero"
            )

        for item in data.items:
            if item.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Returned quantity must be greater than zero"
                )

            if item.cost < 0 or item.price < 0:
                raise HTTPException(
                    status_code=400,
                    detail="Returned item cost and price cannot be negative"
                )

        event_type = "return" if data.items else "refund"

        # -------------------------------------------------
        # IDEMPOTENCY CHECK
        # -------------------------------------------------
        if data.client_event_id:
            cursor.execute("""
                SELECT ticket_id
                FROM events
                WHERE store_id = %s
                  AND client_event_id = %s
                LIMIT 1
            """, (
                data.store_id,
                data.client_event_id
            ))

            existing_event = cursor.fetchone()

            if existing_event:
                return {
                    "message": "Return/refund already recorded",
                    "status": "already_processed",
                    "type": event_type,
                    "ticket_id": existing_event[0],
                    "client_event_id": data.client_event_id
                }

            # Refund-only operations do not create a product
            # event, so cash_events must also be checked.
            cursor.execute("""
                SELECT reference_id
                FROM cash_events
                WHERE store_id = %s
                  AND client_event_id = %s
                LIMIT 1
            """, (
                data.store_id,
                data.client_event_id
            ))

            existing_cash = cursor.fetchone()

            if existing_cash:
                return {
                    "message": "Return/refund already recorded",
                    "status": "already_processed",
                    "type": event_type,
                    "ticket_id": existing_cash[0],
                    "client_event_id": data.client_event_id
                }

        # -------------------------------------------------
        # GENERATE TICKET ID ONLY FOR PRODUCT RETURNS
        # -------------------------------------------------
        ticket_id = None

        if data.items:
            # Use the same lock as sales because both draw
            # ticket IDs from the events table.
            cursor.execute(
                "SELECT pg_advisory_xact_lock(%s)",
                (1269001,)
            )

            cursor.execute("""
                SELECT COALESCE(MAX(ticket_id), 0)
                FROM events
            """)

            ticket_id = cursor.fetchone()[0] + 1

        now = datetime.now(timezone.utc).isoformat()

        # -------------------------------------------------
        # PROCESS RETURNED ITEMS
        # -------------------------------------------------
        for item in data.items:
            cursor.execute("""
                SELECT
                    name,
                    tracks_stock
                FROM products
                WHERE product_id = %s
                  AND store_id = %s
                  AND is_active = 1
            """, (
                item.product_id,
                data.store_id
            ))

            product = cursor.fetchone()

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product {item.product_id} not found"
                )

            name, tracks_stock = product

            cost = round(float(item.cost), 2)
            price = round(float(item.price), 2)

            cursor.execute("""
                INSERT INTO events (
                    store_id,
                    event_type,
                    product_id,
                    product_name_at_time,
                    quantity,
                    cost_at_time,
                    price_at_time,
                    event_datetime,
                    ticket_id,
                    note,
                    client_event_id,
                    device_id,
                    client_created_at
                )
                VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                )
            """, (
                data.store_id,
                "return",
                item.product_id,
                name,
                item.quantity,
                cost,
                price,
                now,
                ticket_id,
                data.note,
                data.client_event_id,
                data.device_id,
                data.client_created_at
            ))

            if tracks_stock == 1:
                cursor.execute("""
                    UPDATE products
                    SET stock = COALESCE(stock, 0) + %s
                    WHERE product_id = %s
                      AND store_id = %s
                      AND tracks_stock = 1
                """, (
                    item.quantity,
                    item.product_id,
                    data.store_id
                ))

        # -------------------------------------------------
        # GET ORGANIZATION
        # -------------------------------------------------
        cursor.execute("""
            SELECT organization_id
            FROM stores
            WHERE store_id = %s
        """, (data.store_id,))

        store = cursor.fetchone()

        if not store:
            raise HTTPException(
                status_code=404,
                detail="Store not found"
            )

        organization_id = (
            store[0]
            if store[0] is not None
            else None
        )

        # -------------------------------------------------
        # RECORD CASH OUTFLOW
        # -------------------------------------------------
        cursor.execute("""
            INSERT INTO cash_events (
                organization_id,
                store_id,
                type,
                direction,
                amount,
                category,
                note,
                reference_id,
                created_at,
                client_event_id,
                device_id,
                client_created_at
            )
            VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s
            )
        """, (
            organization_id,
            data.store_id,
            event_type,
            -1,
            round(float(data.amount), 2),
            "Devolucion",
            data.note,
            ticket_id,
            now,
            data.client_event_id,
            data.device_id,
            data.client_created_at
        ))

        conn.commit()

        return {
            "message": "Return/refund recorded",
            "status": "accepted",
            "type": event_type,
            "ticket_id": ticket_id,
            "client_event_id": data.client_event_id
        }

    except psycopg2.errors.UniqueViolation:
        conn.rollback()

        if data.client_event_id:
            cursor.execute("""
                SELECT ticket_id
                FROM events
                WHERE store_id = %s
                  AND client_event_id = %s
                LIMIT 1
            """, (
                data.store_id,
                data.client_event_id
            ))

            existing_event = cursor.fetchone()

            if existing_event:
                return {
                    "message": "Return/refund already recorded",
                    "status": "already_processed",
                    "type": "return" if data.items else "refund",
                    "ticket_id": existing_event[0],
                    "client_event_id": data.client_event_id
                }

            cursor.execute("""
                SELECT reference_id
                FROM cash_events
                WHERE store_id = %s
                  AND client_event_id = %s
                LIMIT 1
            """, (
                data.store_id,
                data.client_event_id
            ))

            existing_cash = cursor.fetchone()

            if existing_cash:
                return {
                    "message": "Return/refund already recorded",
                    "status": "already_processed",
                    "type": "return" if data.items else "refund",
                    "ticket_id": existing_cash[0],
                    "client_event_id": data.client_event_id
                }

        raise HTTPException(
            status_code=409,
            detail="Duplicate return/refund event"
        )

    except HTTPException:
        conn.rollback()
        raise

    except Exception as error:
        conn.rollback()

        print(
            "🔥 RETURN ERROR:",
            str(error)
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:
        cursor.close()
        conn.close()
        
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
