import { useState } from "react";
import axios from "axios";

const API = "https://vendr-onkr.onrender.com";

function ReturnModal({ storeId, onClose, onSuccess }) {

  const [amount, setAmount] = useState("");
  const [includesReturn, setIncludesReturn] = useState(false);
  const [note, setNote] = useState("");

  const submit = async () => {
    const value = Number(amount);

    if (isNaN(value) || value <= 0) {
      alert("Enter a valid amount");
      return;
    }

    try {
      await axios.post(`${API}/returns`, {
        store_id: storeId,
        amount: value,
        items: [], // 🔥 v1: no product handling yet
        note
      });

      onSuccess();
      onClose();

    } catch (err) {
      console.error("Return error:", err);
      alert("Failed to process return/refund");
    }
  };

  return (
    <div style={modalStyle}>

      <h3>Return / Refund</h3>

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />

      <div style={{ marginTop: 10 }}>
        <label>
          <input
            type="checkbox"
            checked={includesReturn}
            onChange={(e) => setIncludesReturn(e.target.checked)}
          />
          {" "}Includes product return
        </label>
      </div>

      <input
        placeholder="Note (optional)"
        value={note}
        onChange={e => setNote(e.target.value)}
        style={{ marginTop: 10 }}
      />

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