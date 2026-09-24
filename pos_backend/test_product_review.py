import unittest
from datetime import datetime, timezone

from pos_backend.product_review import (
    IMPORTED_PRODUCT_CREATION,
    MANUAL_PRODUCT_CREATION,
    product_creation_review_metadata,
)


class ProductCreationReviewTests(unittest.TestCase):
    def test_manual_creation_is_reviewed(self):
        created_at = datetime(
            2026,
            9,
            24,
            15,
            30,
            tzinfo=timezone.utc,
        )

        reviewed_at, reviewed_by = (
            product_creation_review_metadata(
                MANUAL_PRODUCT_CREATION,
                user_id=42,
                created_at=created_at,
            )
        )

        self.assertEqual(reviewed_at, created_at)
        self.assertEqual(reviewed_by, 42)

    def test_imported_creation_is_never_reviewed(self):
        reviewed_at, reviewed_by = (
            product_creation_review_metadata(
                IMPORTED_PRODUCT_CREATION,
                user_id=42,
                created_at=datetime.now(timezone.utc),
            )
        )

        self.assertIsNone(reviewed_at)
        self.assertIsNone(reviewed_by)

    def test_unknown_creation_source_is_rejected(self):
        with self.assertRaises(ValueError):
            product_creation_review_metadata("migration")

    def test_manual_creation_requires_user_and_time(self):
        with self.assertRaises(ValueError):
            product_creation_review_metadata(
                MANUAL_PRODUCT_CREATION,
                user_id=None,
                created_at=None,
            )


if __name__ == "__main__":
    unittest.main()
