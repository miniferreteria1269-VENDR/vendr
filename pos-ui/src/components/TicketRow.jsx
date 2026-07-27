function TicketRow({
  item,
  index,
  removeItem,
  updateItemField,
  ticketType,
  disabled = false
}) {
  const quantity = Math.max(
    Number(item.quantity) || 1,
    1
  );

  const price =
    Number(item.price) || 0;

  const lineTotal =
    price * quantity;

  const changeQuantity = amount => {
    if (disabled) {
      return;
    }

    updateItemField(
      index,
      "quantity",
      Math.max(
        quantity + amount,
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
    touchAction: "manipulation"
  };

  return (
    <div
      style={{
        display: "grid",

        gridTemplateColumns:
          "minmax(150px, 1fr) " +
          "190px " +
          "90px " +
          "90px " +
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

      {/* QUANTITY, MINUS, PLUS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(55px, 1fr) 40px 40px",
          gap: 5,
          alignItems: "center",
          minWidth: 0
        }}
      >
        <input
          type="number"
          min="1"
          step="1"
          value={item.quantity}
          disabled={disabled}
          onChange={event => {
            const nextQuantity =
              Number(
                event.target.value
              );

            updateItemField(
              index,
              "quantity",
              Number.isFinite(
                nextQuantity
              )
                ? Math.max(
                    nextQuantity,
                    1
                  )
                : 1
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

      {/* PRICE OR COST */}
      {ticketType === "intake" ? (
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.cost}
          disabled={disabled}
          aria-label="Cost"
          onChange={event =>
            updateItemField(
              index,
              "cost",
              Number(
                event.target.value
              )
            )
          }
          style={fieldStyle}
        />
      ) : (
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.price}
          disabled={disabled}
          aria-label="Price"
          onChange={event =>
            updateItemField(
              index,
              "price",
              Number(
                event.target.value
              )
            )
          }
          style={fieldStyle}
        />
      )}

      {/* ROW TOTAL */}
      <div
        style={{
          textAlign: "right",
          fontWeight: "bold",
          whiteSpace: "nowrap"
        }}
      >
        ${lineTotal.toFixed(2)}
      </div>

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
