import { useEffect, useState } from "react";
import axios from "axios";
import { useLang } from "../LanguageContext";
import {
  COLORS,
  card,
  input,
  btnPrimary,
  btnSecondary,
} from "../uiStyles";

const API = "https://vendr-onkr.onrender.com";

function IntakeHistoryPanel({ storeId }) {
  const { t } = useLang();
  const today = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [intakes, setIntakes] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadIntakes = async () => {
    if (!storeId) return;

    setLoading(true);
    setErrorMessage("");
    setSelectedTicket(null);

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

  const loadTicketDetails = async (ticketId) => {
    setDetailsLoading(true);
    setErrorMessage("");

    try {
      const res = await axios.get(`${API}/intake-ticket-details`, {
        params: {
          store_id: storeId,
          ticket_id: ticketId,
        },
      });

      setSelectedTicket(res.data);
    } catch (err) {
      console.error("Could not load intake ticket details:", err);

      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        "Could not load intake ticket details.";

      setErrorMessage(String(detail));
    } finally {
      setDetailsLoading(false);
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
            minWidth: 820,
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr>
              <th style={{ ...head, textAlign: "left" }}>Ticket</th>
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
              <th style={head}>{t("actions") || "Actions"}</th>
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

                <td style={cell}>
                  <button
                    type="button"
                    onClick={() => loadTicketDetails(intake.ticket_id)}
                    style={btnSecondary}
                    disabled={detailsLoading}
                  >
                    {detailsLoading
                      ? t("loading") || "Loading..."
                      : t("details") || "Details"}
                  </button>
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

      {selectedTicket && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            background: COLORS.panelAlt,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>
                {t("intake_ticket") || "Intake Ticket"} #
                {selectedTicket.ticket_id}
              </h3>

              <div style={{ color: COLORS.textDim, marginTop: 4 }}>
                {selectedTicket.datetime
                  ? new Date(selectedTicket.datetime).toLocaleString()
                  : ""}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              style={btnSecondary}
            >
              {t("close") || "Close"}
            </button>
          </div>

          <div
            style={{
              overflowX: "auto",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 850,
                borderCollapse: "separate",
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr>
                  <th style={{ ...head, textAlign: "left" }}>ID</th>
                  <th style={{ ...head, textAlign: "left" }}>
                    {t("product") || "Product"}
                  </th>
                  <th style={head}>
                    {t("quantity") || "Quantity"}
                  </th>
                  <th style={head}>
                    {t("unit_cost") || "Unit Cost"}
                  </th>
                  <th style={head}>
                    {t("sale_price") || "Sale Price"}
                  </th>
                  <th style={head}>
                    {t("line_cost") || "Line Cost"}
                  </th>
                  <th style={{ ...head, textAlign: "left" }}>
                    {t("note") || "Note"}
                  </th>
                </tr>
              </thead>

              <tbody>
                {selectedTicket.items.map((item) => (
                  <tr key={item.event_id}>
                    <td style={{ ...cell, textAlign: "left" }}>
                      {item.product_id}
                    </td>

                    <td style={{ ...cell, textAlign: "left" }}>
                      {item.product_name}
                    </td>

                    <td style={cell}>{item.quantity}</td>

                    <td style={cell}>
                      ${Number(item.unit_cost || 0).toFixed(2)}
                    </td>

                    <td style={cell}>
                      ${Number(item.price_at_time || 0).toFixed(2)}
                    </td>

                    <td style={cell}>
                      ${Number(item.line_cost || 0).toFixed(2)}
                    </td>

                    <td style={{ ...cell, textAlign: "left" }}>
                      {item.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td
                    colSpan={2}
                    style={{
                      ...cell,
                      textAlign: "right",
                      fontWeight: "bold",
                    }}
                  >
                    {t("totals") || "Totals"}
                  </td>

                  <td style={{ ...cell, fontWeight: "bold" }}>
                    {selectedTicket.total_units}
                  </td>

                  <td style={cell}>—</td>
                  <td style={cell}>—</td>

                  <td style={{ ...cell, fontWeight: "bold" }}>
                    ${Number(selectedTicket.total_cost || 0).toFixed(2)}
                  </td>

                  <td style={cell}>—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default IntakeHistoryPanel;
