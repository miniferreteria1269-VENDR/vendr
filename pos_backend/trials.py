from datetime import datetime, timedelta, timezone
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
from pydantic import BaseModel
from pwdlib import PasswordHash
from jwt.exceptions import InvalidTokenError


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


def db():
    return psycopg2.connect(os.environ.get("DATABASE_URL"))


def env_enabled(name: str, default: str = "false") -> bool:
    return os.environ.get(name, default).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_timestamp(value):
    if value is None or isinstance(value, datetime):
        return value

    normalized = str(value).replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed


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
                trial_converted_at
            FROM stores
            WHERE store_id = %s
            """,
            (current_user.store_id,),
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Store not found.")

        account_type = row[0] or "legacy"
        expires_at = parse_timestamp(row[2])
        read_only = bool(
            account_type == "trial"
            and expires_at
            and expires_at <= utc_now()
        )
        days_remaining = None

        if account_type == "trial" and expires_at:
            seconds = max(
                0,
                (expires_at - utc_now()).total_seconds(),
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
            "trial_read_only": read_only,
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
                u.email
            FROM stores s
            LEFT JOIN users u
              ON u.store_id = s.store_id
            WHERE s.trial_started_at IS NOT NULL
            ORDER BY s.trial_started_at DESC, s.store_id DESC
            """
        )

        stores = []

        for row in cursor.fetchall():
            expires_at = parse_timestamp(row[4])
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
                    "trial_read_only": bool(
                        row[2] == "trial"
                        and expires_at
                        and expires_at <= utc_now()
                    ),
                }
            )

        return {"stores": stores}

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
    conn = db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE stores
            SET
                account_type = 'paid',
                trial_converted_at = COALESCE(
                    trial_converted_at,
                    %s
                )
            WHERE store_id = %s
              AND account_type = 'trial'
            RETURNING store_id, name, trial_converted_at
            """,
            (utc_now(), store_id),
        )
        row = cursor.fetchone()

        if not row:
            cursor.execute(
                """
                SELECT account_type
                FROM stores
                WHERE store_id = %s
                """,
                (store_id,),
            )
            existing = cursor.fetchone()

            if not existing:
                raise HTTPException(
                    status_code=404,
                    detail="Trial store not found.",
                )

            if existing[0] == "paid":
                conn.commit()
                return {
                    "store_id": store_id,
                    "account_type": "paid",
                    "already_converted": True,
                }

            raise HTTPException(
                status_code=409,
                detail="Only trial stores can be converted.",
            )

        conn.commit()

        return {
            "store_id": int(row[0]),
            "store_name": row[1],
            "account_type": "paid",
            "trial_converted_at": row[2].isoformat(),
            "already_converted": False,
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

    if payload.get("account_type") != "trial":
        return await call_next(request)

    expires_at = parse_timestamp(payload.get("trial_expires_at"))

    if expires_at and expires_at <= utc_now():
        # A converted store may still be using the trial token issued
        # before conversion. Confirm only in this expired-trial path;
        # legacy and active sessions incur no extra database query.
        conn = db()
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                SELECT account_type
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

        if row and row[0] != "trial":
            return await call_next(request)

        return JSONResponse(
            status_code=403,
            content={
                "detail": (
                    "The trial has ended. Store data remains "
                    "available in read-only mode."
                ),
                "code": "trial_expired_read_only",
            },
        )

    return await call_next(request)
