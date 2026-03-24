import TicketRow from "./TicketRow";

const COLORS = {
  panel: "#1a1d24",
  panelAlt: "#222733",
  border: "#2f3542",
  text: "#e6edf3",
  textDim: "#9da7b3",
  primary: "#3aa0ff",
  danger: "#ff5c5c"
};

function TicketPanel({
  tickets,
  activeTicket,
  setActiveTicket,
  currentTicket,
  createTicket,
  removeItem,
  updateItemField,
  finalizeSale,
  finalizeIntake,
  cancelTicket,
  renameTicket,
  intakePaid,
  setIntakePaid,
  discountValue,
  setDiscountValue,
  discountType,
  setDiscountType
}) {

  // -----------------------------
  // CALCULATIONS (UNCHANGED)
  // -----------------------------
  const subtotal = currentTicket?.items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  ) || 0;

  const discountAmount =
    discountType === "percent"
      ? subtotal * (discountValue / 100)
      : discountValue;

  const total =
    currentTicket?.type === "sale"
      ? Math.max(subtotal - discountAmount, 0)
      : currentTicket?.items.reduce(
          (sum, i) => sum + i.cost * i.quantity,
          0
        ) || 0;

  const totalCost = currentTicket?.items.reduce(
    (sum, i) => sum + i.cost * i.quantity,
    0
  ) || 0;

  const profit = total - totalCost;

  return (
    <div style={{
      flex: 1,
      background: COLORS.panel,
      borderRadius: 14,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      color: COLORS.text
    }}>

      {/* CREATE BUTTONS */}
      <div style={{ marginBottom: 10, display: "flex", gap: 8 }}>
        <button
          onClick={() => createTicket("sale")}
          style={btnPrimary}
        >
          + Sale
        </button>

        <button
          onClick={() => createTicket("intake")}
          style={btnSecondary}
        >
          + Intake
        </button>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {tickets.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setActiveTicket(t.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              renameTicket(t.id);
            }}
            style={{
              ...tabStyle,
              background: t.id === activeTicket
                ? COLORS.primary
                : COLORS.panelAlt
            }}
          >
            {t.label || `${t.type} ${i + 1}`}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {currentTicket && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          <h3 style={{ marginBottom: 10 }}>
            {currentTicket.label ||
              (currentTicket.type === "sale"
                ? "Sale Ticket"
                : "Intake Ticket")}
          </h3>

          {/* INTAKE PAID */}
          {currentTicket.type === "intake" && (
            <label style={{ marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={intakePaid}
                onChange={(e) => setIntakePaid(e.target.checked)}
              />
              {" "}Paid
            </label>
          )}

          {/* ITEMS */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {currentTicket.items.map((item, index) => (
              <div key={index} style={rowWrapper}>
                <TicketRow
                  item={item}
                  index={index}
                  removeItem={removeItem}
                  updateItemField={updateItemField}
                  ticketType={currentTicket.type}
                />
              </div>
            ))}
          </div>

          {/* DISCOUNT */}
          {currentTicket.type === "sale" && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  style={inputStyle}
                >
                  <option value="percent">%</option>
                  <option value="amount">$</option>
                </select>

                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) =>
                    setDiscountValue(Number(e.target.value))
                  }
                  style={inputStyle}
                />
              </div>

              <div style={{ fontSize: 12, color: COLORS.textDim }}>
                Discount: -${discountAmount.toFixed(2)}
              </div>
            </div>
          )}

          {/* TOTAL */}
          <div style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            background: "#0b1220",
            border: `1px solid ${COLORS.primary}`,
            fontSize: 22,
            fontWeight: "bold",
            color: COLORS.primary,
            textAlign: "right"
          }}>
            ${total.toFixed(2)}
          </div>

          {/* WARNING */}
          {currentTicket.type === "sale" && profit < 0 && (
            <div style={{ color: COLORS.danger, marginTop: 6 }}>
              ⚠ Loss on this sale
            </div>
          )}

          {/* ACTIONS */}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            {currentTicket.type === "sale" && (
              <button onClick={finalizeSale} style={btnPrimary}>
                Finalize Sale
              </button>
            )}

            {currentTicket.type === "intake" && (
              <button onClick={finalizeIntake} style={btnPrimary}>
                Finalize Intake
              </button>
            )}

            <button onClick={cancelTicket} style={btnDanger}>
              Cancel
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

// -----------------------------
// STYLES
// -----------------------------

const btnPrimary = {
  background: "#3aa0ff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer"
};

const btnSecondary = {
  background: "#2a2f3a",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer"
};

const btnDanger = {
  background: "#ff5c5c",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer"
};

const tabStyle = {
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  color: "white",
  cursor: "pointer"
};

const rowWrapper = {
  background: "#222733",
  borderRadius: 8,
  padding: 6,
  marginBottom: 6
};

const inputStyle = {
  background: "#2a2f3a",
  border: "1px solid #3a4250",
  borderRadius: 6,
  color: "white",
  padding: 6
};

export default TicketPanel;