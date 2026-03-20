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
  renameTicket
}) {

  return (

    <div style={{ flex: 1, borderLeft: "2px solid #ccc", padding: 20 }}>

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

      <div style={{ display: "flex", gap: 5, marginBottom: 15 }}>

        {tickets.map((ticket, index) => (

          <button
            key={ticket.id}
            onClick={() => setActiveTicket(ticket.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              renameTicket(ticket.id);
            }}
            style={{
              background:
                ticket.id === activeTicket
                  ? "#444"
                  : "#aaa",
              color: "white",
              padding: "5px 10px"
            }}
          >

            {ticket.label ||
              (ticket.type === "sale"
                ? "Sale"
                : "Intake") + " " + (index + 1)}

          </button>

        ))}

      </div>

      {currentTicket && (

        <div>

          <h3>
            {currentTicket.type === "sale"
              ? "Sale Ticket"
              : "Intake Ticket"}
          </h3>

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