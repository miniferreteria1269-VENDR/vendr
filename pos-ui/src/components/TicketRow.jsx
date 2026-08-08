function TicketRow({
  item,
  index,
  removeItem,
  updateItemField,
  ticketType,
  disabled = false
}) {
  const parsedQuantity =
    Number(item.quantity);

  const quantity =
    Number.isFinite(parsedQuantity) &&
    parsedQuantity > 0
      ? parsedQuantity
      : 0;

  const unitPrice =
    Number(item.price) || 0;

  const lineTotal =
    unitPrice * quantity;

  const normalizeQuantity = value => {
    const numericValue =
      Number(value);

    if (
      !Number.isFinite(numericValue) ||
      numericValue < 1
    ) {
      return 1;
    }

    return Math.max(
      Math.trunc(numericValue),
      1
    );
  };

  const normalizeMoney = value => {
    const numericValue =
      Number(value);

    if (
      !Number.isFinite(numericValue) ||
      numericValue < 0
    ) {
      return 0;
    }

    return Math.round(
      numericValue * 100
    ) / 100;
  };

  const changeQuantity = amount => {
    if (disabled) {
      return;
    }

    const currentQuantity =
      normalizeQuantity(
        item.quantity
      );

    updateItemField(
      index,
      "quantity",
      Math.max(
        currentQuantity + amount,
        1
      )
    );
  };

  const fieldStyle = {
    width: "100%",
    minWidth: 0,
    height: 40,
    boxSizing: "border-box",
    background: "#2a2f3a",
    border: "1px solid #3a4250",
    borderRadius: 6,
    color: "white",
    padding: "6px 8px",
    textAlign: "center",
    fontSize: 15
  };

  const quantityButtonStyle = {
    width: 40,
    minWidth: 40,
    height: 40,
    padding: 0,
    border: "none",
    borderRadius: 7,
    fontSize: 20,
    fontWeight: "bold",

    cursor:
      disabled
        ? "default"
        : "pointer",

    opacity:
      disabled
        ? 0.6
        : 1,

    touchAction:
      "manipulation"
  };

  const updateMoneyField = (
    field,
    value
  ) => {
    /*
     * Preserve an empty string while the cashier
     * is editing. It will normalize on blur.
     */
    updateItemField(
      index,
      field,
      value
    );
  };

  const normalizeMoneyField = field => {
    updateItemField(
      index,
      field,
      normalizeMoney(
        item[field]
      )
    );
  };

  return (
    <div
      style={{
        display: "grid",

        gridTemplateColumns:
          "minmax(145px, 1fr) " +
          "170px " +
          "86px " +
          "110px " +
          "42px",

        gap: 7,
        alignItems: "center",
        marginBottom: 6,

        minWidth: 620
      }}
    >
      {/* PRODUCT */}
      <div
        title={item.name}
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontWeight: 500
        }}
      >
        {item.name}
      </div>

      {/* QUANTITY */}
      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "minmax(55px, 1fr) " +
            "40px 40px",

          gap: 5,
          alignItems: "center",
          minWidth: 0
        }}
      >
        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={
            item.quantity ?? ""
          }
          disabled={disabled}
          onChange={event => {
            /*
             * Keep the raw value so an empty
             * input remains empty while typing.
             */
            updateItemField(
              index,
              "quantity",
              event.target.value
            );
          }}
          onBlur={() => {
            updateItemField(
              index,
              "quantity",
              normalizeQuantity(
                item.quantity
              )
            );
          }}
          style={fieldStyle}
        />

        <button
          type="button"
          onClick={() =>
            changeQuantity(-1)
          }
          disabled={disabled}
          aria-label="Decrease quantity"
          style={{
            ...quantityButtonStyle,
            background: "#d6a400",
            color: "#111"
          }}
        >
          −
        </button>

        <button
          type="button"
          onClick={() =>
            changeQuantity(1)
          }
          disabled={disabled}
          aria-label="Increase quantity"
          style={{
            ...quantityButtonStyle,
            background: "#2e9d50",
            color: "white"
          }}
        >
          +
        </button>
      </div>

      {/* UNIT COST OR SALE PRICE */}
      {ticketType === "intake" ? (
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={
            item.cost ?? ""
          }
          disabled={disabled}
          aria-label="Unit cost"
          onChange={event =>
            updateMoneyField(
              "cost",
              event.target.value
            )
          }
          onBlur={() =>
            normalizeMoneyField(
              "cost"
            )
          }
          style={fieldStyle}
        />
      ) : (
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={
            item.price ?? ""
          }
          disabled={disabled}
          aria-label="Sales price per unit"
          onChange={event =>
            updateMoneyField(
              "price",
              event.target.value
            )
          }
          onBlur={() =>
            normalizeMoneyField(
              "price"
            )
          }
          style={fieldStyle}
        />
      )}

      {/* INTAKE UNIT SALE PRICE OR SALE TOTAL */}
      {ticketType === "intake" ? (
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={
            item.price ?? ""
          }
          disabled={disabled}
          aria-label="Sales price per unit"
          onChange={event =>
            updateMoneyField(
              "price",
              event.target.value
            )
          }
          onBlur={() =>
            normalizeMoneyField(
              "price"
            )
          }
          style={fieldStyle}
        />
      ) : (
        <div
          style={{
            textAlign: "right",
            fontWeight: "bold",
            whiteSpace: "nowrap"
          }}
        >
          $
          {lineTotal.toFixed(2)}
        </div>
      )}

      {/* REMOVE */}
      <button
        type="button"
        onClick={() =>
          removeItem(index)
        }
        disabled={disabled}
        aria-label="Remove item"
        style={{
          width: 42,
          minWidth: 42,
          height: 40,
          padding: 0,
          background: "#e53935",
          color: "white",
          border: "none",
          borderRadius: 7,
          fontSize: 17,

          cursor:
            disabled
              ? "default"
              : "pointer",

          opacity:
            disabled
              ? 0.6
              : 1,

          touchAction:
            "manipulation"
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default TicketRow;
