import { useState } from "react";
import { useLang } from "../LanguageContext";
import axios from "axios";

const API = "https://vendr-onkr.onrender.com";

// ✅ SAFE STRUCTURE (value stays Spanish, label is key)
const categories = [
  { value: "Compra Mercaderia", label: "inventory_purchase" },
  { value: "Nomina", label: "payroll" },
  { value: "Utilidades", label: "utilities" },
  { value: "Impuestos", label: "taxes" },
  { value: "Mantenimiento", label: "maintenance" },
  { value: "Renta", label: "rent" },
  { value: "Retiro Dueño", label: "owner_draw" },
  { value: "Otros", label: "other" }
];

function ExpenseModal({ storeId, onClose, onSuccess }) {

  const { t } = useLang();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0].value);
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!amount || Number(amount) <= 0) return;

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
      console.error("Expense error:", err);
      alert(t("failed_add_expense"));
    }
  };

  return (
    <div style={modalStyle}>

      <h3>{t("add_expense")}</h3>

      <input
        type="number"
        placeholder={t("amount")}
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />

      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
      >
        {categories.map(c => (
          <option key={c.value} value={c.value}>
            {t(c.label)}
          </option>
        ))}
      </select>

      <input
        placeholder={t("note_optional")}
        value={note}
        onChange={e => setNote(e.target.value)}
      />

      <div style={{ marginTop: 10 }}>
        <button onClick={submit}>{t("confirm")}</button>
        <button onClick={onClose} style={{ marginLeft: 10 }}>
          {t("cancel")}
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