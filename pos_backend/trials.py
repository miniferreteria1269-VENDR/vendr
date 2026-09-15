from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import hmac
import json
import os
import re
import secrets
from urllib import parse as urllib_parse
from urllib import request as urllib_request
from urllib.error import HTTPError, URLError

import jwt
import psycopg2
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from pwdlib import PasswordHash
from jwt.exceptions import InvalidTokenError
from pos_backend.subscriptions import (
    calculate_subscription_period,
    parse_timestamp,
    subscription_access_state,
    subscription_display_status,
    utc_now,
)


router = APIRouter(prefix="/trial", tags=["trial"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")
password_hash = PasswordHash.recommended()

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
WRITE_GUARD_EXEMPT_PATHS = {
    "/login",
    "/trial/request",
    "/trial/verify",
    "/health",
}
SUBSCRIPTION_PAYMENT_METHODS = {
    "cash",
    "bank_transfer",
    "wompi",
    "other",
}


def db():
    return psycopg2.connect(os.environ.get("DATABASE_URL"))


def env_enabled(name: str, default: str = "false") -> bool:
    return os.environ.get(name, default).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def public_trial_config():
    return {
        "enabled": env_enabled("TRIAL_SIGNUP_ENABLED"),
        "days": int(os.environ.get("TRIAL_LENGTH_DAYS", "14")),
        "turnstile_site_key": os.environ.get(
            "TURNSTILE_SITE_KEY",
            "",
        ),
    }


def ensure_trial_schema():
    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                account_type TEXT NOT NULL DEFAULT 'legacy'
            """
        )
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                trial_started_at TIMESTAMPTZ
            """
        )
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                trial_expires_at TIMESTAMPTZ
            """
        )
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                trial_retention_until TIMESTAMPTZ
            """
        )
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                trial_converted_at TIMESTAMPTZ
            """
        )
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                trial_contact_name TEXT
            """
        )
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                trial_whatsapp TEXT
            """
        )
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                trial_business_type TEXT
            """
        )
        cursor.execute(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS
                email_verified_at TIMESTAMPTZ
            """
        )
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                subscription_started_at TIMESTAMPTZ
            """
        )
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                subscription_paid_through TIMESTAMPTZ
            """
        )
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                subscription_grace_until TIMESTAMPTZ
            """
        )
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                subscription_canceled_at TIMESTAMPTZ
            """
        )
        cursor.execute(
            """
            ALTER TABLE stores
            ADD COLUMN IF NOT EXISTS
                subscription_monthly_price NUMERIC(12, 2)
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS trial_signup_requests (
                trial_signup_id BIGSERIAL PRIMARY KEY,
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                contact_name TEXT NOT NULL,
                store_name TEXT NOT NULL,
                business_type TEXT NOT NULL,
                whatsapp TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'es',
                verification_token_hash TEXT NOT NULL UNIQUE,
                requested_ip_hash TEXT,
                created_at TIMESTAMPTZ NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                verified_at TIMESTAMPTZ
            )
            """
        )
        cursor.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS
                idx_trial_signup_pending_email
            ON trial_signup_requests (LOWER(email))
            WHERE verified_at IS NULL
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS
                idx_trial_signup_ip_created
            ON trial_signup_requests (
                requested_ip_hash,
                created_at DESC
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS subscription_payments (
                subscription_payment_id BIGSERIAL PRIMARY KEY,
                client_payment_id TEXT NOT NULL UNIQUE,
                store_id INTEGER NOT NULL REFERENCES stores(store_id),
                amount NUMERIC(12, 2) NOT NULL,
                currency TEXT NOT NULL DEFAULT 'USD',
                payment_method TEXT NOT NULL,
                payment_reference TEXT,
                note TEXT,
                paid_at TIMESTAMPTZ NOT NULL,
                period_start TIMESTAMPTZ NOT NULL,
                period_end TIMESTAMPTZ NOT NULL,
                months_granted INTEGER NOT NULL,
                recorded_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
                created_at TIMESTAMPTZ NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS
                idx_subscription_payments_store_created
            ON subscription_payments (store_id, created_at DESC)
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS subscription_admin_events (
                subscription_admin_event_id BIGSERIAL PRIMARY KEY,
                store_id INTEGER NOT NULL REFERENCES stores(store_id),
                event_type TEXT NOT NULL,
                note TEXT,
                recorded_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
                created_at TIMESTAMPTZ NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS
                idx_subscription_admin_events_store_created
            ON subscription_admin_events (store_id, created_at DESC)
            """
        )

        conn.commit()

    except Exception:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()


