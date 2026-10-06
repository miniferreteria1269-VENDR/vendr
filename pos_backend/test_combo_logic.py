import unittest

from pos_backend.combo_logic import (
    ComboValidationError,
    resolve_combo_selections,
    validate_combo_slots,
)


class ComboLogicTests(unittest.TestCase):
    def setUp(self):
        self.slots = [
            {
                "slot_id": 10,
                "label": "Hamburger",
                "selection_type": "fixed",
                "quantity": 1,
                "options": [{"product_id": 100}],
            },
            {
                "slot_id": 11,
                "label": "Drink",
                "selection_type": "choose_one",
                "quantity": 1,
                "options": [
                    {"product_id": 200},
                    {"product_id": 201},
                ],
            },
        ]

    def test_configuration_requires_one_fixed_option(self):
        with self.assertRaises(ComboValidationError):
            validate_combo_slots([
                {
                    "label": "Food",
                    "selection_type": "fixed",
                    "quantity": 1,
                    "options": [
                        {"product_id": 100},
                        {"product_id": 101},
                    ],
                }
            ])

    def test_resolves_fixed_and_selected_components(self):
        resolved = resolve_combo_selections(
            self.slots,
            [
                {"slot_id": 10, "product_id": 100},
                {"slot_id": 11, "product_id": 201},
            ],
            2,
        )

        self.assertEqual(resolved[0]["total_quantity"], 2)
        self.assertEqual(resolved[1]["product_id"], 201)
        self.assertEqual(resolved[1]["total_quantity"], 2)

    def test_rejects_missing_or_unapproved_choices(self):
        with self.assertRaises(ComboValidationError):
            resolve_combo_selections(
                self.slots,
                [{"slot_id": 10, "product_id": 100}],
                1,
            )

        with self.assertRaises(ComboValidationError):
            resolve_combo_selections(
                self.slots,
                [
                    {"slot_id": 10, "product_id": 100},
                    {"slot_id": 11, "product_id": 999},
                ],
                1,
            )


if __name__ == "__main__":
    unittest.main()
