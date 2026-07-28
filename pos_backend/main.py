from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pos_backend.rebuild_products import rebuild_products
from pwdlib import PasswordHash
from datetime import date, datetime, timezone, time, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
import pandas as pd
from fastapi import UploadFile, File, HTTPException, Form, Depends, status
import os
import psycopg2
import jwt

from jwt.exceptions import InvalidTokenError
from fastapi.security import (
    OAuth2PasswordBearer
)

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
    return psycopg2.connect(
        os.environ.get("DATABASE_URL")
    )


# ----------------------------------------------------
# PASSWORD HASHING
# ----------------------------------------------------
password_hash = PasswordHash.recommended()


def hash_password(
    plain_password: str
) -> str:
    return password_hash.hash(
        plain_password
    )


def verify_password(
    plain_password: str,
    stored_hash: str
) -> bool:
    try:
        return password_hash.verify(
            plain_password,
            stored_hash
        )

    except Exception:
        return False

JWT_SECRET_KEY = os.environ.get(
    "JWT_SECRET_KEY"
)

JWT_ALGORITHM = "HS256"

JWT_ACCESS_TOKEN_MINUTES = int(
    os.environ.get(
        "JWT_ACCESS_TOKEN_MINUTES",
        "10080"
    )
)


if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable "
        "is required"
    )

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/login"
)

class AuthenticatedUser(BaseModel):
    user_id: int
    store_id: int
    email: str

def create_access_token(
    user_id: int,
    store_id: int
) -> str:
    now = datetime.now(
        timezone.utc
    )

    expires_at = (
        now
        + timedelta(
            minutes=
                JWT_ACCESS_TOKEN_MINUTES
        )
    )

    payload = {
        # JWT subject values should be strings.
        "sub": str(user_id),

        "store_id": int(store_id),

        "iat": now,

        "exp": expires_at
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )

def get_current_user(
    token: str = Depends(
        oauth2_scheme
    )
) -> AuthenticatedUser:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=(
            "Invalid or expired "
            "authentication token"
        ),
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[
                JWT_ALGORITHM
            ],
            options={
                "require": [
                    "sub",
                    "store_id",
                    "iat",
                    "exp"
                ]
            }
        )

        user_id = int(
            payload["sub"]
        )

        token_store_id = int(
            payload["store_id"]
        )

    except (
        InvalidTokenError,
        ValueError,
        TypeError,
        KeyError
    ):
        raise credentials_error

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                user_id,
                store_id,
                email
            FROM users
            WHERE user_id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:
            raise credentials_error

        (
            database_user_id,
            database_store_id,
            email
        ) = user

        if (
            database_store_id is None
            or int(database_store_id)
            != token_store_id
        ):
            raise credentials_error

        return AuthenticatedUser(
            user_id=int(
                database_user_id
            ),
            store_id=int(
                database_store_id
            ),
            email=str(
                email
            )
        )

    except HTTPException:
        raise

    except Exception as error:
        print(
            "AUTHENTICATION ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to validate "
                "authentication"
            )
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()

        
# ----------------------------------------------------
# DATABASE INITIALIZATION
# ----------------------------------------------------
def init_db():

    conn = db()
    cursor = conn.cursor()

    # ---------------------------------------------
    # USERS
    # ---------------------------------------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        password_hash TEXT,
        store_id INTEGER,
        created_at TEXT
    )
    """)

    # Existing databases
    cursor.execute("""
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT
    """)

    # ---------------------------------------------
    # STORES
    # ---------------------------------------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stores (
        store_id SERIAL PRIMARY KEY,
        name TEXT,
        created_at TEXT,
        organization_id INTEGER
    )
    """)

    # ---------------------------------------------
    # PRODUCTS
    # ---------------------------------------------
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

    # ---------------------------------------------
    # EVENTS
    # ---------------------------------------------
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

    cursor.close()
    conn.close()

def round_money(value):
    return round(float(value or 0), 2)

password_hash = (
    PasswordHash.recommended()
)


def hash_password(
    plain_password: str
) -> str:
    return password_hash.hash(
        plain_password
    )


def verify_password(
    plain_password: str,
    stored_hash: str
) -> bool:
    try:
        return password_hash.verify(
            plain_password,
            stored_hash
        )
    except Exception:
        return False


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


def build_growth_history_data(
    cursor,
    store_id: int
):
    # ---------------------------------------------
    # FIRST AND LAST RECORDED SALES
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT
            MIN(
                event_datetime::timestamp
            ),
            MAX(
                event_datetime::timestamp
            ),
            COUNT(
                DISTINCT (
                    event_datetime::timestamp
                )::date
            )
        FROM events
        WHERE store_id = %s
          AND event_type = 'sale'
        """,
        (store_id,)
    )

    row = cursor.fetchone()

    first_sale_datetime = row[0]
    last_sale_datetime = row[1]
    active_sales_days = int(
        row[2] or 0
    )

    if not first_sale_datetime:
        return {
            "first_recorded_sale_date":
                None,
            "last_recorded_sale_date":
                None,
            "calendar_days_of_history": 0,
            "completed_weeks_of_history": 0,
            "completed_months_of_history": 0,
            "active_sales_days": 0
        }

    first_sale_date = (
        first_sale_datetime.date()
    )

    last_sale_date = (
        last_sale_datetime.date()
    )

    today = datetime.now(
        timezone.utc
    ).date()

    calendar_days_of_history = (
        today - first_sale_date
    ).days + 1

    completed_weeks_of_history = (
        calendar_days_of_history // 7
    )

    completed_months_of_history = (
        calendar_days_of_history // 30
    )

    return {
        "first_recorded_sale_date":
            first_sale_date.isoformat(),

        "last_recorded_sale_date":
            last_sale_date.isoformat(),

        "calendar_days_of_history":
            calendar_days_of_history,

        "completed_weeks_of_history":
            completed_weeks_of_history,

        "completed_months_of_history":
            completed_months_of_history,

        "active_sales_days":
            active_sales_days
    }

def classify_growth_data_readiness(
    history: dict
):
    completed_weeks = int(
        history.get(
            "completed_weeks_of_history",
            0
        ) or 0
    )

    completed_months = int(
        history.get(
            "completed_months_of_history",
            0
        ) or 0
    )

    if completed_months < 2:
        level = "insufficient_history"
        confidence = "very_low"

    elif completed_months < 3:
        level = "monthly_comparison"
        confidence = "low"

    elif completed_weeks < 26:
        level = "short_term_monthly_trend"
        confidence = "moderate"

    elif completed_weeks < 52:
        level = "quarterly_trend"
        confidence = "moderate"

    elif completed_weeks < 104:
        level = "annual_comparison"
        confidence = "high"

    else:
        level = "multi_year_trend"
        confidence = "high"

    return {
        "level": level,
        "confidence": confidence,

        "monthly_comparison_available":
            completed_months >= 2,

        "short_term_monthly_trend_available":
            completed_months >= 3,

        "quarterly_trend_available":
            completed_weeks >= 26,

        "annual_comparison_available":
            completed_weeks >= 52,

        "seasonal_comparison_available":
            completed_weeks >= 52,

        "multi_year_trend_available":
            completed_weeks >= 104,

        "inflation_adjustment_available":
            False
    }
    
def build_completed_month_periods(
    reference_date: Optional[date] = None
):
    if reference_date is None:
        reference_date = datetime.now(
            timezone.utc
        ).date()

    # First day of the current, still-open month.
    current_month_start = date(
        reference_date.year,
        reference_date.month,
        1
    )

    # Most recently completed calendar month.
    latest_completed_end = (
        current_month_start
        - timedelta(days=1)
    )

    latest_completed_start = date(
        latest_completed_end.year,
        latest_completed_end.month,
        1
    )

    # Calendar month immediately before it.
    previous_completed_end = (
        latest_completed_start
        - timedelta(days=1)
    )

    previous_completed_start = date(
        previous_completed_end.year,
        previous_completed_end.month,
        1
    )

    return {
        "current": {
            "start":
                latest_completed_start,

            "end":
                latest_completed_end,

            "boundaries":
                build_period_boundaries(
                    latest_completed_start,
                    latest_completed_end
                )
        },

        "previous": {
            "start":
                previous_completed_start,

            "end":
                previous_completed_end,

            "boundaries":
                build_period_boundaries(
                    previous_completed_start,
                    previous_completed_end
                )
        }
    }

def build_growth_period_summary(
    cursor,
    store_id: int,
    start_datetime: datetime,
    end_exclusive: datetime,
    days_in_period: int
):
    cursor.execute(
        """
        SELECT
            COALESCE(
                SUM(quantity * price_at_time),
                0
            ) AS revenue,

            COALESCE(
                SUM(quantity * cost_at_time),
                0
            ) AS cost,

            COALESCE(
                SUM(quantity),
                0
            ) AS units_sold,

            COUNT(
                DISTINCT ticket_id
            ) AS tickets,

            COUNT(
                DISTINCT (
                    event_datetime::timestamp
                )::date
            ) AS active_sales_days

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
    active_sales_days = int(row[4] or 0)

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

    return {
        "days_in_period":
            int(days_in_period),

        "active_sales_days":
            active_sales_days,

        "tickets":
            tickets,

        "units_sold":
            units_sold,

        "revenue":
            round_money(revenue),

        "cost":
            round_money(cost),

        "gross_profit":
            round_money(gross_profit),

        "gross_margin_percent":
            round(
                gross_margin_percent,
                2
            ),

        "average_ticket":
            round_money(
                average_ticket
            ),

        "units_per_ticket":
            round(
                units_per_ticket,
                2
            ),

        "average_daily_revenue":
            round_money(
                revenue / days_in_period
            ),

        "average_daily_gross_profit":
            round_money(
                gross_profit /
                days_in_period
            )
    }

