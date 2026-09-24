CUSTOM_CASH_CATEGORY_TYPES = {
    "expense",
    "revenue",
}

MAX_CASH_CATEGORY_LABEL_LENGTH = 80


def normalize_cash_category_type(value):
    category_type = str(value or "").strip().lower()

    if category_type not in CUSTOM_CASH_CATEGORY_TYPES:
        raise ValueError(
            "Category type must be expense or revenue"
        )

    return category_type


def normalize_cash_category_label(value):
    label = str(value or "").strip()

    if not label:
        raise ValueError(
            "Category name is required"
        )

    if len(label) > MAX_CASH_CATEGORY_LABEL_LENGTH:
        raise ValueError(
            "Category name must be 80 characters or fewer"
        )

    return label


def normalize_operating_expense_flag(
    category_type,
    value,
):
    normalized_type = normalize_cash_category_type(
        category_type
    )

    if normalized_type == "revenue":
        return None

    if value is None:
        return True

    return bool(value)
