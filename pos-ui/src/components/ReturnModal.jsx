import { useState } from "react";
import { useLang } from "../LanguageContext";
import axios from "axios";

const API = "https://vendr-onkr.onrender.com";

function ReturnModal({ storeId, products = [], onClose, onSuccess }) {

  const { t } = useLang();

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
      alert(t("enter_valid_amount"));
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
      alert(t("failed"));
    }
  };

  return (
    <div style={modalStyle}>

      <h3>{t("return_refund")}</h3>

      {/* MODE SWITCH */}
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setMode("refund")}>
          {t("refund")}
        </button>
        <button onClick={() => setMode("return")} style={{ marginLeft: 10 }}>
          {t("return")}
        </button>
      </div>

      {/* AMOUNT */}
      <input
        type="number"
        placeholder={t("amount")}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {/* PRODUCT SECTION */}
      {mode === "return" && (
        <div style={{ marginTop: 10 }}>

          <select
            value={items[0].product_id}
            onChange={(e) => handleProductSelect(e.target.value)}
          >
            <option value="">{t("select_product")}</option>
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
        placeholder={t("note")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ marginTop: 10 }}
      />

      {/* ACTIONS */}
      <div style={{ marginTop: 15 }}>
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

export default ReturnModal;