def get_first_full_month_start(
    first_sale_date: Optional[date]
):
    if first_sale_date is None:
        return None

    if first_sale_date.day == 1:
        return first_sale_date

    if first_sale_date.month == 12:
        return date(
            first_sale_date.year + 1,
            1,
            1
        )

    return date(
        first_sale_date.year,
        first_sale_date.month + 1,
        1
    )

def build_completed_month_comparison(
    cursor,
    store_id: int,
    history: dict,
    reference_date: Optional[date] = None
):
    periods = build_completed_month_periods(
        reference_date
    )

    current_period = periods["current"]
    previous_period = periods["previous"]

    first_sale_value = history.get(
        "first_recorded_sale_date"
    )

    first_sale_date = (
        date.fromisoformat(
            first_sale_value
        )
        if first_sale_value
        else None
    )

    first_full_month_start = (
        get_first_full_month_start(
            first_sale_date
        )
    )

    current_is_complete = bool(
        first_full_month_start
        and
        current_period["start"]
        >= first_full_month_start
    )

    previous_is_complete = bool(
        first_full_month_start
        and
        previous_period["start"]
        >= first_full_month_start
    )

    comparison_available = (
        current_is_complete
        and previous_is_complete
    )

    current_summary = (
        build_growth_period_summary(
            cursor=cursor,
            store_id=store_id,
            start_datetime=
                current_period[
                    "boundaries"
                ]["start"],
            end_exclusive=
                current_period[
                    "boundaries"
                ]["end_exclusive"],
            days_in_period=
                current_period[
                    "boundaries"
                ]["days"]
        )
    )

    previous_summary = (
        build_growth_period_summary(
            cursor=cursor,
            store_id=store_id,
            start_datetime=
                previous_period[
                    "boundaries"
                ]["start"],
            end_exclusive=
                previous_period[
                    "boundaries"
                ]["end_exclusive"],
            days_in_period=
                previous_period[
                    "boundaries"
                ]["days"]
        )
    )

    if comparison_available:
        comparison = {
            "revenue_change_percent":
                calculate_percent_change(
                    current_summary["revenue"],
                    previous_summary["revenue"]
                ),

            "gross_profit_change_percent":
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

            "units_sold_change_percent":
                calculate_percent_change(
                    current_summary[
                        "units_sold"
                    ],
                    previous_summary[
                        "units_sold"
                    ]
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
            )
        }

        unavailable_reason = None

    else:
        comparison = None

        if first_sale_date is None:
            unavailable_reason = (
                "no_recorded_sales"
            )

        elif not previous_is_complete:
            unavailable_reason = (
                "previous_month_predates_"
                "complete_vendr_history"
            )

        elif not current_is_complete:
            unavailable_reason = (
                "current_comparison_month_"
                "predates_complete_vendr_history"
            )

        else:
            unavailable_reason = (
                "insufficient_complete_months"
            )

    return {
        "available":
            comparison_available,

        "unavailable_reason":
            unavailable_reason,

        "first_full_month_start": (
            first_full_month_start.isoformat()
            if first_full_month_start
            else None
        ),

        "current_month": {
            "period_start":
                current_period[
                    "start"
                ].isoformat(),

            "period_end":
                current_period[
                    "end"
                ].isoformat(),

            "fully_observed":
                current_is_complete,

            **current_summary
        },

        "previous_month": {
            "period_start":
                previous_period[
                    "start"
                ].isoformat(),

            "period_end":
                previous_period[
                    "end"
                ].isoformat(),

            "fully_observed":
                previous_is_complete,

            **previous_summary
        },

        "comparison":
            comparison
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


def build_catalog_profile_data(
    cursor,
    store_id: int,
    start_datetime: datetime,
    end_exclusive: datetime
):
    # ---------------------------------------------
    # ACTIVE CATALOG PROFILE
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT
            COUNT(*) FILTER (
                WHERE tracks_stock = 1
            ),
            COUNT(*) FILTER (
                WHERE tracks_stock != 1
                   OR tracks_stock IS NULL
            ),
            COUNT(*)
        FROM products
        WHERE store_id = %s
          AND is_active = 1
        """,
        (store_id,)
    )

    catalog_row = cursor.fetchone()

    tracked_catalog_count = int(
        catalog_row[0] or 0
    )

    service_catalog_count = int(
        catalog_row[1] or 0
    )

    active_catalog_count = int(
        catalog_row[2] or 0
    )

    # ---------------------------------------------
    # SALES MIX BY OFFERING TYPE
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT
            CASE
                WHEN COALESCE(
                    product.tracks_stock,
                    0
                ) = 1
                THEN 'inventory'
                ELSE 'service'
            END AS offering_type,

            COALESCE(
                SUM(event.quantity),
                0
            ) AS units,

            COALESCE(
                SUM(
                    event.quantity *
                    event.price_at_time
                ),
                0
            ) AS revenue,

            COUNT(
                DISTINCT event.ticket_id
            ) AS tickets

        FROM events AS event

        LEFT JOIN products AS product
          ON product.store_id =
                event.store_id
         AND product.product_id =
                event.product_id

        WHERE event.store_id = %s
          AND event.event_type = 'sale'
          AND event.event_datetime::timestamp >= %s
          AND event.event_datetime::timestamp < %s

        GROUP BY offering_type
        """,
        (
            store_id,
            start_datetime,
            end_exclusive
        )
    )

    sales_mix = {
        "inventory": {
            "units": 0,
            "revenue": 0.0,
            "tickets": 0,
            "revenue_percent": 0.0
        },
        "service": {
            "units": 0,
            "revenue": 0.0,
            "tickets": 0,
            "revenue_percent": 0.0
        }
    }

    for (
        offering_type,
        units,
        revenue,
        tickets
    ) in cursor.fetchall():
        key = (
            "inventory"
            if offering_type == "inventory"
            else "service"
        )

        sales_mix[key] = {
            "units": int(units or 0),
            "revenue":
                round_money(revenue),
            "tickets": int(tickets or 0),
            "revenue_percent": 0.0
        }

    total_sales_revenue = (
        sales_mix["inventory"]["revenue"]
        +
        sales_mix["service"]["revenue"]
    )

    if total_sales_revenue > 0:
        sales_mix["inventory"][
            "revenue_percent"
        ] = round(
            (
                sales_mix["inventory"]["revenue"]
                /
                total_sales_revenue
            ) * 100,
            2
        )

        sales_mix["service"][
            "revenue_percent"
        ] = round(
            (
                sales_mix["service"]["revenue"]
                /
                total_sales_revenue
            ) * 100,
            2
        )

    # ---------------------------------------------
    # PROFILE LABEL
    # ---------------------------------------------
    inventory_share = (
        sales_mix["inventory"][
            "revenue_percent"
        ]
    )

    service_share = (
        sales_mix["service"][
            "revenue_percent"
        ]
    )

    if service_share >= 80:
        business_model = "service_heavy"
    elif inventory_share >= 80:
        business_model = "inventory_heavy"
    else:
        business_model = "mixed"

    return {
        "active_catalog_count":
            active_catalog_count,

        "tracked_inventory_count":
            tracked_catalog_count,

        "service_offering_count":
            service_catalog_count,

        "business_model":
            business_model,

        "sales_mix":
            sales_mix
    }


