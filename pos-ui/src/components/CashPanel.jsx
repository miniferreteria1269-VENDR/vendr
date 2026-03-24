import { useEffect, useState } from "react";
import axios from "axios";
import ReturnModal from "./ReturnModal";
import { COLORS, card, btnPrimary, btnDanger } from "../uiStyles";

const API = "https://vendr-onkr.onrender.com";

function CashPanel({ storeId, products }) {

  const [balance, setBalance] = useState(0);
  const [showReturn, setShowReturn] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

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
          Cash Balance
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
          + Revenue
        </button>

        <button onClick={() => setShowReturn(true)} style={btnSecondary}>
          Return / Refund
        </button>

        <button onClick={() => setShowExpense(true)} style={btnDanger}>
          - Expense
        </button>
      </div>

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