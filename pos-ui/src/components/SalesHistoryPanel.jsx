import { useEffect, useState } from "react";
import { useLang } from "../LanguageContext";
import axios from "axios";
import { COLORS, card } from "../uiStyles";

const API = "https://vendr-onkr.onrender.com";

function SalesHistoryPanel({ storeId }) {

  const { t } = useLang();

  const [sales, setSales] = useState([]);

  // ✅ NEW: date filters
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // ✅ NEW: ticket modal state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetails, setTicketDetails] = useState([]);

  // -----------------------------
  // LOAD SALES (UPDATED PARAMS)
  // -----------------------------
  const loadSales = async () => {
    try {
      const res = await axios.get(`${API}/sales-history`, {
        params: {
          store_id: storeId,
          start_date: startDate,
          end_date: endDate
        }
      });

      setSales(res.data.sales || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (storeId) loadSales();
  }, [storeId]);

  // -----------------------------
  // LOAD TICKET DETAILS
  // -----------------------------
  const openTicket = async (ticketId) => {
    try {
      const res = await axios.get(`${API}/ticket-details`, {
        params: {
          store_id: storeId,
          ticket_id: ticketId
        }
      });

      setTicketDetails(res.data.items || []);
      setSelectedTicket(ticketId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={card}>

        <h2 style={{ marginBottom: 12 }}>{t("sales_history")}</h2>

        {/* ✅ NEW: DATE FILTER UI */}
        <div style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap"
        }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <button onClick={loadSales}>
            {t("apply") || "Apply"}
          </button>
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 8
        }}>

          {Array.isArray(sales) && sales.map((sale, index) => (
            <div
              key={index}
              style={{
                background: COLORS.panelAlt,
                borderRadius: 10,
                padding: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >

              {/* LEFT */}
              <div>
                <div style={{ fontWeight: 500 }}>
                  {t("ticket")} #{sale.ticket_id ?? "—"}
                </div>

                <div style={{
                  fontSize: 12,
                  color: COLORS.textDim
                }}>
                  {new Date(sale.datetime + "Z").toLocaleString()}
                </div>
              </div>

              {/* RIGHT */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10
              }}>

                {/* ✅ EXISTING VALUE */}
                <div style={{
                  fontWeight: "bold",
                  color: COLORS.primary
                }}>
                  ${Number(sale.revenue || 0).toFixed(2)}
                </div>

                {/* ✅ NEW: DETAILS BUTTON */}
                <button
                  onClick={() => openTicket(sale.ticket_id)}
                  style={{
                    background: COLORS.primary,
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 8px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 12
                  }}
                >
                  {t("details") || "Details"}
                </button>

              </div>

            </div>
          ))}

        </div>

      </div>

      {/* ✅ NEW: MODAL */}
      {selectedTicket && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 999
        }}>
          <div style={{
            background: COLORS.panel,
            padding: 20,
            borderRadius: 12,
            width: "90%",
            maxWidth: 400,
            color: COLORS.text
          }}>
            <h3 style={{ marginBottom: 10 }}>
              {t("ticket")} #{selectedTicket}
            </h3>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 300,
              overflowY: "auto",
              marginBottom: 10
            }}>
              {ticketDetails.map((item, i) => (
                <div key={i} style={{
                  background: COLORS.panelAlt,
                  padding: 8,
                  borderRadius: 6
                }}>
                  {item.name} x{item.quantity} — ${Number(item.line_total || 0).toFixed(2)}
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedTicket(null)}
              style={{
                background: COLORS.primary,
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                color: "white",
                cursor: "pointer",
                width: "100%"
              }}
            >
              {t("back") || "Back"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default SalesHistoryPanel;