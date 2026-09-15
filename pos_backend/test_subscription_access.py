from datetime import datetime, timedelta, timezone
import unittest

from pos_backend.subscriptions import (
    add_calendar_months,
    calculate_subscription_period,
    subscription_access_state,
    subscription_display_status,
)


UTC = timezone.utc


class SubscriptionAccessTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 9, 15, 12, 0, tzinfo=UTC)

    def test_legacy_store_is_never_subscription_gated(self):
        state = subscription_access_state(
            account_type="legacy",
            now=self.now,
        )
        self.assertEqual(state, {"status": "legacy", "read_only": False})

    def test_expired_trial_is_read_only(self):
        state = subscription_access_state(
            account_type="trial",
            trial_expires_at=self.now - timedelta(seconds=1),
            now=self.now,
        )
        self.assertEqual(state["status"], "trial_expired")
        self.assertTrue(state["read_only"])

    def test_paid_store_is_active_through_paid_period(self):
        state = subscription_access_state(
            account_type="paid",
            paid_through=self.now + timedelta(days=10),
            grace_until=self.now + timedelta(days=13),
            now=self.now,
        )
        self.assertEqual(state["status"], "active")
        self.assertFalse(state["read_only"])

    def test_due_soon_is_a_display_status_only(self):
        paid_through = self.now + timedelta(days=2)
        state = subscription_access_state(
            account_type="paid",
            paid_through=paid_through,
            now=self.now,
        )
        self.assertFalse(state["read_only"])
        self.assertEqual(
            subscription_display_status(state, paid_through, self.now),
            "due_soon",
        )

    def test_grace_period_allows_writes(self):
        state = subscription_access_state(
            account_type="paid",
            paid_through=self.now - timedelta(days=1),
            grace_until=self.now + timedelta(days=2),
            now=self.now,
        )
        self.assertEqual(state["status"], "grace")
        self.assertFalse(state["read_only"])

    def test_past_due_after_grace_is_read_only(self):
        state = subscription_access_state(
            account_type="paid",
            paid_through=self.now - timedelta(days=4),
            grace_until=self.now - timedelta(days=1),
            now=self.now,
        )
        self.assertEqual(state["status"], "past_due")
        self.assertTrue(state["read_only"])

    def test_cancellation_keeps_access_until_paid_period_ends(self):
        active = subscription_access_state(
            account_type="paid",
            paid_through=self.now + timedelta(days=5),
            canceled_at=self.now,
            now=self.now,
        )
        ended = subscription_access_state(
            account_type="paid",
            paid_through=self.now - timedelta(seconds=1),
            grace_until=self.now + timedelta(days=3),
            canceled_at=self.now - timedelta(days=1),
            now=self.now,
        )
        self.assertEqual(active["status"], "canceled_active")
        self.assertFalse(active["read_only"])
        self.assertEqual(ended["status"], "canceled")
        self.assertTrue(ended["read_only"])

    def test_old_paid_store_without_period_is_grandfathered(self):
        state = subscription_access_state(
            account_type="paid",
            now=self.now,
        )
        self.assertEqual(state["status"], "paid_unmanaged")
        self.assertFalse(state["read_only"])

    def test_calendar_months_clamp_month_end(self):
        january_end = datetime(2027, 1, 31, 12, 0, tzinfo=UTC)
        self.assertEqual(
            add_calendar_months(january_end, 1),
            datetime(2027, 2, 28, 12, 0, tzinfo=UTC),
        )

    def test_payment_during_trial_preserves_remaining_trial_time(self):
        trial_end = self.now + timedelta(days=8)
        period_start, period_end = calculate_subscription_period(
            now=self.now,
            months=1,
            trial_expires_at=trial_end,
        )
        self.assertEqual(period_start, trial_end)
        self.assertEqual(period_end, datetime(2026, 10, 23, 12, 0, tzinfo=UTC))

    def test_early_renewal_extends_current_paid_period(self):
        paid_through = self.now + timedelta(days=20)
        period_start, period_end = calculate_subscription_period(
            now=self.now,
            months=1,
            current_paid_through=paid_through,
        )
        self.assertEqual(period_start, paid_through)
        self.assertEqual(period_end, datetime(2026, 11, 5, 12, 0, tzinfo=UTC))


if __name__ == "__main__":
    unittest.main()
