import { useEffect, useState } from "react";
import { useLang } from "../LanguageContext";
import axios from "axios";
import ReturnModal from "./ReturnModal";
import RevenueModal from "./RevenueModal";
import ExpenseModal from "./ExpenseModal";
import MovementSummary from "./MovementSummary"; // ✅ ADDED
import { COLORS, card, btnPrimary, btnSecondary, btnDanger } from "../uiStyles";

const API = "https://vendr-onkr.onrender.com";

function CashPanel({ storeId, products }) {

  const { t } = useLang();

  const [balance, setBalance] = useState(0);
  const [showReturn, setShowReturn] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  const [showSummary, setShowSummary] = useState(false); // ✅ ADDED

  const loadBalance = async () => {
    try {
      const res = await axios.get(`${API}/test-cash-balance`, {
        params: { store_id: storeId }
      });

      setBalance(res.data.balance || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (storeId) loadBalance();
  }, [storeId]);

  return (
    <div style={{ padding: 16 }}>

      {/* BALANCE CARD */}
      <div style={{
        ...card,
        textAlign: "center",
        marginBottom: 16
      }}>
        <div style={{ color: COLORS.textDim }}>
          {t("cash_balance")}
        </div>

        <div style={{
          fontSize: 32,
          fontWeight: "bold",
          color: COLORS.primary,
          marginTop: 6
        }}>
          ${Number(balance).toFixed(2)}
        </div>
      </div>

      {/* ACTIONS */}
      <div style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap"
      }}>
        <button onClick={() => setShowRevenue(true)} style={btnPrimary}>
          + {t("revenue")}
        </button>

        <button onClick={() => setShowReturn(true)} style={btnSecondary}>
          {t("return_refund")}
        </button>

        <button onClick={() => setShowExpense(true)} style={btnDanger}>
          - {t("expense")}
        </button>

        {/* ✅ ADDED BUTTON */}
        <button
          onClick={() => setShowSummary(prev => !prev)}
          style={btnSecondary}
        >
          {t("movement_summary")}
        </button>

      </div>

      {/* ✅ ADDED SUMMARY PANEL */}
      {showSummary && (
        <MovementSummary storeId={storeId} />
      )}

      {/* MODALS */}
      {showRevenue && (
        <RevenueModal
          storeId={storeId}
          onClose={() => setShowRevenue(false)}
          onSuccess={loadBalance}
        />
      )}

      {showReturn && (
        <ReturnModal
          storeId={storeId}
          products={products}
          onClose={() => setShowReturn(false)}
          onSuccess={loadBalance}
        />
      )}

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