class TrialSignupRequest(BaseModel):
    contact_name: str
    store_name: str
    business_type: str
    whatsapp: str
    email: str
    password: str
    language: str = "es"
    turnstile_token: str


class TrialVerificationRequest(BaseModel):
    token: str


class SubscriptionPaymentRequest(BaseModel):
    client_payment_id: str = Field(min_length=8, max_length=100)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    months: int = Field(default=1, ge=1, le=24)
    payment_method: str
    payment_reference: str | None = Field(default=None, max_length=200)
    note: str | None = Field(default=None, max_length=1000)
    paid_at: datetime | None = None


class SubscriptionActionRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class TrialAuthenticatedUser(BaseModel):
    user_id: int
    store_id: int
    email: str


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("cf-connecting-ip")

    if forwarded:
        return forwarded.strip()

    if request.client:
        return request.client.host or ""

    return ""


def hash_client_ip(value: str) -> str:
    secret = (
        os.environ.get("TRIAL_RATE_LIMIT_SECRET")
        or os.environ.get("JWT_SECRET_KEY")
        or "vendr-trial-rate-limit"
    )

    return hmac.new(
        secret.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def post_form_json(url: str, values: dict) -> dict:
    encoded = urllib_parse.urlencode(values).encode("utf-8")
    outgoing = urllib_request.Request(
        url,
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urllib_request.urlopen(outgoing, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))

    except (HTTPError, URLError, TimeoutError, ValueError) as error:
        raise HTTPException(
            status_code=503,
            detail="Verification service is temporarily unavailable.",
        ) from error


def verify_turnstile(token: str, remote_ip: str):
    secret_key = os.environ.get("TURNSTILE_SECRET_KEY")

    if not secret_key:
        raise HTTPException(
            status_code=503,
            detail="Trial registration is not configured yet.",
        )

    result = post_form_json(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
            "secret": secret_key,
            "response": token,
            "remoteip": remote_ip,
        },
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail="Please complete the security check again.",
        )


def send_verification_email(
    *,
    email: str,
    contact_name: str,
    verification_token: str,
    language: str,
):
    resend_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("VENDR_EMAIL_FROM")
    public_url = os.environ.get("VENDR_PUBLIC_URL", "").rstrip("/")

    if not resend_key or not sender or not public_url:
        raise HTTPException(
            status_code=503,
            detail="Trial email delivery is not configured yet.",
        )

    verification_url = (
        f"{public_url}/?trial_token="
        f"{urllib_parse.quote(verification_token)}"
    )

    spanish = language != "en"
    subject = (
        "Verifique su prueba de VENDR"
        if spanish
        else "Verify your VENDR trial"
    )
    greeting = (
        f"Hola {contact_name},"
        if spanish
        else f"Hello {contact_name},"
    )
    explanation = (
        "Confirme su correo para crear su tienda y comenzar "
        "su prueba gratuita de 14 días."
        if spanish
        else
        "Confirm your email to create your store and begin "
        "your free 14-day trial."
    )
    button = "Verificar y comenzar" if spanish else "Verify and start"
    expiry = (
        "Este enlace vence en 30 minutos."
        if spanish
        else "This link expires in 30 minutes."
    )

    payload = {
        "from": sender,
        "to": [email],
        "subject": subject,
        "html": (
            "<div style=\"font-family:Arial,sans-serif;"
            "max-width:560px;margin:auto;color:#172033\">"
            "<h1 style=\"color:#2456A4\">VENDR</h1>"
            f"<p>{greeting}</p>"
            f"<p>{explanation}</p>"
            f"<p><a href=\"{verification_url}\" "
            "style=\"display:inline-block;background:#2456A4;"
            "color:white;text-decoration:none;padding:12px 18px;"
            f"border-radius:8px\">{button}</a></p>"
            f"<p style=\"color:#667085\">{expiry}</p>"
            "</div>"
        ),
        "text": (
            f"{greeting}\n\n{explanation}\n\n"
            f"{verification_url}\n\n{expiry}"
        ),
    }

    outgoing = urllib_request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {resend_key}",
            "Content-Type": "application/json",
            "User-Agent": "VENDR/1.0",
        },
        method="POST",
    )

    try:
        with urllib_request.urlopen(outgoing, timeout=10) as response:
            if response.status < 200 or response.status >= 300:
                raise HTTPException(
                    status_code=503,
                    detail="Unable to send the verification email.",
                )

    except HTTPException:
        raise

    except HTTPError as error:
        try:
            provider_body = error.read().decode(
                "utf-8",
                errors="replace",
            )
        except Exception:
            provider_body = "<response body unavailable>"

        # Keep credentials out of logs while retaining the provider's
        # status and validation message for production diagnosis.
        print(
            "RESEND EMAIL HTTP ERROR:",
            int(error.code),
            provider_body[:2000],
        )
        raise HTTPException(
            status_code=503,
            detail="Unable to send the verification email.",
        ) from error

    except (URLError, TimeoutError) as error:
        print(
            "RESEND EMAIL CONNECTION ERROR:",
            type(error).__name__,
            str(error)[:1000],
        )
        raise HTTPException(
            status_code=503,
            detail="Unable to send the verification email.",
        ) from error


