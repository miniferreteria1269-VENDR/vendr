import unittest

from pos_backend.sale_event_ids import sale_line_client_event_id


class SaleEventIdTests(unittest.TestCase):
    def test_first_product_occurrence_keeps_ticket_retry_key(self):
        self.assertEqual(
            sale_line_client_event_id("ticket-123", 0, 0),
            "ticket-123",
        )

    def test_repeated_product_line_gets_distinct_key(self):
        self.assertEqual(
            sale_line_client_event_id("ticket-123", 2, 1),
            "ticket-123:line:2",
        )

    def test_online_sale_without_retry_key_stays_null(self):
        self.assertIsNone(
            sale_line_client_event_id(None, 1, 1)
        )


if __name__ == "__main__":
    unittest.main()
