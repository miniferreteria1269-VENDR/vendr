import {
  useEffect,
  useState
} from "react";

import apiClient from "../apiClient";

import {
  useLang
} from "../LanguageContext";

import ReturnModal from "./ReturnModal";
import RevenueModal from "./RevenueModal";
import ExpenseModal from "./ExpenseModal";
import CashMovementModal from "./CashMovementModal";
import MovementSummary from "./MovementSummary";

import {
  cacheConfirmedCashBalance,
  cacheConfirmedStrongboxBalance,
  getDisplayedCashBalance,
  getDisplayedStrongboxBalance
} from "../offlineCash";

import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  btnDanger
} from "../uiStyles";

function CashPanel({
  storeId,
  products
}) {
  const { t } = useLang();

  const [
    balance,
    setBalance
  ] = useState(0);

  const [
    strongboxBalance,
    setStrongboxBalance
  ] = useState(null);

  const [
    showReturn,
    setShowReturn
  ] = useState(false);

  const [
    showRevenue,
    setShowRevenue
  ] = useState(false);

  const [
    showExpense,
    setShowExpense
  ] = useState(false);

  const [
    showStrongboxExpense,
    setShowStrongboxExpense
  ] = useState(false);

  const [
    cashMovementMode,
    setCashMovementMode
  ] = useState(null);

  const [
    showSummary,
    setShowSummary
  ] = useState(false);

  const loadBalance = async () => {
    if (!storeId) {
      return;
    }

    try {
      const response =
        await apiClient.get(
          "/cash-balance",
          {
            params: {
              store_id: storeId
            }
          }
        );

      const confirmedBalance =
        Number(
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
    } catch (error) {
      console.warn(
        "USING OFFLINE CASH BALANCE:",
        error
      );

      try {
        const displayedBalance =
          await getDisplayedCashBalance(
            storeId
          );

        if (
          displayedBalance !== null
        ) {
          setBalance(
            displayedBalance
          );
        }
      } catch (offlineError) {
        console.error(
          "FAILED TO LOAD OFFLINE CASH BALANCE:",
          offlineError
        );
      }
    }
  };

  const loadStrongboxBalance = async () => {
    if (!storeId) {
      return;
    }

    try {
      const response =
        await apiClient.get(
          "/strongbox-balance",
          {
            params: {
              store_id: storeId
            }
          }
        );

      const confirmedBalance =
        Number(
          response.data.balance || 0
        );

      await cacheConfirmedStrongboxBalance(
        storeId,
        confirmedBalance
      );

      const displayedBalance =
        await getDisplayedStrongboxBalance(
          storeId
        );

      setStrongboxBalance(
        displayedBalance !== null
          ? displayedBalance
          : confirmedBalance
      );
    } catch (error) {
      console.warn(
        "USING OFFLINE STRONGBOX BALANCE:",
        error
      );

      try {
        const displayedBalance =
          await getDisplayedStrongboxBalance(
            storeId
          );

        if (displayedBalance !== null) {
          setStrongboxBalance(
            displayedBalance
          );
        }
      } catch (offlineError) {
        console.error(
          "FAILED TO LOAD OFFLINE STRONGBOX BALANCE:",
          offlineError
        );
      }
    }
  };

  const loadBalances = async () => {
    await Promise.all([
      loadBalance(),
      loadStrongboxBalance()
    ]);
  };

  useEffect(() => {
    if (storeId) {
      loadBalances();
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
          marginBottom: 16
        }}
      >
        <div
          style={{
            ...card,
            textAlign: "center"
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
            $
            {Number(
              balance
            ).toFixed(2)}
          </div>
        </div>

        <div
          style={{
            ...card,
            textAlign: "center"
          }}
        >
          <div
            style={{
              color: COLORS.textDim
            }}
          >
            {t("strongbox_balance")}
          </div>

          <div
            style={{
              fontSize: 32,
              fontWeight: "bold",
              color: COLORS.primary,
              marginTop: 6,
              marginBottom: 12
            }}
          >
            {strongboxBalance === null
              ? "—"
              : `$${Number(
                  strongboxBalance
                ).toFixed(2)}`}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap"
            }}
          >
            <button
              type="button"
              onClick={() =>
                setCashMovementMode({
                  mode: "transfer",
                  initialDirection: "out",
                  fixedDirection: true,
                  fixedCashLocation: "Strongbox",
                  titleKey: "deposit_to_strongbox"
                })
              }
              style={btnPrimary}
            >
              {t("deposit")}
            </button>

            <button
              type="button"
              onClick={() =>
                setCashMovementMode({
                  mode: "transfer",
                  initialDirection: "in",
                  fixedDirection: true,
                  fixedCashLocation: "Strongbox",
                  titleKey: "return_from_strongbox"
                })
              }
              style={btnSecondary}
            >
              {t("return_to_register")}
            </button>

            <button
              type="button"
              onClick={() =>
                setShowStrongboxExpense(true)
              }
              style={btnDanger}
            >
              {t("withdraw")}
            </button>

            <button
              type="button"
              onClick={() =>
                setCashMovementMode({
                  mode: "strongbox_adjustment"
                })
              }
              style={btnSecondary}
            >
              {t("adjust")}
            </button>
          </div>
        </div>
      </div>

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
            setCashMovementMode({
              mode: "adjustment"
            })
          }
          style={btnSecondary}
        >
          {t("adjust_register")}
        </button>

        <button
          type="button"
          onClick={() =>
            setCashMovementMode({
              mode: "transfer"
            })
          }
          style={btnSecondary}
        >
          {t("move_cash")}
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

      {showRevenue && (
        <RevenueModal
          storeId={storeId}
          onClose={() =>
            setShowRevenue(false)
          }
          onSuccess={loadBalances}
        />
      )}

      {showReturn && (
        <ReturnModal
          storeId={storeId}
          products={products}
          onClose={() =>
            setShowReturn(false)
          }
          onSuccess={loadBalances}
        />
      )}

      {showExpense && (
        <ExpenseModal
          storeId={storeId}
          onClose={() =>
            setShowExpense(false)
          }
          onSuccess={loadBalances}
        />
      )}

      {showStrongboxExpense && (
        <ExpenseModal
          storeId={storeId}
          registerLocked
          initialExternalSource="Strongbox"
          sourceLocked
          titleKey="withdraw_from_strongbox"
          onClose={() =>
            setShowStrongboxExpense(false)
          }
          onSuccess={loadBalances}
        />
      )}

      {cashMovementMode && (
        <CashMovementModal
          storeId={storeId}
          {...cashMovementMode}
          onClose={() =>
            setCashMovementMode(null)
          }
          onSuccess={loadBalances}
        />
      )}
    </div>
  );
}

export default CashPanel;
