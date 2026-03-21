import { useState } from "react";
import axios from "axios";

const API = "https://vendr-onkr.onrender.com";

const categories = [
  "Aporte Dueño",
  "Inversion Socio",
  "Prestamo Recibido",
  "Transferencia Interna",
  "Ajuste Caja",
  "Otros"
];

function RevenueModal({ storeId, onClose, onSuccess }) {

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!amount || Number(amount) <= 0) return;

    try {
      await axios.post(`${API}/cash-event`, {
        store_id: storeId,
        amount: Number(amount),
        type: "revenue",
        category,
        note
      });

      onSuccess();
      onClose();

    } catch (err) {
      console.error("Revenue error:", err);
      alert("Failed to add revenue");
    }
  };

  return (
    <div style={modalStyle}>

      <h3>Add Revenue</h3>

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />

      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
      >
        {categories.map(c => (
          <option key={c}>{c}</option>
        ))}
      </select>

      <input
        placeholder="Note (optional)"
        value={note}
        onChange={e => setNote(e.target.value)}
      />

      <div style={{ marginTop: 10 }}>
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

export default RevenueModal;