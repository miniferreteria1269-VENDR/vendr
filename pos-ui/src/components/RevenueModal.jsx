import { useState } from "react";
import { useLang } from "../LanguageContext";
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
  const { t } = useLang();

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
      alert(t("failed_add_revenue"));
    }
  };

  return (
    <div style={overlayStyle}>

      <div style={modalStyle}>
        <h3 style={{ marginBottom: 12 }}>{t("add_revenue")}</h3>

        <input
          type="number"
          placeholder={t("amount")}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={inputStyle}
        />

        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={inputStyle}
        >
          {categories.map(c => (
            <option key={c} value={c}>
              {t(c)}
            </option>
          ))}
        </select>

        <input
          placeholder={t("note_optional")}
          value={note}
          onChange={e => setNote(e.target.value)}
          style={inputStyle}
        />

        <div style={buttonRow}>
          <button onClick={submit} style={btnPrimary}>
            {t("confirm")}
          </button>

          <button onClick={onClose} style={btnDanger}>
            {t("cancel")}
          </button>
        </div>
      </div>

    </div>
  );
}

//
// STYLES
//

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000
};

const modalStyle = {
  background: "#1a1d24",
  padding: 20,
  borderRadius: 12,
  border: "1px solid #2f3542",
  color: "#e6edf3",
  width: 320,
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const inputStyle = {
  background: "#2a2f3a",
  border: "1px solid #3a4250",
  borderRadius: 6,
  color: "white",
  padding: 8
};

const buttonRow = {
  display: "flex",
  gap: 10,
  marginTop: 10
};

const btnPrimary = {
  background: "#3aa0ff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer",
  flex: 1
};

const btnDanger = {
  background: "#ff5c5c",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer",
  flex: 1
};

export default RevenueModal;