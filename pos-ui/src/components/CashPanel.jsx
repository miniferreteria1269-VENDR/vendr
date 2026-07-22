import { useEffect, useState } from "react";
import axios from "axios";

import { useLang } from "../LanguageContext";

import ReturnModal from "./ReturnModal";
import RevenueModal from "./RevenueModal";
import ExpenseModal from "./ExpenseModal";
import MovementSummary from "./MovementSummary";

import {
  cacheConfirmedCashBalance,
  getDisplayedCashBalance
} from "../offlineCash";

import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  btnDanger
} from "../uiStyles";

const API = "https://vendr-onkr.onrender.com";

function CashPanel({
  storeId,
  products
}) {
  const { t } = useLang();

  const [balance, setBalance] = useState(0);

  const [showReturn, setShowReturn] =
    useState(false);

  const [showRevenue, setShowRevenue] =
    useState(false);

  const [showExpense, setShowExpense] =
    useState(false);

  const [showSummary, setShowSummary] =
    useState(false);

  const loadBalance = async () => {
    if (!storeId) {
      return;
    }

    try {
      const response = await axios.get(
        `${API}/test-cash-balance`,
        {
          params: {
            store_id: storeId
          }
        }
      );

      const confirmedBalance = Number(
        response.data.balance || 0
      );

      await cacheConfirmedCashBalance(
        storeId,
        confirmedBalance
      );

      const displayedBalance =
        await getDisplayedCashBalance(
          storeId
        );

      setBalance(
        displayedBalance !== null
          ? displayedBalance
          : confirmedBalance
      );
      } catch (offlineError) {
        console.error(
          "FAILED TO LOAD OFFLINE CASH BALANCE:",
          offlineError
        );
      }
    }
  };

  useEffect(() => {
    if (storeId) {
      loadBalance();
    }
  }, [storeId]);

  return (
    <div
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0
      }}
    >
      {/* BALANCE CARD */}
      <div
        style={{
          ...card,
          textAlign: "center",
          marginBottom: 16
        }}
      >
        <div
          style={{
            color: COLORS.textDim
          }}
        >
          {t("cash_balance")}
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: "bold",
            color: COLORS.primary,
            marginTop: 6
          }}
        >
          ${Number(balance).toFixed(2)}
        </div>
      </div>

      {/* ACTIONS */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 12
        }}
      >
        <button
          type="button"
          onClick={() =>
            setShowRevenue(true)
          }
          style={btnPrimary}
        >
          + {t("revenue")}
        </button>

        <button
          type="button"
          onClick={() =>
            setShowReturn(true)
          }
          style={btnSecondary}
        >
          {t("return_refund")}
        </button>

        <button
          type="button"
          onClick={() =>
            setShowExpense(true)
          }
          style={btnDanger}
        >
          - {t("expense")}
        </button>

        <button
          type="button"
          onClick={() =>
            setShowSummary(
              previous => !previous
            )
          }
          style={btnSecondary}
        >
          {t("movement_summary")}
        </button>
      </div>

      {/* MOVEMENT SUMMARY */}
      {showSummary && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0
          }}
        >
          <MovementSummary
            storeId={storeId}
          />
        </div>
      )}

      {/* MODALS */}
      {showRevenue && (
        <RevenueModal
          storeId={storeId}
          onClose={() =>
            setShowRevenue(false)
          }
          onSuccess={loadBalance}
        />
      )}

      {showReturn && (
        <ReturnModal
          storeId={storeId}
          products={products}
          onClose={() =>
            setShowReturn(false)
          }
          onSuccess={loadBalance}
        />
      )}

      {showExpense && (
        <ExpenseModal
          storeId={storeId}
          onClose={() =>
            setShowExpense(false)
          }
          onSuccess={loadBalance}
        />
      )}
    </div>
  );
}

export default CashPanel;