def create_trial_access_token(
    *,
    user_id: int,
    store_id: int,
    trial_expires_at: datetime,
) -> str:
    secret_key = os.environ.get("JWT_SECRET_KEY")

    if not secret_key:
        raise RuntimeError("JWT_SECRET_KEY is required")

    now = utc_now()
    token_minutes = int(
        os.environ.get("JWT_ACCESS_TOKEN_MINUTES", "10080")
    )

    return jwt.encode(
        {
            "sub": str(user_id),
            "store_id": int(store_id),
            "account_type": "trial",
            "trial_expires_at": trial_expires_at.isoformat(),
            "iat": now,
            "exp": now + timedelta(minutes=token_minutes),
        },
        secret_key,
        algorithm="HS256",
    )


def get_trial_current_user(
    token: str = Depends(oauth2_scheme),
) -> TrialAuthenticatedUser:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            os.environ.get("JWT_SECRET_KEY"),
            algorithms=["HS256"],
            options={"require": ["sub", "store_id", "iat", "exp"]},
        )
        user_id = int(payload["sub"])
        store_id = int(payload["store_id"])

    except (InvalidTokenError, ValueError, TypeError, KeyError):
        raise credentials_error

    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT user_id, store_id, email
            FROM users
            WHERE user_id = %s
              AND store_id = %s
            """,
            (user_id, store_id),
        )
        row = cursor.fetchone()

        if not row:
            raise credentials_error

        return TrialAuthenticatedUser(
            user_id=int(row[0]),
            store_id=int(row[1]),
            email=str(row[2]),
        )

    finally:
        cursor.close()
        conn.close()


@router.get("/config")
def trial_config():
    return public_trial_config()


@router.post("/request", status_code=202)
def request_trial(data: TrialSignupRequest, request: Request):
    if not env_enabled("TRIAL_SIGNUP_ENABLED"):
        raise HTTPException(
            status_code=503,
            detail="Trial registration is not available yet.",
        )

    email = data.email.strip().lower()
    contact_name = data.contact_name.strip()
    store_name = data.store_name.strip()
    business_type = data.business_type.strip().lower()
    whatsapp = data.whatsapp.strip()
    language = "en" if data.language == "en" else "es"
    remote_ip = client_ip(request)
    ip_hash = hash_client_ip(remote_ip)

    if not EMAIL_PATTERN.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email.")

    if len(contact_name) < 2 or len(store_name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Owner and business names are required.",
        )

    if business_type not in {
        "hardware_store",
        "retail_store",
        "restaurant",
        "distributor",
        "other",
    }:
        raise HTTPException(
            status_code=400,
            detail="Select a valid business type.",
        )

    phone_digits = re.sub(r"\D", "", whatsapp)

    if len(phone_digits) < 8 or len(phone_digits) > 15:
        raise HTTPException(
            status_code=400,
            detail="Enter a valid WhatsApp number.",
        )

    if len(data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters.",
        )

    verify_turnstile(data.turnstile_token, remote_ip)

    conn = db()
    cursor = conn.cursor()

    try:
        one_hour_ago = utc_now() - timedelta(hours=1)

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM trial_signup_requests
            WHERE requested_ip_hash = %s
              AND created_at >= %s
            """,
            (ip_hash, one_hour_ago),
        )

        if int(cursor.fetchone()[0]) >= 5:
            raise HTTPException(
                status_code=429,
                detail="Too many trial requests. Please try again later.",
            )

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM trial_signup_requests
            WHERE LOWER(email) = %s
              AND created_at >= %s
            """,
            (email, one_hour_ago),
        )

        if int(cursor.fetchone()[0]) >= 3:
            raise HTTPException(
                status_code=429,
                detail="Check your email or try again later.",
            )

        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE LOWER(email) = %s
            """,
            (email,),
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="An account already exists for this email.",
            )

        cursor.execute(
            """
            DELETE FROM trial_signup_requests
            WHERE LOWER(email) = %s
              AND verified_at IS NULL
            """,
            (email,),
        )

        verification_token = secrets.token_urlsafe(32)
        verification_hash = hashlib.sha256(
            verification_token.encode("utf-8")
        ).hexdigest()
        now = utc_now()
        verification_expires = now + timedelta(minutes=30)

        cursor.execute(
            """
            INSERT INTO trial_signup_requests (
                email,
                password_hash,
                contact_name,
                store_name,
                business_type,
                whatsapp,
                language,
                verification_token_hash,
                requested_ip_hash,
                created_at,
                expires_at
            )
            VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            """,
            (
                email,
                password_hash.hash(data.password),
                contact_name,
                store_name,
                business_type,
                whatsapp,
                language,
                verification_hash,
                ip_hash,
                now,
                verification_expires,
            ),
        )

        send_verification_email(
            email=email,
            contact_name=contact_name,
            verification_token=verification_token,
            language=language,
        )

        conn.commit()

        return {
            "verification_required": True,
            "email": email,
        }

    except HTTPException:
        conn.rollback()
        raise

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=409,
            detail="A verification request is already pending.",
        )

    except Exception as error:
        conn.rollback()
        print("TRIAL REQUEST ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to begin the trial.",
        )

    finally:
        cursor.close()
        conn.close()


