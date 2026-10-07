import { useLang } from "../LanguageContext";

function TicketRow({
  item,
  index,
  removeItem,
  updateItemField,
  editComboItem,
  ticketType,
  disabled = false
}) {
  const { t } = useLang();
  const parsedQuantity =
    Number(item.quantity);

  const quantity =
    Number.isFinite(
      parsedQuantity
    ) &&
    parsedQuantity > 0
      ? parsedQuantity
      : 0;

  const unitPrice =
    Number(item.price) || 0;

  const lineTotal =
    unitPrice * quantity;

  const normalizeQuantity =
    value => {
      const numericValue =
        Number(value);

      if (
        !Number.isFinite(
          numericValue
        ) ||
        numericValue < 1
      ) {
        return 1;
      }

      return Math.max(
        Math.trunc(
          numericValue
        ),
        1
      );
    };

  const normalizeMoney = (
    value,
    decimalPlaces = 2
  ) => {
    const numericValue =
      Number(value);

    if (
      !Number.isFinite(
        numericValue
      ) ||
      numericValue < 0
    ) {
      return 0;
    }

    const factor =
      10 ** decimalPlaces;

    return (
      Math.round(
        numericValue * factor
      ) / factor
    );
  };

  const changeQuantity =
    amount => {
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
          currentQuantity +
            amount,
          1
        )
      );
    };

  const updateMoneyField = (
    field,
    value
  ) => {
    /*
     * Preserve an empty string while
     * the cashier is typing.
     */
    updateItemField(
      index,
      field,
      value
    );
  };

  const normalizeMoneyField = (
    field,
    decimalPlaces = 2
  ) => {
    updateItemField(
      index,
      field,
      normalizeMoney(
        item[field],
        decimalPlaces
      )
    );
  };

  const fieldStyle = {
    width: "100%",
    minWidth: 0,
    height: 40,
    boxSizing: "border-box",
    background: "#2a2f3a",
    border:
      "1px solid #3a4250",
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

  return (
    <div
      className="ticket-item-row"
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
          fontWeight: 500
        }}
      >
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name}
        </div>
        {item.combo_components?.length > 0 && (
          <div
            className="ticket-combo-summary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              minWidth: 0,
              color: "#9da7b3",
              fontSize: 11
            }}
          >
            <span
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {item.combo_components.map(component =>
                `${component.quantity_per_combo}× ${component.name}`
              ).join(" · ")}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => editComboItem(item, index)}
              title={t("edit_combo_configuration")}
              style={{
                flex: "0 0 auto",
                padding: "2px 5px",
                border: "1px solid #3a4250",
                borderRadius: 5,
                background: "#222733",
                color: "#3aa0ff",
                fontSize: 10,
                fontWeight: 700,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.6 : 1
              }}
            >
              {t("edit")}
            </button>
          </div>
        )}
      </div>

      {/* QUANTITY */}
      <div
        className="ticket-quantity-controls"
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
          className="ticket-row-field"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={
            item.quantity ?? ""
          }
          disabled={disabled}
          onChange={event =>
            updateItemField(
              index,
              "quantity",
              event.target.value
            )
          }
          onBlur={() =>
            updateItemField(
              index,
              "quantity",
              normalizeQuantity(
                item.quantity
              )
            )
          }
          style={fieldStyle}
        />

        <button
          className="ticket-quantity-button"
          type="button"
          onClick={() =>
            changeQuantity(-1)
          }
          disabled={disabled}
          aria-label={
            "Decrease quantity"
          }
          style={{
            ...quantityButtonStyle,
            background:
              "#d6a400",
            color: "#111"
          }}
        >
          −
        </button>

        <button
          className="ticket-quantity-button"
          type="button"
          onClick={() =>
            changeQuantity(1)
          }
          disabled={disabled}
          aria-label={
            "Increase quantity"
          }
          style={{
            ...quantityButtonStyle,
            background:
              "#2e9d50",
            color: "white"
          }}
        >
          +
        </button>
      </div>

      {/* UNIT COST OR SALES PRICE */}
      {ticketType ===
      "intake" ? (
        <input
          className="ticket-row-field"
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
              "cost",
              2
            )
          }
          style={fieldStyle}
        />
      ) : (
        <input
          className="ticket-row-field"
          type="number"
          min="0"
          step="0.001"
          inputMode="decimal"
          value={
            item.price ?? ""
          }
          disabled={disabled}
          aria-label={
            "Sales price per unit"
          }
          onChange={event =>
            updateMoneyField(
              "price",
              event.target.value
            )
          }
          onBlur={() =>
            normalizeMoneyField(
              "price",
              3
            )
          }
          style={fieldStyle}
        />
      )}

      {/* INTAKE SALE PRICE OR SALE TOTAL */}
      {ticketType ===
      "intake" ? (
        <input
          className="ticket-row-field"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={
            item.price ?? ""
          }
          disabled={disabled}
          aria-label={
            "Sales price per unit"
          }
          onChange={event =>
            updateMoneyField(
              "price",
              event.target.value
            )
          }
          onBlur={() =>
            normalizeMoneyField(
              "price",
              2
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
        className="ticket-remove-button"
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
