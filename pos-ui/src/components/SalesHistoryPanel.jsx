import { useEffect, useState } from "react";
import { useLang } from "../LanguageContext";
import axios from "axios";
import { COLORS, card } from "../uiStyles";

const API = "https://vendr-onkr.onrender.com";

function SalesHistoryPanel({ storeId }) {

  const { t } = useLang();

  const [sales, setSales] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/sales-history`, {
          params: { store_id: storeId }
        });

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

        <h2 style={{ marginBottom: 12 }}>{t("sales_history")}</h2>

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
                  {new Date(sale.datetime).toLocaleString()}
                </div>
              </div>

              {/* RIGHT */}
              <div style={{
                fontWeight: "bold",
                color: COLORS.primary
              }}>
                ${Number(sale.revenue || 0).toFixed(2)}
              </div>

            </div>
          ))}

        </div>

      </div>
    </div>
  );
}

export default SalesHistoryPanel;