@router.post("/verify")
def verify_trial(data: TrialVerificationRequest):
    token = data.token.strip()

    if not token:
        raise HTTPException(
            status_code=400,
            detail="Verification token is required.",
        )

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                trial_signup_id,
                email,
                password_hash,
                contact_name,
                store_name,
                business_type,
                whatsapp
            FROM trial_signup_requests
            WHERE verification_token_hash = %s
              AND verified_at IS NULL
              AND expires_at > NOW()
            FOR UPDATE
            """,
            (token_hash,),
        )
        pending = cursor.fetchone()

        if not pending:
            raise HTTPException(
                status_code=400,
                detail="This verification link is invalid or expired.",
            )

        (
            signup_id,
            email,
            stored_password_hash,
            contact_name,
            store_name,
            business_type,
            whatsapp,
        ) = pending

        cursor.execute(
            "SELECT user_id FROM users WHERE LOWER(email) = %s",
            (email,),
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="An account already exists for this email.",
            )

        now = utc_now()
        trial_days = int(os.environ.get("TRIAL_LENGTH_DAYS", "14"))
        retention_days = int(
            os.environ.get("TRIAL_RETENTION_DAYS", "30")
        )
        trial_expires = now + timedelta(days=trial_days)
        retention_until = trial_expires + timedelta(
            days=retention_days
        )
        created_at = now.isoformat()

        cursor.execute(
            """
            INSERT INTO stores (
                name,
                created_at,
                organization_id,
                account_type,
                trial_started_at,
                trial_expires_at,
                trial_retention_until,
                trial_contact_name,
                trial_whatsapp,
                trial_business_type
            )
            VALUES (
                %s, %s, NULL, 'trial',
                %s, %s, %s, %s, %s, %s
            )
            RETURNING store_id
            """,
            (
                store_name,
                created_at,
                now,
                trial_expires,
                retention_until,
                contact_name,
                whatsapp,
                business_type,
            ),
        )
        store_id = int(cursor.fetchone()[0])

        cursor.execute(
            """
            INSERT INTO users (
                email,
                password,
                password_hash,
                store_id,
                created_at,
                email_verified_at
            )
            VALUES (%s, NULL, %s, %s, %s, %s)
            RETURNING user_id
            """,
            (
                email,
                stored_password_hash,
                store_id,
                created_at,
                now,
            ),
        )
        user_id = int(cursor.fetchone()[0])

        cursor.execute(
            """
            UPDATE trial_signup_requests
            SET verified_at = %s
            WHERE trial_signup_id = %s
            """,
            (now, signup_id),
        )

        conn.commit()

        access_token = create_trial_access_token(
            user_id=user_id,
            store_id=store_id,
            trial_expires_at=trial_expires,
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user_id,
            "store_id": store_id,
            "store_name": store_name,
            "email": email,
            "account_type": "trial",
            "trial_expires_at": trial_expires.isoformat(),
            "trial_days_remaining": trial_days,
            "trial_read_only": False,
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as error:
        conn.rollback()
        print("TRIAL VERIFICATION ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to activate the trial.",
        )

    finally:
        cursor.close()
        conn.close()


@router.get("/status")
def trial_status(
    current_user: TrialAuthenticatedUser = Depends(
        get_trial_current_user
    ),
):
    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                account_type,
                trial_started_at,
                trial_expires_at,
                trial_retention_until,
                trial_converted_at,
                subscription_started_at,
                subscription_paid_through,
                subscription_grace_until,
                subscription_canceled_at,
                subscription_monthly_price
            FROM stores
            WHERE store_id = %s
            """,
            (current_user.store_id,),
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Store not found.")

        now = utc_now()
        account_type = row[0] or "legacy"
        expires_at = parse_timestamp(row[2])
        paid_through = parse_timestamp(row[6])
        grace_until = parse_timestamp(row[7])
        canceled_at = parse_timestamp(row[8])
        access = subscription_access_state(
            account_type=account_type,
            trial_expires_at=expires_at,
            paid_through=paid_through,
            grace_until=grace_until,
            canceled_at=canceled_at,
            now=now,
        )
        days_remaining = None

        if account_type == "trial" and expires_at:
            seconds = max(
                0,
                (expires_at - now).total_seconds(),
            )
            days_remaining = int((seconds + 86399) // 86400)

        return {
            "account_type": account_type,
            "is_trial": account_type == "trial",
            "trial_started_at": (
                row[1].isoformat() if row[1] else None
            ),
            "trial_expires_at": (
                expires_at.isoformat() if expires_at else None
            ),
            "trial_retention_until": (
                row[3].isoformat() if row[3] else None
            ),
            "trial_converted_at": (
                row[4].isoformat() if row[4] else None
            ),
            "trial_days_remaining": days_remaining,
            "trial_read_only": bool(
                account_type == "trial" and access["read_only"]
            ),
            "subscription_started_at": (
                row[5].isoformat() if row[5] else None
            ),
            "subscription_paid_through": (
                paid_through.isoformat() if paid_through else None
            ),
            "subscription_grace_until": (
                grace_until.isoformat() if grace_until else None
            ),
            "subscription_canceled_at": (
                canceled_at.isoformat() if canceled_at else None
            ),
            "subscription_monthly_price": (
                str(row[9]) if row[9] is not None else None
            ),
            "subscription_status": subscription_display_status(
                access,
                paid_through,
                now,
            ),
            "account_read_only": access["read_only"],
        }

    finally:
        cursor.close()
        conn.close()


@router.get("/onboarding-status")
def trial_onboarding_status(
    current_user: TrialAuthenticatedUser = Depends(
        get_trial_current_user
    ),
):
    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                EXISTS (
                    SELECT 1
                    FROM products
                    WHERE store_id = %s
                      AND is_active = 1
                ),
                EXISTS (
                    SELECT 1
                    FROM cash_events
                    WHERE store_id = %s
                      AND type IN (
                          'cash_adjustment_positive',
                          'cash_adjustment_negative'
                      )
                ),
                EXISTS (
                    SELECT 1
                    FROM events
                    WHERE store_id = %s
                      AND event_type = 'sale'
                )
            """,
            (
                current_user.store_id,
                current_user.store_id,
                current_user.store_id,
            ),
        )
        row = cursor.fetchone() or (False, False, False)

        return {
            "products": bool(row[0]),
            "cash": bool(row[1]),
            "sale": bool(row[2]),
        }

    finally:
        cursor.close()
        conn.close()


def platform_admin_store_ids() -> set[int]:
    store_ids = set()

    for value in os.environ.get(
        "VENDR_PLATFORM_ADMIN_STORE_IDS",
        "",
    ).split(","):
        value = value.strip()

        if not value:
            continue

        try:
            store_ids.add(int(value))
        except ValueError:
            continue

    return store_ids


def require_platform_admin(
    current_user: TrialAuthenticatedUser = Depends(
        get_trial_current_user
    ),
) -> TrialAuthenticatedUser:
    if current_user.store_id not in platform_admin_store_ids():
        raise HTTPException(
            status_code=403,
            detail="Platform administrator access is required.",
        )

    return current_user


@router.get("/admin/stores")
def list_trial_stores(
    current_user: TrialAuthenticatedUser = Depends(
        require_platform_admin
    ),
):
    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                s.store_id,
                s.name,
                s.account_type,
                s.trial_started_at,
                s.trial_expires_at,
                s.trial_retention_until,
                s.trial_converted_at,
                s.trial_contact_name,
                s.trial_whatsapp,
                s.trial_business_type,
                u.email,
                s.subscription_started_at,
                s.subscription_paid_through,
                s.subscription_grace_until,
                s.subscription_canceled_at,
                s.subscription_monthly_price,
                last_payment.amount,
                last_payment.paid_at,
                last_payment.payment_method,
                COALESCE(payment_totals.payment_count, 0)
            FROM stores s
            LEFT JOIN users u
              ON u.store_id = s.store_id
            LEFT JOIN LATERAL (
                SELECT amount, paid_at, payment_method
                FROM subscription_payments
                WHERE store_id = s.store_id
                ORDER BY paid_at DESC, subscription_payment_id DESC
                LIMIT 1
            ) last_payment ON TRUE
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS payment_count
                FROM subscription_payments
                WHERE store_id = s.store_id
            ) payment_totals ON TRUE
            WHERE s.trial_started_at IS NOT NULL
            ORDER BY s.trial_started_at DESC, s.store_id DESC
            """
        )

        stores = []
        now = utc_now()

        for row in cursor.fetchall():
            expires_at = parse_timestamp(row[4])
            paid_through = parse_timestamp(row[12])
            grace_until = parse_timestamp(row[13])
            canceled_at = parse_timestamp(row[14])
            access = subscription_access_state(
                account_type=row[2] or "legacy",
                trial_expires_at=expires_at,
                paid_through=paid_through,
                grace_until=grace_until,
                canceled_at=canceled_at,
                now=now,
            )
            stores.append(
                {
                    "store_id": int(row[0]),
                    "store_name": row[1],
                    "account_type": row[2] or "legacy",
                    "trial_started_at": (
                        row[3].isoformat() if row[3] else None
                    ),
                    "trial_expires_at": (
                        expires_at.isoformat() if expires_at else None
                    ),
                    "trial_retention_until": (
                        row[5].isoformat() if row[5] else None
                    ),
                    "trial_converted_at": (
                        row[6].isoformat() if row[6] else None
                    ),
                    "contact_name": row[7],
                    "whatsapp": row[8],
                    "business_type": row[9],
                    "email": row[10],
                    "subscription_started_at": (
                        row[11].isoformat() if row[11] else None
                    ),
                    "subscription_paid_through": (
                        paid_through.isoformat() if paid_through else None
                    ),
                    "subscription_grace_until": (
                        grace_until.isoformat() if grace_until else None
                    ),
                    "subscription_canceled_at": (
                        canceled_at.isoformat() if canceled_at else None
                    ),
                    "subscription_monthly_price": (
                        str(row[15])
                        if row[15] is not None
                        else os.environ.get("VENDR_MONTHLY_PRICE", "20.00")
                    ),
                    "subscription_status": subscription_display_status(
                        access,
                        paid_through,
                        now,
                    ),
                    "account_read_only": access["read_only"],
                    "trial_read_only": bool(
                        (row[2] or "legacy") == "trial"
                        and access["read_only"]
                    ),
                    "last_payment_amount": (
                        str(row[16]) if row[16] is not None else None
                    ),
                    "last_payment_at": (
                        row[17].isoformat() if row[17] else None
                    ),
                    "last_payment_method": row[18],
                    "payment_count": int(row[19]),
                }
            )

        return {"stores": stores}

    finally:
        cursor.close()
        conn.close()


