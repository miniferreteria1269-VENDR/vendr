import { useEffect, useState } from "react";
import axios from "axios";
import { COLORS, card } from "../uiStyles";

const API = "https://vendr-onkr.onrender.com";

function SalesHistoryPanel({ storeId }) {

  const [sales, setSales] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/sales-history`, {
          params: { store_id: storeId }
        });
        console.log("SALES DATA:", res.data);
        setSales(res.data.sales || []);
      } catch (err) {
        console.error(err);
      }
    };

    if (storeId) load();
  }, [storeId]);

  return (
    <div style={{ padding: 16 }}>

      <div style={card}>

        <h2 style={{ marginBottom: 12 }}>Sales History</h2>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 8
        }}>

          {Array.isArray(sales) && sales.map((sale, index) => {

            // ✅ SAFE DATE
            const rawDate =
              sale.event_datetime ||
              sale.event_time ||
              sale.created_at;

            const formattedDate = rawDate
              ? new Date(rawDate).toLocaleString()
              : "No date";

            // ✅ SAFE TOTAL (fallback calculation)
            const total =
              sale.total ??
              ((sale.price_at_time || 0) * (sale.quantity || 0));

            return (
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
                    Ticket #{sale.ticket_id || "—"}
                  </div>

                  <div style={{
                    fontSize: 12,
                    color: COLORS.textDim
                  }}>
                    {formattedDate}
                  </div>
                </div>

                {/* RIGHT */}
                <div style={{
                  fontWeight: "bold",
                  color: COLORS.primary
                }}>
                  ${Number(total).toFixed(2)}
                </div>

              </div>
            );
          })}

          {/* EMPTY STATE */}
          {Array.isArray(sales) && sales.length === 0 && (
            <div style={{ color: COLORS.textDim }}>
              No sales yet
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default SalesHistoryPanel;