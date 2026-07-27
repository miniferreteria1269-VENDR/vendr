function TicketRow({
  item,
  index,
  removeItem,
  updateItemField,
  ticketType,
  disabled = false
}) {
  const quantity =
    Number(item.quantity) || 1;

  const lineTotal =
    Number(item.price || 0) *
    quantity;

  const decreaseQuantity = () => {
    if (disabled) {
      return;
    }

    const nextQuantity =
      Math.max(
        quantity - 1,
        1
      );

    updateItemField(
      index,
      "quantity",
      nextQuantity
    );
  };

  const increaseQuantity = () => {
    if (disabled) {
      return;
    }

    updateItemField(
      index,
      "quantity",
      quantity + 1
    );
  };

  const buttonBase = {
    width: 42,
    minWidth: 42,
    height: 42,
    border: "none",
    borderRadius: 8,
    color: "white",
    fontSize: 22,
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

  const numberInputStyle = {
    width: "100%",
    minWidth: 0,
    height: 42,
    boxSizing: "border-box",
    textAlign: "center",
    borderRadius: 8,
    border:
      "1px solid #3a4250",
    background: "#2a2f3a",
    color: "white",
    fontSize: 16
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "minmax(120px, 1fr)",
        gap: 8,
        marginBottom: 6
      }}
    >
      <div
        style={{
          fontWeight: 500,
          wordBreak: "break-word"
        }}
      >
        {item.name}
      </div>

      {/* QUANTITY CONTROLS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "42px minmax(60px, 90px) 42px",
          gap: 6,
          alignItems: "center"
        }}
      >
        <button
          type="button"
          onClick={decreaseQuantity}
          disabled={disabled}
          aria-label="Decrease quantity"
          style={{
            ...buttonBase,
            background: "#d6a400",
            color: "#111"
          }}
        >
          −
        </button>

        <input
          type="number"
          min="1"
          step="1"
          value={item.quantity}
          disabled={disabled}
          onChange={event => {
            const value =
              Number(
                event.target.value
              );

            updateItemField(
              index,
              "quantity",
              Number.isFinite(value)
                ? Math.max(value, 1)
                : 1
            );
          }}
          style={numberInputStyle}
        />

        <button
          type="button"
          onClick={increaseQuantity}
          disabled={disabled}
          aria-label="Increase quantity"
          style={{
            ...buttonBase,
            background: "#2e9d50"
          }}
        >
          +
        </button>
      </div>

      {/* COST / LINE TOTAL */}
      {ticketType === "intake" ? (
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              marginBottom: 4,
              color: "#9da7b3"
            }}
          >
            Cost
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={item.cost}
            disabled={disabled}
            onChange={event =>
              updateItemField(
                index,
                "cost",
                Number(
                  event.target.value
                )
              )
            }
            style={numberInputStyle}
          />
        </div>
      ) : (
        <div
          style={{
            fontWeight: "bold"
          }}
        >
          ${lineTotal.toFixed(2)}
        </div>
      )}

      {/* PRICE */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: 12,
            marginBottom: 4,
            color: "#9da7b3"
          }}
        >
          Price
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={item.price}
          disabled={disabled}
          onChange={event =>
            updateItemField(
              index,
              "price",
              Number(
                event.target.value
              )
            )
          }
          style={numberInputStyle}
        />
      </div>

      <button
        type="button"
        onClick={() =>
          removeItem(index)
        }
        disabled={disabled}
        aria-label="Remove item"
        style={{
          background: "#e53935",
          color: "white",
          border: "none",
          borderRadius: 8,
          minHeight: 42,
          padding: "8px 12px",
          cursor:
            disabled
              ? "default"
              : "pointer",
          opacity:
            disabled
              ? 0.6
              : 1
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default TicketRow;
