import { useEffect, useState } from "react";
import axios from "axios";
import { useLang } from "../LanguageContext";
import { COLORS, card, input, btnPrimary } from "../uiStyles";

const API = "https://vendr-onkr.onrender.com";

function IntakeHistoryPanel({ storeId }) {
  const { t } = useLang();

  const today = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadIntakes = async () => {
    if (!storeId) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await axios.get(`${API}/intake-history`, {
        params: {
          store_id: storeId,
          start_date: startDate,
          end_date: endDate,
        },
      });

      setIntakes(res.data.intakes || []);
    } catch (err) {
      console.error("Could not load intake history:", err);

      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        "Could not load intake history.";

      setErrorMessage(String(detail));
      setIntakes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      loadIntakes();
    }
  }, [storeId]);

  const tableContainer = {
    maxHeight: "65vh",
    overflowY: "auto",
    overflowX: "auto",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
  };

  const cell = {
    padding: "10px 12px",
    borderBottom: `1px solid ${COLORS.border}`,
    textAlign: "right",
    whiteSpace: "nowrap",
    background: COLORS.panel,
  };

  const head = {
    ...cell,
    position: "sticky",
    top: 0,
    zIndex: 2,
    color: COLORS.textDim,
    fontWeight: "bold",
    background: COLORS.panelAlt,
  };

  return (
    <div style={card}>
      <h3 style={{ marginTop: 0 }}>
        {t("intake_history") || "Intake History"}
      </h3>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={input}
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={input}
        />

        <button
          type="button"
          onClick={loadIntakes}
          style={{
            ...btnPrimary,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          disabled={loading}
        >
          {loading
            ? t("loading") || "Loading..."
            : t("apply") || "Apply"}
        </button>
      </div>

      {errorMessage && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 6,
            background: "rgba(255, 92, 92, 0.12)",
            color: COLORS.danger || "#ff5c5c",
          }}
        >
          {errorMessage}
        </div>
      )}

      <div style={tableContainer}>
        <table
          style={{
            width: "100%",
            minWidth: 720,
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr>
              <th style={{ ...head, textAlign: "left" }}>
                {t("ticket") || "Ticket"}
              </th>

              <th style={{ ...head, textAlign: "left" }}>
                {t("date") || "Date"}
              </th>

              <th style={head}>
                {t("product_lines") || "Product Lines"}
              </th>

              <th style={head}>
                {t("total_units") || "Total Units"}
              </th>

              <th style={head}>
                {t("total_cost") || "Total Cost"}
              </th>
            </tr>
          </thead>

          <tbody>
            {intakes.map((intake) => (
              <tr key={intake.ticket_id}>
                <td style={{ ...cell, textAlign: "left" }}>
                  #{intake.ticket_id}
                </td>

                <td style={{ ...cell, textAlign: "left" }}>
                  {intake.datetime
                    ? new Date(intake.datetime).toLocaleString()
                    : "—"}
                </td>

                <td style={cell}>
                  {Number(intake.product_lines || 0).toLocaleString()}
                </td>

                <td style={cell}>
                  {Number(intake.total_units || 0).toLocaleString()}
                </td>

                <td style={cell}>
                  ${Number(intake.total_cost || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && intakes.length === 0 && !errorMessage && (
          <p
            style={{
              color: COLORS.textDim,
              margin: 0,
              padding: 14,
            }}
          >
            {t("no_intakes") ||
              "No intake tickets found for this date range."}
          </p>
        )}
      </div>
    </div>
  );
}

export default IntakeHistoryPanel;
