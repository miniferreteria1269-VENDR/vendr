MANUAL_PRODUCT_CREATION = "manual"
IMPORTED_PRODUCT_CREATION = "import"


def product_creation_review_metadata(
    creation_source,
    user_id=None,
    created_at=None,
):
    """Return explicit review metadata for a product creation path."""
    source = str(creation_source or "").strip().lower()

    if source == MANUAL_PRODUCT_CREATION:
        if user_id is None or created_at is None:
            raise ValueError(
                "Manual product creation requires reviewer metadata"
            )

        return created_at, int(user_id)

    if source == IMPORTED_PRODUCT_CREATION:
        return None, None

    raise ValueError("Unknown product creation source")