def serialize_subscription_payment(row) -> dict:
    return {
        "subscription_payment_id": int(row[0]),
        "client_payment_id": row[1],
        "amount": str(row[2]),
        "currency": row[3],
        "payment_method": row[4],
        "payment_reference": row[5],
        "note": row[6],
        "paid_at": row[7].isoformat(),
        "period_start": row[8].isoformat(),
        "period_end": row[9].isoformat(),
        "months_granted": int(row[10]),
        "recorded_by_email": row[11],
        "created_at": row[12].isoformat(),
    }


@router.get("/admin/stores/{store_id}/payments")
def list_subscription_payments(
    store_id: int,
    current_user: TrialAuthenticatedUser = Depends(
        require_platform_admin
    ),
):
    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                p.subscription_payment_id,
                p.client_payment_id,
                p.amount,
                p.currency,
                p.payment_method,
                p.payment_reference,
                p.note,
                p.paid_at,
                p.period_start,
                p.period_end,
                p.months_granted,
                u.email,
                p.created_at
            FROM subscription_payments p
            JOIN users u
              ON u.user_id = p.recorded_by_user_id
            WHERE p.store_id = %s
            ORDER BY p.paid_at DESC, p.subscription_payment_id DESC
            """,
            (store_id,),
        )
        return {
            "payments": [
                serialize_subscription_payment(row)
                for row in cursor.fetchall()
            ]
        }
    finally:
        cursor.close()
        conn.close()


@router.post("/admin/stores/{store_id}/payments")
def record_subscription_payment(
    store_id: int,
    data: SubscriptionPaymentRequest,
    current_user: TrialAuthenticatedUser = Depends(
        require_platform_admin
    ),
):
    payment_method = data.payment_method.strip().lower()

    if payment_method not in SUBSCRIPTION_PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail="Invalid payment method.")

    client_payment_id = data.client_payment_id.strip()
    reference = (data.payment_reference or "").strip() or None
    note = (data.note or "").strip() or None
    paid_at = parse_timestamp(data.paid_at) or utc_now()
    now = utc_now()
    grace_days = max(
        0,
        int(os.environ.get("SUBSCRIPTION_GRACE_DAYS", "3")),
    )
    monthly_price = Decimal(
        os.environ.get("VENDR_MONTHLY_PRICE", "20.00")
    )
    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                subscription_payment_id,
                store_id,
                period_end
            FROM subscription_payments
            WHERE client_payment_id = %s
            """,
            (client_payment_id,),
        )
        duplicate = cursor.fetchone()

        if duplicate:
            if int(duplicate[1]) != store_id:
                raise HTTPException(
                    status_code=409,
                    detail="Payment identifier is already in use.",
                )

            return {
                "subscription_payment_id": int(duplicate[0]),
                "store_id": store_id,
                "subscription_paid_through": duplicate[2].isoformat(),
                "already_recorded": True,
            }

        cursor.execute(
            """
            SELECT
                name,
                account_type,
                trial_started_at,
                trial_expires_at,
                subscription_paid_through
            FROM stores
            WHERE store_id = %s
            FOR UPDATE
            """,
            (store_id,),
        )
        store = cursor.fetchone()

        if not store or not store[2]:
            raise HTTPException(status_code=404, detail="Trial store not found.")

        if (store[1] or "legacy") not in {"trial", "paid"}:
            raise HTTPException(
                status_code=409,
                detail="This store cannot receive subscription payments.",
            )

        current_paid_through = parse_timestamp(store[4])
        trial_expires_at = parse_timestamp(store[3])
        period_start, period_end = calculate_subscription_period(
            now=now,
            months=data.months,
            trial_expires_at=trial_expires_at,
            current_paid_through=current_paid_through,
        )
        grace_until = period_end + timedelta(days=grace_days)

        cursor.execute(
            """
            INSERT INTO subscription_payments (
                client_payment_id,
                store_id,
                amount,
                currency,
                payment_method,
                payment_reference,
                note,
                paid_at,
                period_start,
                period_end,
                months_granted,
                recorded_by_user_id,
                created_at
            )
            VALUES (%s, %s, %s, 'USD', %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING subscription_payment_id
            """,
            (
                client_payment_id,
                store_id,
                data.amount,
                payment_method,
                reference,
                note,
                paid_at,
                period_start,
                period_end,
                data.months,
                current_user.user_id,
                now,
            ),
        )
        payment_id = int(cursor.fetchone()[0])
        cursor.execute(
            """
            UPDATE stores
            SET
                account_type = 'paid',
                trial_converted_at = COALESCE(trial_converted_at, %s),
                subscription_started_at = COALESCE(subscription_started_at, %s),
                subscription_paid_through = %s,
                subscription_grace_until = %s,
                subscription_canceled_at = NULL,
                subscription_monthly_price = COALESCE(
                    subscription_monthly_price,
                    %s
                )
            WHERE store_id = %s
            """,
            (now, period_start, period_end, grace_until, monthly_price, store_id),
        )
        conn.commit()

        return {
            "subscription_payment_id": payment_id,
            "store_id": store_id,
            "store_name": store[0],
            "account_type": "paid",
            "subscription_status": "active",
            "subscription_paid_through": period_end.isoformat(),
            "subscription_grace_until": grace_until.isoformat(),
            "already_recorded": False,
        }
    except HTTPException:
        conn.rollback()
        raise
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        cursor.execute(
            """
            SELECT subscription_payment_id, store_id, period_end
            FROM subscription_payments
            WHERE client_payment_id = %s
            """,
            (client_payment_id,),
        )
        duplicate = cursor.fetchone()

        if duplicate and int(duplicate[1]) == store_id:
            return {
                "subscription_payment_id": int(duplicate[0]),
                "store_id": store_id,
                "subscription_paid_through": duplicate[2].isoformat(),
                "already_recorded": True,
            }

        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


