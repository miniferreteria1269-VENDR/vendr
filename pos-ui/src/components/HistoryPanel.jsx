import { useState } from "react";
import { useLang } from "../LanguageContext";
import { COLORS } from "../uiStyles";
import SalesHistoryPanel from "./SalesHistoryPanel";
import IntakeHistoryPanel from "./IntakeHistoryPanel";

function HistoryPanel({ storeId }) {
  const { t } = useLang();
  const [historyView, setHistoryView] = useState("sales");

  const tabStyle = (active) => ({
    background: active ? COLORS.primary : COLORS.panelAlt,
    color: "white",
    border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: active ? "bold" : "normal",
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setHistoryView("sales")}
          style={tabStyle(historyView === "sales")}
        >
          {t("sales_history") || "Sales History"}
        </button>

        <button
          type="button"
          onClick={() => setHistoryView("intakes")}
          style={tabStyle(historyView === "intakes")}
        >
          {t("intake_history") || "Intake History"}
        </button>
      </div>

      {historyView === "sales" && (
        <SalesHistoryPanel storeId={storeId} />
      )}

      {historyView === "intakes" && (
        <IntakeHistoryPanel storeId={storeId} />
      )}
    </div>
  );
}

export default HistoryPanel;
