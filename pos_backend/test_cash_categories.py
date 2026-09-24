import unittest

from pos_backend.cash_categories import (
    normalize_cash_category_label,
    normalize_cash_category_type,
    normalize_operating_expense_flag,
)


class CashCategoryNormalizationTests(unittest.TestCase):
    def test_label_is_trimmed(self):
        self.assertEqual(
            normalize_cash_category_label(
                "  Delivery fees  "
            ),
            "Delivery fees",
        )

    def test_blank_label_is_rejected(self):
        with self.assertRaises(ValueError):
            normalize_cash_category_label("   ")

    def test_overlong_label_is_rejected(self):
        with self.assertRaises(ValueError):
            normalize_cash_category_label("x" * 81)

    def test_category_type_is_normalized(self):
        self.assertEqual(
            normalize_cash_category_type(" Expense "),
            "expense",
        )

    def test_unknown_category_type_is_rejected(self):
        with self.assertRaises(ValueError):
            normalize_cash_category_type("sale")

    def test_expense_defaults_to_operating(self):
        self.assertTrue(
            normalize_operating_expense_flag(
                "expense",
                None,
            )
        )

    def test_expense_can_be_non_operating(self):
        self.assertFalse(
            normalize_operating_expense_flag(
                "expense",
                False,
            )
        )

    def test_revenue_ignores_operating_flag(self):
        self.assertIsNone(
            normalize_operating_expense_flag(
                "revenue",
                True,
            )
        )


if __name__ == "__main__":
    unittest.main()
