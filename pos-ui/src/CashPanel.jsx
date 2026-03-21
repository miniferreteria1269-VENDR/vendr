import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://vendr-onkr.onrender.com";

function CashPanel({ storeId }) {

  const [balance, setBalance] = useState(0);

  const [showRevenue, setShowRevenue] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

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

      <div style={{ marginTop: 20 }}>
        <button onClick={() => setShowRevenue(true)}>
          + Revenue
        </button>

        <button
          onClick={() => setShowExpense(true)}
          style={{ marginLeft: 10 }}
        >
          - Expense
        </button>
      </div>

      {showRevenue && (
        <RevenueModal
          storeId={storeId}
          onClose={() => setShowRevenue(false)}
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