def build_weekly_alerts_data(
    cursor,
    store_id: int,
    current_inventory: dict,
    current_sales: dict
):
    alerts = []

    # ---------------------------------------------
    # NEGATIVE STOCK
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM products
        WHERE store_id = %s
          AND is_active = 1
          AND tracks_stock = 1
          AND COALESCE(stock, 0) < 0
        """,
        (store_id,)
    )

    negative_stock_count = int(
        cursor.fetchone()[0] or 0
    )

    if negative_stock_count > 0:
        alerts.append({
            "severity": "warning",
            "code": "NEGATIVE_STOCK",
            "count": negative_stock_count,
            "message": (
                f"{negative_stock_count} active "
                "product(s) currently have "
                "negative stock."
            ),
            "review_panel": "low_stock",
            "review_label": "Low Stock"
        })

    # ---------------------------------------------
    # LOW STOCK
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM products
        WHERE store_id = %s
          AND is_active = 1
          AND tracks_stock = 1
          AND COALESCE(stock, 0) >= 0
          AND COALESCE(
                stock,
                0
              ) <= COALESCE(
                low_stock_threshold,
                0
              )
        """,
        (store_id,)
    )

    low_stock_count = int(
        cursor.fetchone()[0] or 0
    )

    if low_stock_count > 0:
        alerts.append({
            "severity": "attention",
            "code": "LOW_STOCK",
            "count": low_stock_count,
            "message": (
                f"{low_stock_count} active "
                "product(s) are at or below "
                "their configured low-stock "
                "threshold."
            ),
            "review_panel": "low_stock",
            "review_label": "Low Stock"
        })

    # ---------------------------------------------
    # ZERO COST
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM products
        WHERE store_id = %s
          AND is_active = 1
          AND COALESCE(cost, 0) = 0
        """,
        (store_id,)
    )

    zero_cost_count = int(
        cursor.fetchone()[0] or 0
    )

    if zero_cost_count > 0:
        alerts.append({
            "severity": "warning",
            "code": "ZERO_COST",
            "count": zero_cost_count,
            "message": (
                f"{zero_cost_count} active "
                "product or service record(s) "
                "have a cost of zero."
            ),
            "review_panel": "diagnostics",
            "review_label": "Diagnostics"
        })

    # ---------------------------------------------
    # ZERO PRICE
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM products
        WHERE store_id = %s
          AND is_active = 1
          AND COALESCE(price, 0) = 0
        """,
        (store_id,)
    )

    zero_price_count = int(
        cursor.fetchone()[0] or 0
    )

    if zero_price_count > 0:
        alerts.append({
            "severity": "warning",
            "code": "ZERO_PRICE",
            "count": zero_price_count,
            "message": (
                f"{zero_price_count} active "
                "product or service record(s) "
                "have a selling price of zero."
            ),
            "review_panel": "diagnostics",
            "review_label": "Diagnostics"
        })

    # ---------------------------------------------
    # PRICE BELOW COST
    # ---------------------------------------------
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM products
        WHERE store_id = %s
          AND is_active = 1
          AND COALESCE(price, 0)
              < COALESCE(cost, 0)
        """,
        (store_id,)
    )

    below_cost_count = int(
        cursor.fetchone()[0] or 0
    )

    if below_cost_count > 0:
        alerts.append({
            "severity": "warning",
            "code": "PRICE_BELOW_COST",
            "count": below_cost_count,
            "message": (
                f"{below_cost_count} active "
                "product or service record(s) "
                "have a selling price below "
                "their recorded cost."
            ),
            "review_panel": "diagnostics",
            "review_label": "Diagnostics"
        })

    # ---------------------------------------------
    # STOCK ADJUSTMENT ACTIVITY
    # ---------------------------------------------
    positive_units = int(
        current_inventory.get(
            "positive_adjustment_units",
            0
        ) or 0
    )

    negative_units = int(
        current_inventory.get(
            "negative_adjustment_units",
            0
        ) or 0
    )

    adjusted_units = (
        positive_units
        + negative_units
    )

    units_sold = int(
        current_sales.get(
            "units_sold",
            0
        ) or 0
    )

   
    if (
        adjusted_units >= 20
        and adjusted_units > units_sold
    ):
        alerts.append({
            "severity": "attention",
            "code":
                "HIGH_STOCK_ADJUSTMENT_ACTIVITY",
            "adjusted_units":
                adjusted_units,
            "positive_units":
                positive_units,
            "negative_units":
                negative_units,
            "units_sold":
                units_sold,
            "message": (
                "Stock adjustment activity was "
                "high relative to sales volume "
                "during the reporting period."
            ),
            "review_panel":
                "movement_summary",
            "review_label":
                "Movement Summary"
        })

    return {
        "count": len(alerts),
        "items": alerts
    }


def build_review_queue_data(alerts):

    queue = []

    for alert in alerts.get("items", []):

        priority = "medium"

        if alert["severity"] == "warning":
            priority = "high"

        elif alert["severity"] == "attention":
            priority = "medium"

        else:
            priority = "low"

        queue.append({
            "priority": priority,
            "panel": alert["review_panel"],
            "label": alert["review_label"],
            "reason": alert["message"]
        })

    priority_order = {
        "high": 0,
        "medium": 1,
        "low": 2
    }

    queue.sort(
        key=lambda item: (
            priority_order[item["priority"]],
            item["label"]
        )
    )

    return {
        "count": len(queue),
        "items": queue
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
def sale_ticket(
    ticket: SaleTicket,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    # -------------------------------------------------
    # AUTHORIZATION
    # -------------------------------------------------
    if current_user.store_id != ticket.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        # -------------------------------------------------
        # IDEMPOTENCY CHECK
        # -------------------------------------------------
        if ticket.client_event_id:
            cursor.execute(
                """
                SELECT ticket_id
                FROM events
                WHERE store_id = %s
                  AND client_event_id = %s
                  AND event_type = 'sale'
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
                    "message":
                        "Sale already recorded",

                    "status":
                        "already_processed",

                    "ticket_id":
                        existing[0],

                    "client_event_id":
                        ticket.client_event_id
                }

        # -------------------------------------------------
        # VALIDATE TICKET
        # -------------------------------------------------
        if not ticket.items:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Sale ticket must contain "
                    "at least one item"
                )
            )

        for item in ticket.items:
            if item.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Item quantity must be "
                        "greater than zero"
                    )
                )

            if item.price < 0:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Item price cannot be negative"
                    )
                )

        # -------------------------------------------------
        # SERIALIZE TICKET NUMBER GENERATION
        # -------------------------------------------------
        cursor.execute(
            """
            SELECT pg_advisory_xact_lock(%s)
            """,
            (1269001,)
        )

        cursor.execute(
            """
            SELECT COALESCE(
                MAX(ticket_id),
                0
            )
            FROM events
            """
        )

        ticket_id = (
            cursor.fetchone()[0] + 1
        )

        now = datetime.now(
            timezone.utc
        )

        total_revenue = 0.0

        # -------------------------------------------------
        # PROCESS SALE ITEMS
        # -------------------------------------------------
        for item in ticket.items:
            cursor.execute(
                """
                SELECT
                    name,
                    cost
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

            name, cost = product

            quantity = int(
                item.quantity
            )

            cost = round(
                float(cost or 0),
                2
            )

            price = round(
                float(item.price),
                2
            )

            line_total = round(
                price * quantity,
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
                    "sale",
                    item.product_id,
                    name,
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

            total_revenue += line_total

            # Stock is reduced only for tracked products.
            # Negative stock remains allowed.
            cursor.execute(
                """
                UPDATE products
                SET stock =
                    COALESCE(stock, 0) - %s
                WHERE product_id = %s
                  AND store_id = %s
                  AND tracks_stock = 1
                """,
                (
                    quantity,
                    item.product_id,
                    ticket.store_id
                )
            )

        total_revenue = round(
            total_revenue,
            2
        )

        # -------------------------------------------------
        # GET ORGANIZATION
        # -------------------------------------------------
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

        # -------------------------------------------------
        # RECORD CASH EVENT
        # -------------------------------------------------
        cursor.execute(
            """
            INSERT INTO cash_events (
                organization_id,
                store_id,
                type,
                direction,
                amount,
                note,
                reference_id,
                client_event_id,
                device_id,
                client_created_at
            )
            VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s
            )
            """,
            (
                organization_id,
                ticket.store_id,
                "sale",
                1,
                total_revenue,
                "POS sale",
                ticket_id,
                ticket.client_event_id,
                ticket.device_id,
                ticket.client_created_at
            )
        )

        conn.commit()

        return {
            "message":
                "Sale recorded",

            "status":
                "accepted",

            "ticket_id":
                ticket_id,

            "client_event_id":
                ticket.client_event_id
        }

    except psycopg2.errors.UniqueViolation:
        if conn:
            conn.rollback()

        # A concurrent retry may have inserted the
        # same client event after the first check.
        if (
            cursor
            and ticket.client_event_id
        ):
            cursor.execute(
                """
                SELECT ticket_id
                FROM events
                WHERE store_id = %s
                  AND client_event_id = %s
                  AND event_type = 'sale'
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
                    "message":
                        "Sale already recorded",

                    "status":
                        "already_processed",

                    "ticket_id":
                        existing[0],

                    "client_event_id":
                        ticket.client_event_id
                }

        raise HTTPException(
            status_code=409,
            detail="Duplicate sale event"
        )

    except HTTPException:
        if conn:
            conn.rollback()

        raise

    except Exception as error:
        if conn:
            conn.rollback()

        print(
            "SALE TICKET ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to record sale"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
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
    end_date: str,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                ticket_id,

                MIN(
                    event_datetime::timestamptz
                ) AS intake_datetime,

                COUNT(*) AS product_lines,

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
              AND event_type = 'intake'
              AND ticket_id IS NOT NULL

              AND (
                  event_datetime::timestamptz
                  AT TIME ZONE
                  'America/El_Salvador'
              )::date >= %s::date

              AND (
                  event_datetime::timestamptz
                  AT TIME ZONE
                  'America/El_Salvador'
              )::date <= %s::date

            GROUP BY ticket_id

            ORDER BY
                intake_datetime DESC,
                ticket_id DESC
            """,
            (
                store_id,
                start_date,
                end_date
            )
        )

        rows = cursor.fetchall()

        return {
            "store_id":
                store_id,

            "start_date":
                start_date,

            "end_date":
                end_date,

            "intakes": [
                {
                    "ticket_id":
                        row[0],

                    "datetime": (
                        row[1].isoformat()
                        if row[1]
                        else None
                    ),

                    "product_lines":
                        int(row[2] or 0),

                    "total_units":
                        int(row[3] or 0),

                    "total_cost":
                        round(
                            float(row[4] or 0),
                            2
                        )
                }
                for row in rows
            ]
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "INTAKE HISTORY ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load intake history"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
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
def intake_ticket(
    ticket: IntakeTicket,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    # ---------------------------------------------
    # AUTHORIZATION
    # ---------------------------------------------
    if current_user.store_id != ticket.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        # ---------------------------------------------
        # VALIDATE TICKET
        # ---------------------------------------------
        if not ticket.items:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Intake ticket must contain "
                    "at least one item"
                )
            )

        for item in ticket.items:
            if item.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Item quantity must be "
                        "greater than zero"
                    )
                )

            if item.cost < 0:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Item cost cannot be negative"
                    )
                )

            if item.price < 0:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Item price cannot be negative"
                    )
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
                    "status":
                        "already_processed",

                    "ticket_id":
                        existing[0],

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
            SELECT COALESCE(
                MAX(ticket_id),
                0
            )
            FROM events
            """
        )

        ticket_id = (
            cursor.fetchone()[0] + 1
        )

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

            quantity = int(
                item.quantity
            )

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
            "status":
                "accepted",

            "ticket_id":
                ticket_id,

            "client_event_id":
                ticket.client_event_id
        }

    except psycopg2.errors.UniqueViolation:
        if conn:
            conn.rollback()

        if (
            cursor
            and ticket.client_event_id
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
            "INTAKE ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to record intake"
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
def get_products(
    store_id: int,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                product_id,
                name,
                stock,
                cost,
                price,
                tracks_stock,
                low_stock_threshold

            FROM products

            WHERE store_id = %s
              AND is_active = 1

            ORDER BY
                LOWER(name) ASC
            """,
            (store_id,)
        )

        rows = cursor.fetchall()

        products = []

        for row in rows:
            products.append({
                "product_id":
                    row[0],

                "name":
                    row[1],

                "stock":
                    row[2],

                "cost":
                    float(row[3] or 0),

                "price":
                    float(row[4] or 0),

                "tracks_stock":
                    int(row[5] or 0),

                "low_stock_threshold":
                    int(row[6] or 0)
            })

        return {
            "products": products
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "GET PRODUCTS ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load products"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


@app.get("/products/search")
def search_products(
    store_id: int,
    name: str,
    include_inactive: bool = False,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        search_pattern = (
            f"%{name.strip().lower()}%"
        )

        if include_inactive:
            cursor.execute(
                """
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
                ORDER BY LOWER(name) ASC
                """,
                (
                    store_id,
                    search_pattern
                )
            )

        else:
            cursor.execute(
                """
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
                ORDER BY LOWER(name) ASC
                """,
                (
                    store_id,
                    search_pattern
                )
            )

        rows = cursor.fetchall()

        results = []

        for row in rows:
            results.append({
                "product_id":
                    row[0],

                "name":
                    row[1],

                "stock":
                    int(row[2] or 0),

                "cost":
                    float(row[3] or 0),

                "price":
                    float(row[4] or 0),

                "is_active":
                    int(row[5] or 0),

                "tracks_stock":
                    int(row[6] or 0),

                "low_stock_threshold":
                    int(row[7] or 0)
            })

        return {
            "products": results
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "SEARCH PRODUCTS ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to search products"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()

@app.get("/product/{product_id}")
def get_product(
    product_id: int,
    store_id: int,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                product_id,
                name,
                stock,
                cost,
                price
            FROM products
            WHERE product_id = %s
              AND store_id = %s
            """,
            (
                product_id,
                store_id
            )
        )

        row = cursor.fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        return {
            "product_id":
                row[0],

            "name":
                row[1],

            "stock":
                int(row[2] or 0),

            "cost":
                float(row[3] or 0),

            "price":
                float(row[4] or 0)
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "GET PRODUCT ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load product"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
    
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
def quick_items(
    store_id: int,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                e.product_id,
                p.name,
                p.stock,
                p.price,
                COUNT(*) AS sale_count
            FROM events e
            JOIN products p
              ON e.product_id = p.product_id
             AND e.store_id = p.store_id
            WHERE e.store_id = %s
              AND e.event_type = 'sale'
              AND e.event_datetime::timestamptz >=
                  NOW() - INTERVAL '90 days'
            GROUP BY
                e.product_id,
                p.name,
                p.stock,
                p.price
            ORDER BY sale_count DESC
            LIMIT 6
            """,
            (store_id,)
        )

        rows = cursor.fetchall()

        products = []

        for row in rows:
            products.append({
                "product_id":
                    row[0],

                "name":
                    row[1],

                "stock":
                    int(row[2] or 0),

                "price":
                    float(row[3] or 0)
            })

        return {
            "products": products
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "QUICK ITEMS ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load quick items"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
            
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
def get_low_stock(
    store_id: int,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    # ---------------------------------------------
    # AUTHORIZATION
    # ---------------------------------------------
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                product_id,
                name,
                stock,
                low_stock_threshold
            FROM products
            WHERE store_id = %s
              AND is_active = 1
              AND tracks_stock = 1
              AND stock <= low_stock_threshold
            ORDER BY LOWER(name) ASC
            """,
            (store_id,)
        )

        rows = cursor.fetchall()

        low_stock = []

        for row in rows:
            low_stock.append({
                "product_id":
                    row[0],

                "name":
                    row[1],

                "stock":
                    int(row[2] or 0),

                "threshold":
                    int(row[3] or 0)
            })

        return {
            "low_stock":
                low_stock
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "LOW STOCK ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load low-stock report"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()

@app.get("/product-movement-summary")
def product_movement_summary(
    store_id: int,
    start_date: str,
    end_date: str,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    # ---------------------------------------------
    # AUTHORIZATION
    # ---------------------------------------------
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        # ---------------------------------------------
        # VALIDATE DATE RANGE
        # ---------------------------------------------
        try:
            parsed_start = date.fromisoformat(
                start_date
            )

            parsed_end = date.fromisoformat(
                end_date
            )

        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Dates must use YYYY-MM-DD format"
                )
            )

        if parsed_end < parsed_start:
            raise HTTPException(
                status_code=400,
                detail=(
                    "end_date must not be before "
                    "start_date"
                )
            )

        conn = db()
        cursor = conn.cursor()

        # ---------------------------------------------
        # PRODUCT MOVEMENT SUMMARY
        #
        # The selected dates represent local calendar
        # days in El Salvador.
        #
        # PostgreSQL converts those local midnights
        # into UTC-aware timestamps for comparison.
        # ---------------------------------------------
        cursor.execute(
            """
            WITH boundaries AS (
                SELECT
                    (
                        %s::date::timestamp
                        AT TIME ZONE
                        'America/El_Salvador'
                    ) AS start_utc,

                    (
                        (
                            %s::date
                            + INTERVAL '1 day'
                        )::timestamp
                        AT TIME ZONE
                        'America/El_Salvador'
                    ) AS end_utc
            ),

            period_movement AS (
                SELECT
                    e.product_id,

                    MAX(
                        e.product_name_at_time
                    ) AS product_name_at_time,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN e.event_type = 'intake'
                                THEN e.quantity
                                ELSE 0
                            END
                        ),
                        0
                    ) AS purchase,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN e.event_type = 'sale'
                                THEN e.quantity
                                ELSE 0
                            END
                        ),
                        0
                    ) AS sale,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN e.event_type = 'loss'
                                THEN e.quantity
                                ELSE 0
                            END
                        ),
                        0
                    ) AS loss,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN e.event_type = 'transfer_in'
                                THEN e.quantity
                                ELSE 0
                            END
                        ),
                        0
                    ) AS transfer_in,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN e.event_type = 'transfer_out'
                                THEN e.quantity
                                ELSE 0
                            END
                        ),
                        0
                    ) AS transfer_out,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN e.event_type =
                                    'stock_adjustment_positive'
                                THEN e.quantity
                                ELSE 0
                            END
                        ),
                        0
                    ) AS adjustment_positive,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN e.event_type =
                                    'stock_adjustment_negative'
                                THEN e.quantity
                                ELSE 0
                            END
                        ),
                        0
                    ) AS adjustment_negative

                FROM events e
                CROSS JOIN boundaries b

                WHERE e.store_id = %s
                  AND e.product_id IS NOT NULL

                  AND e.event_type IN (
                      'intake',
                      'sale',
                      'loss',
                      'transfer_in',
                      'transfer_out',
                      'stock_adjustment_positive',
                      'stock_adjustment_negative'
                  )

                  AND e.event_datetime::timestamptz
                      >= b.start_utc

                  AND e.event_datetime::timestamptz
                      < b.end_utc

                GROUP BY
                    e.product_id
            ),

            movement_after_period AS (
                SELECT
                    e.product_id,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN e.event_type IN (
                                    'intake',
                                    'transfer_in',
                                    'stock_adjustment_positive'
                                )
                                THEN e.quantity

                                WHEN e.event_type IN (
                                    'sale',
                                    'loss',
                                    'transfer_out',
                                    'stock_adjustment_negative'
                                )
                                THEN -e.quantity

                                ELSE 0
                            END
                        ),
                        0
                    ) AS net_after_period

                FROM events e
                CROSS JOIN boundaries b

                WHERE e.store_id = %s
                  AND e.product_id IS NOT NULL

                  AND e.event_type IN (
                      'intake',
                      'sale',
                      'loss',
                      'transfer_in',
                      'transfer_out',
                      'stock_adjustment_positive',
                      'stock_adjustment_negative'
                  )

                  AND e.event_datetime::timestamptz
                      >= b.end_utc

                GROUP BY
                    e.product_id
            )

            SELECT
                p.product_id,

                COALESCE(
                    pm.product_name_at_time,
                    p.name
                ) AS product_name,

                COALESCE(
                    p.stock,
                    0
                ) AS current_stock,

                COALESCE(
                    pm.purchase,
                    0
                ) AS purchase,

                COALESCE(
                    pm.sale,
                    0
                ) AS sale,

                COALESCE(
                    pm.loss,
                    0
                ) AS loss,

                COALESCE(
                    pm.transfer_in,
                    0
                ) AS transfer_in,

                COALESCE(
                    pm.transfer_out,
                    0
                ) AS transfer_out,

                COALESCE(
                    pm.adjustment_positive,
                    0
                ) AS adjustment_positive,

                COALESCE(
                    pm.adjustment_negative,
                    0
                ) AS adjustment_negative,

                COALESCE(
                    map.net_after_period,
                    0
                ) AS net_after_period

            FROM period_movement pm

            JOIN products p
              ON p.product_id = pm.product_id
             AND p.store_id = %s

            LEFT JOIN movement_after_period map
              ON map.product_id = pm.product_id

            WHERE p.tracks_stock = 1

            ORDER BY
                LOWER(product_name) ASC
            """,
            (
                start_date,
                end_date,
                store_id,
                store_id,
                store_id
            )
        )

        rows = cursor.fetchall()

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
                adjustment_negative,
                net_after_period
            ) = row

            current_stock = int(
                current_stock or 0
            )

            purchase = int(
                purchase or 0
            )

            sale = int(
                sale or 0
            )

            loss = int(
                loss or 0
            )

            transfer_in = int(
                transfer_in or 0
            )

            transfer_out = int(
                transfer_out or 0
            )

            adjustment_positive = int(
                adjustment_positive or 0
            )

            adjustment_negative = int(
                adjustment_negative or 0
            )

            net_after_period = int(
                net_after_period or 0
            )

            period_net_movement = (
                purchase
                - sale
                - loss
                + transfer_in
                - transfer_out
                + adjustment_positive
                - adjustment_negative
            )

            # Current stock includes every movement
            # through the present. Remove movements
            # after the selected period to reconstruct
            # stock at the selected closing boundary.
            final_stock = (
                current_stock
                - net_after_period
            )

            initial_stock = (
                final_stock
                - period_net_movement
            )

            summary.append({
                "product_id":
                    product_id,

                "product":
                    product_name,

                "initial_stock":
                    initial_stock,

                "purchase":
                    purchase,

                "sale":
                    sale,

                "loss":
                    loss,

                "transfer_in":
                    transfer_in,

                "transfer_out":
                    transfer_out,

                "adjustment_positive":
                    adjustment_positive,

                "adjustment_negative":
                    adjustment_negative,

                "final_stock":
                    final_stock
            })

        return {
            "store_id":
                store_id,

            "start_date":
                start_date,

            "end_date":
                end_date,

            "summary":
                summary
        }

    except HTTPException:
        if conn:
            conn.rollback()

        raise

    except Exception as error:
        if conn:
            conn.rollback()

        print(
            "PRODUCT MOVEMENT SUMMARY ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to load product "
                "movement summary"
            )
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
            
@app.get("/sales-history")
def sales_history(
    store_id: int,
    start_date: str = None,
    end_date: str = None,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        query = """
            SELECT
                ticket_id,

                MIN(
                    event_datetime::timestamptz
                ) AS event_datetime,

                COUNT(*) AS items,

                COALESCE(
                    SUM(
                        quantity *
                        price_at_time
                    ),
                    0
                ) AS revenue,

                COALESCE(
                    SUM(
                        quantity *
                        cost_at_time
                    ),
                    0
                ) AS cost

            FROM events

            WHERE store_id = %s
              AND event_type = 'sale'
              AND ticket_id IS NOT NULL
        """

        params = [store_id]

        # Filter by the business's local calendar date,
        # rather than the UTC calendar date.
        if start_date:
            query += """
                AND (
                    event_datetime::timestamptz
                    AT TIME ZONE
                    'America/El_Salvador'
                )::date >= %s::date
            """

            params.append(
                start_date
            )

        if end_date:
            query += """
                AND (
                    event_datetime::timestamptz
                    AT TIME ZONE
                    'America/El_Salvador'
                )::date <= %s::date
            """

            params.append(
                end_date
            )

        query += """
            GROUP BY ticket_id
            ORDER BY event_datetime DESC
            LIMIT 100
        """

        cursor.execute(
            query,
            params
        )

        rows = cursor.fetchall()

        history = []

        for row in rows:
            revenue = float(
                row[3] or 0
            )

            cost = float(
                row[4] or 0
            )

            history.append({
                "ticket_id":
                    row[0],

                "datetime":
                    (
                        row[1].isoformat()
                        if row[1]
                        else None
                    ),

                "items":
                    int(row[2] or 0),

                "revenue":
                    round(
                        revenue,
                        2
                    ),

                "profit":
                    round(
                        revenue - cost,
                        2
                    )
            })

        return {
            "sales": history
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "SALES HISTORY ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to load sales history"
            )
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
            
@app.get("/intake-ticket-details")
def intake_ticket_details(
    store_id: int,
    ticket_id: int,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                event_id,
                product_id,
                product_name_at_time,
                quantity,
                cost_at_time,
                price_at_time,
                event_datetime::timestamptz,
                note
            FROM events
            WHERE store_id = %s
              AND ticket_id = %s
              AND event_type = 'intake'
            ORDER BY event_id ASC
            """,
            (
                store_id,
                ticket_id
            )
        )

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
            quantity = int(
                row[3] or 0
            )

            unit_cost = float(
                row[4] or 0
            )

            price_at_time = float(
                row[5] or 0
            )

            line_cost = round(
                quantity * unit_cost,
                2
            )

            total_units += quantity
            total_cost += line_cost

            items.append({
                "event_id":
                    row[0],

                "product_id":
                    row[1],

                "product_name":
                    row[2],

                "quantity":
                    quantity,

                "unit_cost":
                    unit_cost,

                "price_at_time":
                    price_at_time,

                "line_cost":
                    line_cost,

                "datetime": (
                    row[6].isoformat()
                    if row[6]
                    else None
                ),

                "note":
                    row[7]
            })

        return {
            "ticket_id":
                ticket_id,

            "store_id":
                store_id,

            "datetime": (
                rows[0][6].isoformat()
                if rows[0][6]
                else None
            ),

            "product_lines":
                len(items),

            "total_units":
                total_units,

            "total_cost":
                round(
                    total_cost,
                    2
                ),

            "items":
                items
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "INTAKE TICKET DETAILS ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to load intake ticket details"
            )
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
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
def stock_report(
    store_id: int,
    name: str = None,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    # ---------------------------------------------
    # AUTHORIZATION
    # ---------------------------------------------
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
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
            query += """
                AND LOWER(name) LIKE %s
            """

            params.append(
                f"%{name.strip().lower()}%"
            )

        query += """
            ORDER BY LOWER(name) ASC
        """

        cursor.execute(
            query,
            params
        )

        rows = cursor.fetchall()

        products = []
        total_cost_value = 0.0
        total_price_value = 0.0

        for (
            product_name,
            stock,
            cost,
            price
        ) in rows:
            numeric_stock = int(
                stock or 0
            )

            numeric_cost = float(
                cost or 0
            )

            numeric_price = float(
                price or 0
            )

            investment = round(
                numeric_stock *
                numeric_cost,
                2
            )

            valuation = round(
                numeric_stock *
                numeric_price,
                2
            )

            total_cost_value += (
                investment
            )

            total_price_value += (
                valuation
            )

            products.append({
                "name":
                    product_name,

                "quantity":
                    numeric_stock,

                "cost":
                    round(
                        numeric_cost,
                        2
                    ),

                "price":
                    round(
                        numeric_price,
                        2
                    ),

                "investment":
                    investment,

                "valuation":
                    valuation
            })

        return {
            "products":
                products,

            "total_inventory_cost":
                round(
                    total_cost_value,
                    2
                ),

            "total_inventory_price":
                round(
                    total_price_value,
                    2
                )
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "STOCK REPORT ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load stock report"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


@app.get("/inventory-pareto")
def inventory_pareto(
    store_id: int,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    # ---------------------------------------------
    # AUTHORIZATION
    # ---------------------------------------------
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                p.product_id,
                p.name,

                COALESCE(
                    p.stock,
                    0
                ) AS stock,

                COALESCE(
                    p.cost,
                    0
                ) AS cost,

                -- Investment:
                -- current inventory held at cost
                COALESCE(
                    p.stock * p.cost,
                    0
                ) AS investment,

                -- Revenue from sale events
                COALESCE(
                    SUM(
                        CASE
                            WHEN e.event_type = 'sale'
                            THEN
                                e.quantity *
                                e.price_at_time
                            ELSE 0
                        END
                    ),
                    0
                ) AS revenue,

                -- Cost of goods sold
                COALESCE(
                    SUM(
                        CASE
                            WHEN e.event_type = 'sale'
                            THEN
                                e.quantity *
                                e.cost_at_time
                            ELSE 0
                        END
                    ),
                    0
                ) AS cost_of_sales

            FROM products p

            LEFT JOIN events e
              ON p.product_id =
                 e.product_id
             AND p.store_id =
                 e.store_id

            WHERE p.store_id = %s
              AND p.is_active = 1

            GROUP BY
                p.product_id,
                p.name,
                p.stock,
                p.cost

            ORDER BY
                LOWER(p.name) ASC
            """,
            (store_id,)
        )

        rows = cursor.fetchall()

        results = []

        for row in rows:
            investment = round(
                float(row[4] or 0),
                2
            )

            revenue = round(
                float(row[5] or 0),
                2
            )

            cost_of_sales = round(
                float(row[6] or 0),
                2
            )

            profit = round(
                revenue - cost_of_sales,
                2
            )

            results.append({
                "product_id":
                    row[0],

                "name":
                    row[1],

                "investment":
                    investment,

                "revenue":
                    revenue,

                "profit":
                    profit
            })

        return {
            "products":
                results
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "INVENTORY PARETO ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to load inventory "
                "Pareto report"
            )
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()



@app.get("/dead-stock")
def dead_stock(
    store_id: int,
    days: int = 90,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    # ---------------------------------------------
    # AUTHORIZATION
    # ---------------------------------------------
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    if days < 0:
        raise HTTPException(
            status_code=400,
            detail="Days cannot be negative"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                p.product_id,
                p.name,
                p.stock,
                p.cost,

                MAX(
                    CASE
                        WHEN e.event_datetime IS NOT NULL
                         AND e.event_datetime <> ''
                        THEN
                            e.event_datetime::timestamptz
                        ELSE NULL
                    END
                ) AS last_sale

            FROM products p

            LEFT JOIN events e
              ON p.product_id =
                 e.product_id
             AND p.store_id =
                 e.store_id
             AND e.event_type = 'sale'

            WHERE p.store_id = %s
              AND p.is_active = 1

            GROUP BY
                p.product_id,
                p.name,
                p.stock,
                p.cost

            HAVING
                MAX(
                    CASE
                        WHEN e.event_datetime IS NOT NULL
                         AND e.event_datetime <> ''
                        THEN
                            e.event_datetime::timestamptz
                        ELSE NULL
                    END
                ) IS NULL

                OR

                MAX(
                    CASE
                        WHEN e.event_datetime IS NOT NULL
                         AND e.event_datetime <> ''
                        THEN
                            e.event_datetime::timestamptz
                        ELSE NULL
                    END
                ) <=
                    NOW() -
                    (%s * INTERVAL '1 day')

            ORDER BY
                (
                    COALESCE(p.stock, 0) *
                    COALESCE(p.cost, 0)
                ) DESC,
                LOWER(p.name) ASC
            """,
            (
                store_id,
                days
            )
        )

        rows = cursor.fetchall()

        results = []

        now_utc = datetime.now(
            timezone.utc
        )

        for row in rows:
            product_id = row[0]
            name = row[1]

            stock = int(
                row[2] or 0
            )

            cost = float(
                row[3] or 0
            )

            last_sale = row[4]

            investment = round(
                stock * cost,
                2
            )

            days_since_sale = None

            if last_sale:
                days_since_sale = (
                    now_utc - last_sale
                ).days

            results.append({
                "product_id":
                    product_id,

                "name":
                    name,

                "stock":
                    stock,

                "cost":
                    round(
                        cost,
                        2
                    ),

                "investment":
                    investment,

                "last_sale": (
                    last_sale.isoformat()
                    if last_sale
                    else None
                ),

                "days_since_sale":
                    days_since_sale
            })

        return {
            "products":
                results
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "DEAD STOCK ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to load dead-stock report"
            )
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()

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

@app.get("/cash-balance")
def cash_balance(
    store_id: int,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT COALESCE(
                SUM(
                    amount * direction
                ),
                0
            )
            FROM cash_events
            WHERE store_id = %s
            """,
            (store_id,)
        )

        balance = cursor.fetchone()[0]

        return {
            "store_id": store_id,
            "balance": round(
                float(balance or 0),
                2
            )
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "CASH BALANCE ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load cash balance"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
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

        store_name = str(
            store[0] or ""
        ).strip()

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

        # ---------------------------------------------
        # CURRENT WEEK CATALOG PROFILE
        # ---------------------------------------------
        current_catalog_profile = (
            build_catalog_profile_data(
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
        # PREVIOUS WEEK CATALOG PROFILE
        # ---------------------------------------------
        previous_catalog_profile = (
            build_catalog_profile_data(
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

        current_inventory = (
            current_analysis.get(
                "inventory",
                {}
            )
        )

        previous_inventory = (
            previous_analysis.get(
                "inventory",
                {}
            )
        )

        # ---------------------------------------------
        # ALERTS
        # ---------------------------------------------
        alerts = (
            build_weekly_alerts_data(
                cursor=cursor,
                store_id=store_id,
                current_inventory=
                    current_inventory,
                current_sales=
                    current_summary
            )
        )

        # ---------------------------------------------
        # REVIEW QUEUE
        # ---------------------------------------------
        review_queue = (
            build_review_queue_data(
                alerts
            )
        )

        current_net_cash = float(
            current_cash.get(
                "net_cash_movement",
                0
            ) or 0
        )

        previous_net_cash = float(
            previous_cash.get(
                "net_cash_movement",
                0
            ) or 0
        )

        # ---------------------------------------------
        # NET CASH POSITION CLASSIFICATION
        # ---------------------------------------------
        if (
            previous_net_cash < 0
            and current_net_cash >= 0
        ):
            net_cash_position_change = (
                "negative_to_positive"
            )

        elif (
            previous_net_cash >= 0
            and current_net_cash < 0
        ):
            net_cash_position_change = (
                "positive_to_negative"
            )

        elif (
            current_net_cash
            > previous_net_cash
        ):
            net_cash_position_change = (
                "improved"
            )

        elif (
            current_net_cash
            < previous_net_cash
        ):
            net_cash_position_change = (
                "declined"
            )

        else:
            net_cash_position_change = (
                "unchanged"
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

            # Net cash movement may cross zero, so an
            # absolute change is safer than a percentage.
            "net_cash_movement_change":
                round_money(
                    current_net_cash
                    -
                    previous_net_cash
                ),

            "net_cash_position_change":
                net_cash_position_change
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
                    current_inventory
                    or empty_inventory.copy(),

                "previous_week":
                    previous_inventory
                    or empty_inventory.copy()
            },

            "cash": {
                "current_week":
                    current_cash,

                "previous_week":
                    previous_cash
            },

            "catalog_profile": {
                "current_week":
                    current_catalog_profile,

                "previous_week":
                    previous_catalog_profile
            },

            "alerts":
                alerts,

            "review_queue":
                review_queue
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
            
@app.get("/internal/growth-analysis-data")
def growth_analysis_data(
    store_id: int
):
    conn = None
    cursor = None

    try:
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

        store_name = str(
            store[0] or ""
        ).strip()

        organization_id = store[1]

        history = (
            build_growth_history_data(
                cursor=cursor,
                store_id=store_id
            )
        )

        readiness = (
            classify_growth_data_readiness(
                history
            )
        )

        monthly_comparison = (
            build_completed_month_comparison(
                cursor=cursor,
                store_id=store_id,
                history=history
            )
        )

        return {
            "metadata": {
                "store_id":
                    store_id,

                "store_name":
                    store_name,

                "organization_id":
                    organization_id,

                "generated_at":
                    datetime.now(
                        timezone.utc
                    ).isoformat()
            },

            "history":
                history,

            "data_readiness":
                readiness,

            "monthly_comparison":
                monthly_comparison,

            "short_term_monthly_trend":
                None,

            "quarterly_trend":
                None,

            "annual_trend":
                None,

            "seasonal_context":
                None,

            "multi_year_trend":
                None,

            "inflation_context":
                None
        }

    except HTTPException:
        if conn:
            conn.rollback()

        raise

    except Exception as error:
        if conn:
            conn.rollback()

        print(
            "🔥 GROWTH ANALYSIS DATA ERROR:",
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
def ticket_details(
    store_id: int,
    ticket_id: int,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                product_name_at_time,
                quantity,
                price_at_time,
                cost_at_time
            FROM events
            WHERE store_id = %s
              AND ticket_id = %s
              AND event_type = 'sale'
            ORDER BY event_id ASC
            """,
            (
                store_id,
                ticket_id
            )
        )

        rows = cursor.fetchall()

        if not rows:
            raise HTTPException(
                status_code=404,
                detail="Sale ticket not found"
            )

        items = []
        total = 0.0
        cost_total = 0.0

        for (
            name,
            quantity,
            price,
            cost
        ) in rows:
            numeric_quantity = int(
                quantity or 0
            )

            numeric_price = float(
                price or 0
            )

            numeric_cost = float(
                cost or 0
            )

            line_total = round(
                numeric_quantity *
                numeric_price,
                2
            )

            total += line_total

            cost_total += (
                numeric_quantity *
                numeric_cost
            )

            items.append({
                "name":
                    name,

                "quantity":
                    numeric_quantity,

                "price":
                    numeric_price,

                "line_total":
                    line_total
            })

        total = round(
            total,
            2
        )

        profit = round(
            total - cost_total,
            2
        )

        return {
            "ticket_id":
                ticket_id,

            "items":
                items,

            "total":
                total,

            "profit":
                profit
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "TICKET DETAILS ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load ticket details"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()

from datetime import datetime, timezone
from fastapi import HTTPException

class SignupRequest(BaseModel):
    email: str
    password: str
    store_name: str


@app.post("/signup")
def signup(
    data: SignupRequest
):
    conn = None
    cursor = None

    try:
        email = (
            data.email
            .strip()
            .lower()
        )

        store_name = (
            data.store_name
            .strip()
        )

        plain_password = (
            data.password
        )

        if not email:
            raise HTTPException(
                status_code=400,
                detail="Email is required"
            )

        if not store_name:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Store name is required"
                )
            )

        if len(plain_password) < 8:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Password must contain "
                    "at least 8 characters"
                )
            )

        created_at = datetime.now(
            timezone.utc
        ).isoformat()

        generated_hash = (
            hash_password(
                plain_password
            )
        )

        conn = db()
        cursor = conn.cursor()

        # ---------------------------------------------
        # CHECK EXISTING USER
        # ---------------------------------------------
        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE LOWER(email) = %s
            """,
            (email,)
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="User already exists"
            )

        # ---------------------------------------------
        # CREATE STORE
        # ---------------------------------------------
        cursor.execute(
            """
            INSERT INTO stores (
                name,
                created_at,
                organization_id
            )
            VALUES (
                %s,
                %s,
                NULL
            )
            RETURNING store_id
            """,
            (
                store_name,
                created_at
            )
        )

        store_id = (
            cursor.fetchone()[0]
        )

        # ---------------------------------------------
        # CREATE USER
        #
        # New users receive only password_hash.
        # The legacy password column stays NULL.
        # ---------------------------------------------
        cursor.execute(
            """
            INSERT INTO users (
                email,
                password,
                password_hash,
                store_id,
                created_at
            )
            VALUES (
                %s,
                NULL,
                %s,
                %s,
                %s
            )
            RETURNING user_id
            """,
            (
                email,
                generated_hash,
                store_id,
                created_at
            )
        )

        user_id = (
            cursor.fetchone()[0]
        )

        conn.commit()

        return {
            "user_id":
                user_id,

            "store_id":
                store_id,

            "email":
                email
        }

    except HTTPException:
        if conn:
            conn.rollback()

        raise

    except psycopg2.errors.UniqueViolation:
        if conn:
            conn.rollback()

        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )

    except Exception as error:
        if conn:
            conn.rollback()

        print(
            "SIGNUP ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to create account"
            )
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


@app.post("/login")
def login(
    data: LoginRequest
):
    conn = None
    cursor = None

    try:
        email = (
            data.email
            .strip()
            .lower()
        )

        plain_password = data.password

        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                u.user_id,
                u.password,
                u.password_hash,
                u.store_id,
                s.name
            FROM users u
            JOIN stores s
              ON u.store_id = s.store_id
            WHERE LOWER(u.email) = %s
            """,
            (email,)
        )

        user = cursor.fetchone()

        # Same response for unknown users and bad passwords.
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        (
            user_id,
            legacy_password,
            stored_hash,
            store_id,
            store_name
        ) = user

        authenticated = False
        migrate_legacy_password = False

        # ---------------------------------------------
        # MODERN HASHED ACCOUNT
        # ---------------------------------------------
        if stored_hash:
            authenticated = verify_password(
                plain_password,
                stored_hash
            )

        # ---------------------------------------------
        # LEGACY PLAINTEXT ACCOUNT
        # ---------------------------------------------
        elif legacy_password is not None:
            authenticated = (
                plain_password ==
                legacy_password
            )

            migrate_legacy_password = authenticated

        if not authenticated:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # ---------------------------------------------
        # MIGRATE LEGACY ACCOUNT AFTER SUCCESSFUL LOGIN
        # ---------------------------------------------
        if migrate_legacy_password:
            generated_hash = hash_password(
                plain_password
            )

            cursor.execute(
                """
                UPDATE users
                SET
                    password_hash = %s,
                    password = NULL
                WHERE user_id = %s
                """,
                (
                    generated_hash,
                    user_id
                )
            )

            conn.commit()

        # ---------------------------------------------
        # ISSUE ACCESS TOKEN
        # ---------------------------------------------
        access_token = create_access_token(
            user_id=user_id,
            store_id=store_id
        )

        return {
            "access_token":
                access_token,

            "token_type":
                "bearer",

            "user_id":
                user_id,

            "store_id":
                store_id,

            "store_name":
                store_name,

            "email":
                email
        }

    except HTTPException:
        if conn:
            conn.rollback()

        raise

    except Exception as error:
        if conn:
            conn.rollback()

        print(
            "LOGIN ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to log in"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
            
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



@app.post("/cash-event")
def create_cash_event(
    data: CashEventRequest,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    # ---------------------------------------------
    # AUTHORIZATION
    # ---------------------------------------------
    if current_user.store_id != data.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        # ---------------------------------------------
        # VALIDATION
        # ---------------------------------------------
        if data.type not in (
            "revenue",
            "expense"
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cash event type must be "
                    "revenue or expense"
                )
            )

        if data.amount <= 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Amount must be greater than zero"
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
                    "status":
                        "already_processed",

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

        amount = round(
            float(data.amount),
            2
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
                amount,
                data.category,
                data.note,
                data.client_event_id,
                data.device_id,
                data.client_created_at
            )
        )

        conn.commit()

        return {
            "status":
                "accepted",

            "client_event_id":
                data.client_event_id
        }

    except psycopg2.errors.UniqueViolation:
        if conn:
            conn.rollback()

        return {
            "status":
                "already_processed",

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
            "CASH EVENT ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to record cash event"
            )
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
            
@app.post("/returns")
def process_return(
    data: ReturnRequest,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    # -------------------------------------------------
    # AUTHORIZATION
    # -------------------------------------------------
    if current_user.store_id != data.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        # -------------------------------------------------
        # VALIDATION
        # -------------------------------------------------
        if data.amount <= 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Return/refund amount must be "
                    "greater than zero"
                )
            )

        for item in data.items:
            if item.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Returned quantity must be "
                        "greater than zero"
                    )
                )

            if (
                item.cost < 0
                or item.price < 0
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Returned item cost and price "
                        "cannot be negative"
                    )
                )

        event_type = (
            "return"
            if data.items
            else "refund"
        )

        # -------------------------------------------------
        # IDEMPOTENCY CHECK
        # -------------------------------------------------
        if data.client_event_id:
            cursor.execute(
                """
                SELECT ticket_id
                FROM events
                WHERE store_id = %s
                  AND client_event_id = %s
                  AND event_type = 'return'
                LIMIT 1
                """,
                (
                    data.store_id,
                    data.client_event_id
                )
            )

            existing_event = (
                cursor.fetchone()
            )

            if existing_event:
                return {
                    "message":
                        "Return/refund already recorded",

                    "status":
                        "already_processed",

                    "type":
                        event_type,

                    "ticket_id":
                        existing_event[0],

                    "client_event_id":
                        data.client_event_id
                }

            # Refund-only operations do not create a
            # product event, so cash_events must also
            # be checked.
            cursor.execute(
                """
                SELECT reference_id
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

            existing_cash = (
                cursor.fetchone()
            )

            if existing_cash:
                return {
                    "message":
                        "Return/refund already recorded",

                    "status":
                        "already_processed",

                    "type":
                        event_type,

                    "ticket_id":
                        existing_cash[0],

                    "client_event_id":
                        data.client_event_id
                }

        # -------------------------------------------------
        # GENERATE TICKET ID ONLY FOR PRODUCT RETURNS
        # -------------------------------------------------
        ticket_id = None

        if data.items:
            # Sales and returns both use ticket IDs
            # generated from the events table.
            cursor.execute(
                """
                SELECT pg_advisory_xact_lock(%s)
                """,
                (1269001,)
            )

            cursor.execute(
                """
                SELECT COALESCE(
                    MAX(ticket_id),
                    0
                )
                FROM events
                """
            )

            ticket_id = (
                cursor.fetchone()[0] + 1
            )

        now = datetime.now(
            timezone.utc
        ).isoformat()

        # -------------------------------------------------
        # PROCESS RETURNED ITEMS
        # -------------------------------------------------
        for item in data.items:
            cursor.execute(
                """
                SELECT
                    name,
                    tracks_stock
                FROM products
                WHERE product_id = %s
                  AND store_id = %s
                  AND is_active = 1
                """,
                (
                    item.product_id,
                    data.store_id
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

            name, tracks_stock = product

            quantity = int(
                item.quantity
            )

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
                """,
                (
                    data.store_id,
                    "return",
                    item.product_id,
                    name,
                    quantity,
                    cost,
                    price,
                    now,
                    ticket_id,
                    data.note,
                    data.client_event_id,
                    data.device_id,
                    data.client_created_at
                )
            )

            if (
                tracks_stock == 1
                or tracks_stock is True
            ):
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
                        quantity,
                        item.product_id,
                        data.store_id
                    )
                )

        # -------------------------------------------------
        # GET ORGANIZATION
        # -------------------------------------------------
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

        # -------------------------------------------------
        # RECORD CASH OUTFLOW
        # -------------------------------------------------
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
            """,
            (
                organization_id,
                data.store_id,
                event_type,
                -1,
                round(
                    float(data.amount),
                    2
                ),
                "Devolucion",
                data.note,
                ticket_id,
                now,
                data.client_event_id,
                data.device_id,
                data.client_created_at
            )
        )

        conn.commit()

        return {
            "message":
                "Return/refund recorded",

            "status":
                "accepted",

            "type":
                event_type,

            "ticket_id":
                ticket_id,

            "client_event_id":
                data.client_event_id
        }

    except psycopg2.errors.UniqueViolation:
        if conn:
            conn.rollback()

        if (
            cursor
            and data.client_event_id
        ):
            cursor.execute(
                """
                SELECT ticket_id
                FROM events
                WHERE store_id = %s
                  AND client_event_id = %s
                  AND event_type = 'return'
                LIMIT 1
                """,
                (
                    data.store_id,
                    data.client_event_id
                )
            )

            existing_event = (
                cursor.fetchone()
            )

            if existing_event:
                return {
                    "message":
                        "Return/refund already recorded",

                    "status":
                        "already_processed",

                    "type":
                        (
                            "return"
                            if data.items
                            else "refund"
                        ),

                    "ticket_id":
                        existing_event[0],

                    "client_event_id":
                        data.client_event_id
                }

            cursor.execute(
                """
                SELECT reference_id
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

            existing_cash = (
                cursor.fetchone()
            )

            if existing_cash:
                return {
                    "message":
                        "Return/refund already recorded",

                    "status":
                        "already_processed",

                    "type":
                        (
                            "return"
                            if data.items
                            else "refund"
                        ),

                    "ticket_id":
                        existing_cash[0],

                    "client_event_id":
                        data.client_event_id
                }

        raise HTTPException(
            status_code=409,
            detail=(
                "Duplicate return/refund event"
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
            "RETURN ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to record return/refund"
            )
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
        
@app.get("/cash-movements")
def cash_movements(
    store_id: int,
    start_date: str,
    end_date: str,
    current_user: AuthenticatedUser = Depends(
        get_current_user
    )
):
    # ---------------------------------------------
    # AUTHORIZATION
    # ---------------------------------------------
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store access denied"
        )

    conn = None
    cursor = None

    try:
        conn = db()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                created_at::timestamptz,
                amount,
                direction,
                type,
                category,
                note

            FROM cash_events

            WHERE store_id = %s

              AND (
                  created_at::timestamptz
                  AT TIME ZONE
                  'America/El_Salvador'
              )::date >= %s::date

              AND (
                  created_at::timestamptz
                  AT TIME ZONE
                  'America/El_Salvador'
              )::date <= %s::date

              AND type != 'sale'

            ORDER BY
                created_at::timestamptz DESC
            """,
            (
                store_id,
                start_date,
                end_date
            )
        )

        rows = cursor.fetchall()

        movements = []

        for row in rows:
            created_at = row[0]

            movements.append({
                "datetime": (
                    created_at.isoformat()
                    if created_at
                    else None
                ),

                "amount":
                    round(
                        float(row[1] or 0),
                        2
                    ),

                "direction":
                    int(row[2]),

                "type":
                    str(row[3] or ""),

                "category":
                    str(row[4] or ""),

                "note":
                    str(row[5] or "")
            })

        return {
            "movements": movements
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "CASH MOVEMENTS ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to load cash movements"
            )
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
            
@app.get("/rebuild-products")
def rebuild_products_endpoint(store_id: int):
    rebuild_products(store_id)
    return {"status": "rebuilt"}
