import TicketRow from "./TicketRow";

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

  // 🔥 NEW PROPS
  discountValue,
  setDiscountValue,
  discountType,
  setDiscountType
}) {

  // -----------------------------
  // SUBTOTAL
  // -----------------------------
  const subtotal = currentTicket?.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0) || 0;

  // -----------------------------
  // DISCOUNT
  // -----------------------------
  let discountAmount = 0;

  if (discountType === "percent") {
    discountAmount = subtotal * (discountValue / 100);
  } else {
    discountAmount = discountValue;
  }

  // -----------------------------
  // TOTAL
  // -----------------------------
  const total =
    currentTicket?.type === "sale"
      ? Math.max(subtotal - discountAmount, 0)
      : currentTicket?.items.reduce((sum, item) => {
          return sum + (item.cost * item.quantity);
        }, 0) || 0;

  // -----------------------------
  // PROFIT (SALE ONLY)
  // -----------------------------
  const totalCost = currentTicket?.items.reduce((sum, item) => {
    return sum + (item.cost * item.quantity);
  }, 0) || 0;

  const profit = total - totalCost;

  return (

    <div style={{ flex: 1, borderLeft: "2px solid #ccc", padding: 20 }}>

      {/* CREATE TICKET BUTTONS */}
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => createTicket("sale")}>
          + Sale
        </button>

        <button
          onClick={() => createTicket("intake")}
          style={{ marginLeft: 10 }}
        >
          + Intake
        </button>
      </div>

      {/* TICKET TABS */}
      <div style={{ display: "flex", gap: 5, marginBottom: 15 }}>

        {tickets.map((ticket, index) => {

          const label =
            ticket.label ||
            `${ticket.type === "sale" ? "Sale" : "Intake"} ${index + 1}`;

          return (
            <div key={ticket.id} style={{ display: "flex", gap: 4 }}>

              <button
                onClick={() => setActiveTicket(ticket.id)}
                onDoubleClick={() => renameTicket?.(ticket.id)}
                style={{
                  background:
                    ticket.id === activeTicket ? "#444" : "#aaa",
                  color: "white",
                  padding: "5px 10px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                {label}
              </button>

              <button
                onClick={() => renameTicket?.(ticket.id)}
                style={{
                  padding: "5px",
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                ✏️
              </button>

            </div>
          );
        })}
      </div>

      {/* ACTIVE TICKET */}
      {currentTicket && (

        <div>

          <h3>
            {currentTicket.label ||
              (currentTicket.type === "sale"
                ? "Sale Ticket"
                : "Intake Ticket")}
          </h3>

          {/* INTAKE PAID */}
          {currentTicket.type === "intake" && (
            <div style={{ marginBottom: 10 }}>
              <label>
                <input
                  type="checkbox"
                  checked={intakePaid}
                  onChange={(e) => setIntakePaid(e.target.checked)}
                />
                {" "}Paid
              </label>
            </div>
          )}

          {/* INTAKE HEADER */}
          {currentTicket.type === "intake" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 70px 90px 90px 40px",
                fontWeight: "bold",
                marginBottom: 6
              }}
            >
              <div>Product</div>
              <div>Qty</div>
              <div>Cost</div>
              <div>Price</div>
              <div></div>
            </div>
          )}

          {/* ITEMS */}
          {currentTicket.items.map((item, index) => (
            <TicketRow
              key={index}
              item={item}
              index={index}
              removeItem={removeItem}
              updateItemField={updateItemField}
              ticketType={currentTicket.type}
            />
          ))}

          {/* 🔥 DISCOUNT (SALE ONLY) */}
          {currentTicket.type === "sale" && (
            <div style={{ marginTop: 10 }}>

              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
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
                  placeholder="Discount"
                  style={{ width: 100 }}
                />
              </div>

              <div style={{ fontSize: 14 }}>
                Discount: -${discountAmount.toFixed(2)}
              </div>

            </div>
          )}

          {/* 🔥 TOTAL */}
          <div style={{
            marginTop: 10,
            fontWeight: "bold",
            fontSize: 18
          }}>
            {currentTicket.type === "sale"
              ? "Total Sale: "
              : "Total Cost: "}
            ${total.toFixed(2)}
          </div>

          {/* ⚠️ LOSS WARNING */}
          {currentTicket.type === "sale" && profit < 0 && (
            <div style={{
              color: "red",
              fontWeight: "bold",
              marginTop: 5
            }}>
              ⚠️ Warning: This sale generates a loss
            </div>
          )}

          {/* ACTIONS */}
          <div style={{ marginTop: 15 }}>

            {currentTicket.type === "sale" && (
              <button onClick={finalizeSale}>
                Finalize Sale
              </button>
            )}

            {currentTicket.type === "intake" && (
              <button onClick={finalizeIntake}>
                Finalize Intake
              </button>
            )}

            <button
              onClick={cancelTicket}
              style={{ marginLeft: 10 }}
            >
              Cancel
            </button>

          </div>

        </div>

      )}

    </div>

  );

}

export default TicketPanel;