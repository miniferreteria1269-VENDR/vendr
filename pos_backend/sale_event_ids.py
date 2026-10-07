from typing import Optional


def sale_line_client_event_id(
    ticket_client_event_id: Optional[str],
    item_index: int,
    product_occurrence: int,
) -> Optional[str]:
    """Return an idempotency key that permits repeated product lines."""
    if not ticket_client_event_id or product_occurrence == 0:
        return ticket_client_event_id

    return f"{ticket_client_event_id}:line:{item_index}"
