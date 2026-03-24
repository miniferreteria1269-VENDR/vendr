import { useEffect, useState } from "react";
import axios from "axios";
import ReturnModal from "./ReturnModal";

const API = "https://vendr-onkr.onrender.com";

// ✅ EXPANDED EXPENSE CATEGORIES
const EXPENSE_CATEGORIES = [
  "Compra Mercadería",
  "Nómina",
  "Renta",
  "Utilidades",
  "Internet / Telecomunicaciones",
  "Impuestos",
  "Mantenimiento",
  "Transporte / Envíos",
  "Suministros / Papelería",
  "Servicios / Honorarios",
  "Comisiones / Bancos",
  "Retiro Dueño",
  "Otros"
];

function CashPanel({ storeId, products }) {

  const [balance, setBalance] = useState(0);

  const [showReturn, setShowReturn] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  // -----------------------------
  // LOAD BALANCE
  // -----------------------------
  const loadBalance = async () => {
    try {
      const res = await axios.get(`${API}/test-cash-balance`, {
        params: { store_id: storeId }
      });

      setBalance(res.data.balance || 0);

    } catch (err) {
      console.error("Balance error:", err);
    }
  };

  useEffect(() => {
    if (storeId) loadBalance();
  }, [storeId]);

  return (
    <div style={{ padding: 20 }}>

      <h2>Cash</h2>

      <h1>${Number(balance).toFixed(2)}</h1>

      {/* ACTION BUTTONS */}
      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>

        <button onClick={() => setShowRevenue(true)}>
          + Revenue
        </button>

        <button onClick={() => setShowReturn(true)}>
          Return / Refund
        </button>

        <button onClick={() => setShowExpense(true)}>
          - Expense
        </button>

      </div>

      {/* REVENUE MODAL */}
      {showRevenue && (
        <RevenueModal
          storeId={storeId}
          onClose={() => setShowRevenue(false)}
          onSuccess={loadBalance}
        />
      )}

      {/* RETURN MODAL */}
      {showReturn && (
        <ReturnModal
          storeId={storeId}
          products={products}
          onClose={() => setShowReturn(false)}
          onSuccess={loadBalance}
        />
      )}

      {/* EXPENSE MODAL */}
      {showExpense && (
        <ExpenseModal
          storeId={storeId}
          onClose={() => setShowExpense(false)}
          onSuccess={loadBalance}
        />
      )}

    </div>
  );
}

export default CashPanel;



// =======================================================
// 💰 REVENUE MODAL (FREE CATEGORY)
// =======================================================

function RevenueModal({ storeId, onClose, onSuccess }) {

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!amount || !category) {
      alert("Amount and category required");
      return;
    }

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
      console.error(err);
      alert("Failed");
    }
  };

  return (
    <div style={modalStyle}>

      <h3>Add Revenue</h3>

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <input
        type="text"
        placeholder="Category (e.g. Misc income)"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />

      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div style={{ marginTop: 10 }}>
        <button onClick={submit}>Save</button>
        <button onClick={onClose} style={{ marginLeft: 10 }}>
          Cancel
        </button>
      </div>

    </div>
  );
}



// =======================================================
// 💸 EXPENSE MODAL (DROPDOWN CATEGORY)
// =======================================================

function ExpenseModal({ storeId, onClose, onSuccess }) {

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!amount || !category) {
      alert("Amount and category required");
      return;
    }

    try {
      await axios.post(`${API}/cash-event`, {
        store_id: storeId,
        amount: Number(amount),
        type: "expense",
        category,
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

      <h3>Add Expense</h3>

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {/* ✅ DROPDOWN CATEGORY */}
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">Select category</option>
        {EXPENSE_CATEGORIES.map(cat => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div style={{ marginTop: 10 }}>
        <button onClick={submit}>Save</button>
        <button onClick={onClose} style={{ marginLeft: 10 }}>
          Cancel
        </button>
      </div>

    </div>
  );
}



// =======================================================
// 🧱 MODAL STYLE
// =======================================================

const modalStyle = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  background: "white",
  padding: 20,
  border: "1px solid #ccc",
  borderRadius: 6,
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 260
};