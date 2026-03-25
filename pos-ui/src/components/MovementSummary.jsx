import { useState, useEffect } from "react";
import { useLang } from "../LanguageContext";
import axios from "axios";
import { COLORS, card, input } from "../uiStyles";

const API = "https://vendr-onkr.onrender.com";

function MovementSummary({ storeId }) {

  const { t } = useLang();

  const today = new Date().toISOString().slice(0,10);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [movements, setMovements] = useState([]);

  const load = async () => {
    try {
      console.log("🔵 FETCHING movements...", { storeId, startDate, endDate });

      const res = await axios.get(`${API}/cash-movements`, {
        params: {
          store_id: storeId,
          start_date: startDate,
          end_date: endDate
        }
      });

      console.log("🟢 RESPONSE:", res.data);

      setMovements(res.data.movements || []);
    } catch (err) {
      console.error("🔴 ERROR:", err);
    }
  };

  useEffect(() => {
    if (storeId) load();
  }, [storeId]);

  return (
    <div style={{ ...card, marginTop: 16 }}>

      <h3 style={{ marginBottom: 12 }}>{t("movement_summary")}</h3>

      {/* DATE FILTER */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input
          type="date"
          value={startDate}
          onChange={(e)=>setStartDate(e.target.value)}
          style={input}
        />

        <input
          type="date"
          value={endDate}
          onChange={(e)=>setEndDate(e.target.value)}
          style={input}
        />

        <button onClick={load}>
          {t("apply")}
        </button>
      </div>

      {/* TABLE */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

        {movements.map((m, i) => {

          const realAmount = (m.amount || 0) * (m.direction || 1);
          const isPositive = realAmount >= 0;

          return (
            <div
              key={i}
              style={{
                background: COLORS.panelAlt,
                padding: 10,
                borderRadius: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >

              {/* LEFT */}
              <div>
                <div style={{ fontSize: 12, color: COLORS.textDim }}>
                  {new Date(m.datetime).toLocaleString()}
                </div>

                <div style={{ fontWeight: 500 }}>
                  {m.type}
                </div>

                {/* ✅ CATEGORY */}
                {m.category && (
                  <div style={{
                    fontSize: 12,
                    color: COLORS.primary
                  }}>
                    {m.category}
                  </div>
                )}

                {/* ✅ NOTE */}
                <div style={{
                  fontSize: 12,
                  color: COLORS.textDim
                }}>
                  {m.note || "-"}
                </div>
              </div>

              {/* RIGHT */}
              <div style={{
                fontWeight: "bold",
                color: isPositive ? "#4caf50" : "#ff5252"
              }}>
                {realAmount >= 0 ? "+" : "-"}${Math.abs(realAmount).toFixed(2)}
              </div>

            </div>
          );
        })}

        {movements.length === 0 && (
          <div style={{ color: COLORS.textDim }}>
            {t("no_movements")}
          </div>
        )}

      </div>

    </div>
  );
}

export default MovementSummary;