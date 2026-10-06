VALID_SLOT_TYPES = {
    "fixed",
    "choose_one",
}


class ComboValidationError(ValueError):
    pass


def validate_combo_slots(slots):
    if not slots:
        raise ComboValidationError(
            "A combo requires at least one component slot."
        )

    normalized = []

    for position, slot in enumerate(slots):
        selection_type = str(
            slot.get("selection_type") or ""
        ).strip()

        if selection_type not in VALID_SLOT_TYPES:
            raise ComboValidationError(
                "Combo slots must be fixed or choose_one."
            )

        label = str(slot.get("label") or "").strip()

        if not label:
            raise ComboValidationError(
                "Every combo slot requires a label."
            )

        quantity = int(slot.get("quantity") or 0)

        if quantity <= 0:
            raise ComboValidationError(
                "Combo component quantities must be greater than zero."
            )

        raw_options = slot.get("options") or []
        option_ids = [
            int(option.get("product_id"))
            for option in raw_options
            if option.get("product_id") is not None
        ]

        if not option_ids:
            raise ComboValidationError(
                "Every combo slot requires at least one product option."
            )

        if len(option_ids) != len(set(option_ids)):
            raise ComboValidationError(
                "A product may only appear once in the same combo slot."
            )

        if selection_type == "fixed" and len(option_ids) != 1:
            raise ComboValidationError(
                "A fixed combo slot must contain exactly one product."
            )

        normalized.append({
            "label": label,
            "selection_type": selection_type,
            "quantity": quantity,
            "position": position,
            "options": [
                {
                    "product_id": product_id,
                    "position": option_position,
                }
                for option_position, product_id
                in enumerate(option_ids)
            ],
        })

    return normalized


def resolve_combo_selections(
    slots,
    selections,
    sale_quantity,
):
    numeric_sale_quantity = int(sale_quantity or 0)

    if numeric_sale_quantity <= 0:
        raise ComboValidationError(
            "Sale quantity must be greater than zero."
        )

    selection_map = {}

    for selection in selections or []:
        slot_id = int(selection.get("slot_id") or 0)
        product_id = int(selection.get("product_id") or 0)

        if slot_id <= 0 or product_id <= 0:
            raise ComboValidationError(
                "Every combo selection requires a slot and product."
            )

        if slot_id in selection_map:
            raise ComboValidationError(
                "A combo slot may only be selected once."
            )

        selection_map[slot_id] = product_id

    expected_slot_ids = {
        int(slot["slot_id"])
        for slot in slots
    }

    if set(selection_map) != expected_slot_ids:
        raise ComboValidationError(
            "Every combo component slot must have one selection."
        )

    resolved = []

    for slot in slots:
        slot_id = int(slot["slot_id"])
        selected_product_id = selection_map[slot_id]
        allowed_ids = {
            int(option["product_id"])
            for option in slot.get("options") or []
        }

        if selected_product_id not in allowed_ids:
            raise ComboValidationError(
                "The selected product is not allowed for this combo slot."
            )

        quantity_per_combo = int(slot["quantity"])

        resolved.append({
            "slot_id": slot_id,
            "slot_label": slot["label"],
            "selection_type": slot["selection_type"],
            "product_id": selected_product_id,
            "quantity_per_combo": quantity_per_combo,
            "total_quantity": (
                quantity_per_combo * numeric_sale_quantity
            ),
        })

    return resolved
