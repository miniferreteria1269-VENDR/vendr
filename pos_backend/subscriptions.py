from calendar import monthrange
from datetime import datetime, timedelta, timezone


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


def add_calendar_months(value: datetime, months: int) -> datetime:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def calculate_subscription_period(
    *,
    now: datetime,
    months: int,
    trial_expires_at=None,
    current_paid_through=None,
) -> tuple[datetime, datetime]:
    period_start = now

    for candidate in (
        parse_timestamp(current_paid_through),
        parse_timestamp(trial_expires_at),
    ):
        if candidate and candidate > period_start:
            period_start = candidate

    return period_start, add_calendar_months(period_start, months)


def subscription_access_state(
    *,
    account_type: str,
    trial_expires_at=None,
    paid_through=None,
    grace_until=None,
    canceled_at=None,
    now: datetime | None = None,
) -> dict:
    now = now or utc_now()
    account_type = account_type or "legacy"
    trial_expires_at = parse_timestamp(trial_expires_at)
    paid_through = parse_timestamp(paid_through)
    grace_until = parse_timestamp(grace_until)
    canceled_at = parse_timestamp(canceled_at)

    if account_type == "legacy":
        return {"status": "legacy", "read_only": False}

    if account_type == "trial":
        expired = bool(trial_expires_at and trial_expires_at <= now)
        return {
            "status": "trial_expired" if expired else "trial_active",
            "read_only": expired,
        }

    if account_type != "paid":
        return {"status": "inactive", "read_only": True}

    # Paid rows created before subscription tracking are grandfathered so
    # this additive migration cannot unexpectedly lock out a customer.
    if not paid_through:
        return {
            "status": "canceled" if canceled_at else "paid_unmanaged",
            "read_only": bool(canceled_at),
        }

    if paid_through > now:
        return {
            "status": "canceled_active" if canceled_at else "active",
            "read_only": False,
        }

    if not canceled_at and grace_until and grace_until > now:
        return {"status": "grace", "read_only": False}

    return {
        "status": "canceled" if canceled_at else "past_due",
        "read_only": True,
    }


def subscription_display_status(
    state: dict,
    paid_through=None,
    now: datetime | None = None,
) -> str:
    now = now or utc_now()
    paid_through = parse_timestamp(paid_through)

    if (
        state["status"] == "active"
        and paid_through
        and paid_through <= now + timedelta(days=3)
    ):
        return "due_soon"

    return state["status"]