@router.post("/admin/stores/{store_id}/cancel")
def cancel_subscription(
    store_id: int,
    data: SubscriptionActionRequest,
    current_user: TrialAuthenticatedUser = Depends(
        require_platform_admin
    ),
):
    conn = db()
    cursor = conn.cursor()
    now = utc_now()

    try:
        cursor.execute(
            """
            UPDATE stores
            SET subscription_canceled_at = COALESCE(subscription_canceled_at, %s)
            WHERE store_id = %s
              AND account_type = 'paid'
              AND subscription_paid_through IS NOT NULL
              AND subscription_paid_through > %s
            RETURNING subscription_paid_through, subscription_canceled_at
            """,
            (now, store_id, now),
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Paid store not found.")

        cursor.execute(
            """
            INSERT INTO subscription_admin_events (
                store_id, event_type, note, recorded_by_user_id, created_at
            )
            VALUES (%s, 'subscription_canceled', %s, %s, %s)
            """,
            (store_id, (data.note or "").strip() or None, current_user.user_id, now),
        )
        conn.commit()
        return {
            "store_id": store_id,
            "subscription_paid_through": (
                row[0].isoformat() if row[0] else None
            ),
            "subscription_canceled_at": row[1].isoformat(),
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


@router.post("/admin/stores/{store_id}/resume")
def resume_subscription(
    store_id: int,
    data: SubscriptionActionRequest,
    current_user: TrialAuthenticatedUser = Depends(
        require_platform_admin
    ),
):
    conn = db()
    cursor = conn.cursor()
    now = utc_now()

    try:
        cursor.execute(
            """
            UPDATE stores
            SET subscription_canceled_at = NULL
            WHERE store_id = %s
              AND account_type = 'paid'
              AND subscription_canceled_at IS NOT NULL
            RETURNING subscription_paid_through, subscription_grace_until
            """,
            (store_id,),
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Canceled subscription not found.",
            )

        cursor.execute(
            """
            INSERT INTO subscription_admin_events (
                store_id, event_type, note, recorded_by_user_id, created_at
            )
            VALUES (%s, 'subscription_resumed', %s, %s, %s)
            """,
            (store_id, (data.note or "").strip() or None, current_user.user_id, now),
        )
        conn.commit()
        return {
            "store_id": store_id,
            "subscription_paid_through": (
                row[0].isoformat() if row[0] else None
            ),
            "subscription_grace_until": (
                row[1].isoformat() if row[1] else None
            ),
            "subscription_canceled_at": None,
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


@router.post("/admin/stores/{store_id}/convert")
def convert_trial_store(
    store_id: int,
    current_user: TrialAuthenticatedUser = Depends(
        require_platform_admin
    ),
):
    raise HTTPException(
        status_code=410,
        detail="Record a subscription payment to activate this store.",
    )


async def enforce_trial_write_access(request: Request, call_next):
    if (
        request.method in SAFE_METHODS
        or request.url.path in WRITE_GUARD_EXEMPT_PATHS
    ):
        return await call_next(request)

    authorization = request.headers.get("authorization", "")

    if not authorization.lower().startswith("bearer "):
        return await call_next(request)

    token = authorization.split(" ", 1)[1].strip()

    try:
        payload = jwt.decode(
            token,
            os.environ.get("JWT_SECRET_KEY"),
            algorithms=["HS256"],
        )
    except InvalidTokenError:
        return await call_next(request)

    account_type = payload.get("account_type") or "legacy"

    if account_type not in {"trial", "paid"}:
        return await call_next(request)

    now = utc_now()
    token_access = subscription_access_state(
        account_type=account_type,
        trial_expires_at=payload.get("trial_expires_at"),
        paid_through=payload.get("subscription_paid_through"),
        grace_until=payload.get("subscription_grace_until"),
        canceled_at=payload.get("subscription_canceled_at"),
        now=now,
    )

    paid_claim_missing = bool(
        account_type == "paid"
        and "subscription_paid_through" not in payload
    )

    if token_access["read_only"] or paid_claim_missing:
        # Recheck only when a token says access ended or predates the
        # subscription claims. A renewal may have extended the database
        # state without forcing the store to sign in again.
        conn = db()
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                SELECT
                    account_type,
                    trial_expires_at,
                    subscription_paid_through,
                    subscription_grace_until,
                    subscription_canceled_at
                FROM stores
                WHERE store_id = %s
                """,
                (int(payload.get("store_id")),),
            )
            row = cursor.fetchone()
        except (TypeError, ValueError):
            row = None
        finally:
            cursor.close()
            conn.close()

        if row:
            database_access = subscription_access_state(
                account_type=row[0] or "legacy",
                trial_expires_at=row[1],
                paid_through=row[2],
                grace_until=row[3],
                canceled_at=row[4],
                now=now,
            )
        else:
            database_access = token_access

        if not database_access["read_only"]:
            return await call_next(request)

        is_trial = database_access["status"] == "trial_expired"
        return JSONResponse(
            status_code=403,
            content={
                "detail": (
                    "The trial has ended. Store data remains available "
                    "in read-only mode."
                    if is_trial
                    else
                    "The subscription is not active. Store data remains "
                    "available in read-only mode."
                ),
                "code": (
                    "trial_expired_read_only"
                    if is_trial
                    else "subscription_inactive_read_only"
                ),
            },
        )

    return await call_next(request)
