import { useState } from "react";
import axios from "axios";

const API = "https://vendr-onkr.onrender.com";

const categories = [
  "Compra Mercaderia",
  "Nomina",
  "Utilidades",
  "Impuestos",
  "Mantenimiento",
  "Renta",
  "Retiro Dueño",
  "Otros"
];

function ExpenseModal({ storeId, onClose, onSuccess }) {

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!amount || Number(amount) <= 0) return;

    try {
      await axios.post(`${API}/cash-event`, {
        store_id: storeId,
        amount: Number(amount),
        type: "expense", // ✅ correct
        category,
        note
      });

      onSuccess();
      onClose();

    } catch (err) {
      console.error("Expense error:", err); // ✅ fixed
      alert("Failed to add expense");       // ✅ fixed
    }
  };

  return (
    <div style={modalStyle}>

      <h3>Add Expense</h3> {/* ✅ fixed */}

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

export default ExpenseModal;