import { useState } from "react";
import axios from "axios";

const API = "https://vendr-onkr.onrender.com";

function ReturnModal({ storeId, products = [], onClose, onSuccess }) {

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("refund"); // "refund" or "return"
  const [note, setNote] = useState("");
  const [items, setItems] = useState([
    { product_id: "", quantity: 1, cost: 0, price: 0 }
  ]);

  const updateItem = (field, value) => {
    setItems(prev =>
      prev.map(item => ({ ...item, [field]: value }))
    );
  };

  const handleProductSelect = (productId) => {
    const selected = products.find(p => p.product_id == productId);
    if (!selected) return;

    setItems([{
      product_id: selected.product_id,
      quantity: 1,
      cost: selected.cost ?? 0,
      price: selected.price ?? 0
    }]);
  };

  const submit = async () => {
    const value = Number(amount);

    if (!value || value <= 0) {
      alert("Enter valid amount");
      return;
    }

    try {
      await axios.post(`${API}/returns`, {
        store_id: storeId,
        amount: value,
        items: mode === "return" ? items : [],
        note
      });

      onSuccess();
      onClose();

    } catch (err) {
      console.error(err);
      alert("Failed");
    }
  };

  return (
    <div style={modalStyle}>

      <h3>Return / Refund</h3>

      {/* MODE SWITCH */}
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setMode("refund")}>
          Refund
        </button>
        <button onClick={() => setMode("return")} style={{ marginLeft: 10 }}>
          Return
        </button>
      </div>

      {/* AMOUNT */}
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {/* PRODUCT SECTION (always visible in return mode) */}
      {mode === "return" && (
        <div style={{ marginTop: 10 }}>

          <select
            value={items[0].product_id}
            onChange={(e) => handleProductSelect(e.target.value)}
          >
            <option value="">Select product</option>
            {products.map(p => (
              <option key={p.product_id} value={p.product_id}>
                {p.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={items[0].quantity}
            onChange={(e) =>
              updateItem("quantity", e.target.value)
            }
            style={{ width: 60 }}
          />

        </div>
      )}

      {/* NOTE */}
      <input
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ marginTop: 10 }}
      />

      {/* ACTIONS */}
      <div style={{ marginTop: 15 }}>
        <button onClick={submit}>Confirm</button>
        <button onClick={onClose} style={{ marginLeft: 10 }}>
          Cancel
        </button>
      </div>

    </div>
  );
}

const modalStyle = {
  position: "fixed",
  top: "30%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  background: "white",
  padding: 20,
  border: "1px solid #ccc",
  zIndex: 1000
};

export default ReturnModal;