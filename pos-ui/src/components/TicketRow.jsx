function TicketRow({ item, index, removeItem, updateItemField, ticketType }) {

  const lineTotal = item.price * item.quantity;

  return (

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 70px 90px 90px 40px",
        gap: 5,
        marginBottom: 6
      }}
    >

      <span>{item.name}</span>

      <input
        type="number"
        value={item.quantity}
        onChange={(e) =>
          updateItemField(index, "quantity", Number(e.target.value))
        }
      />

      {ticketType === "intake" ? (

        <input
          type="number"
          step="0.01"
          value={item.cost}
          onChange={(e) =>
            updateItemField(index, "cost", Number(e.target.value))
          }
        />

      ) : (

        <span>${lineTotal.toFixed(2)}</span>

      )}

      <input
        type="number"
        step="0.01"
        value={item.price}
        onChange={(e) =>
          updateItemField(index, "price", Number(e.target.value))
        }
      />

      <button
        onClick={() => removeItem(index)}
        style={{
          background: "#e53935",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        ✕
      </button>

    </div>

  );

}

export default TicketRow;