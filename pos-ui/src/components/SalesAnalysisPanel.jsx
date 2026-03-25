import { useState, useEffect } from "react";
import { useLang } from "../LanguageContext";
import axios from "axios";
import {
  COLORS,
  card,
  btnPrimary,
  input
} from "../uiStyles";

function SalesAnalysisPanel({ storeId }) {

  const { t } = useLang();

  const today = new Date().toISOString().slice(0,10);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [summary, setSummary] = useState({});
  const [topRevenue, setTopRevenue] = useState([]);
  const [topProfit, setTopProfit] = useState([]);
  const [topVolume, setTopVolume] = useState([]);

  const loadAnalysis = async () => {

    const res = await axios.get(
      "https://vendr-onkr.onrender.com/sales-analysis",
      {
        params: {
          store_id: storeId,
          start_date: startDate,
          end_date: endDate
        }
      }
    );

    setSummary(res.data.summary || {});
    setTopRevenue(res.data.top_revenue_products || []);
    setTopProfit(res.data.top_profit_products || []);
    setTopVolume(res.data.top_volume_products || []);
  };

  useEffect(() => {
    loadAnalysis();
  }, []);

  const formatMoney = (v) => Number(v || 0).toFixed(2);

  return (
    <div style={{ padding: 16 }}>

      <h2 style={{ marginBottom: 12 }}>{t("sales_analysis")}</h2>

      {/* DATE RANGE */}
      <div style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        marginBottom: 20,
        flexWrap: "wrap"
      }}>
        <input type="date" value={startDate}
          onChange={(e)=>setStartDate(e.target.value)}
          style={input}
        />

        <input type="date" value={endDate}
          onChange={(e)=>setEndDate(e.target.value)}
          style={input}
        />

        <button onClick={loadAnalysis} style={btnPrimary}>
          {t("apply")}
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
        gap:12,
        marginBottom:20
      }}>

        <Metric label={t("revenue")} value={`$${formatMoney(summary.revenue)}`} />
        <Metric label={t("profit")} value={`$${formatMoney(summary.profit)}`} />
        <Metric label={t("tickets")} value={summary.tickets || 0} />
        <Metric label={t("avg_daily_revenue")} value={`$${formatMoney(summary.avg_daily_revenue)}`} />
        <Metric label={t("avg_daily_profit")} value={`$${formatMoney(summary.avg_daily_profit)}`} />
        <Metric label={t("avg_ticket")} value={`$${formatMoney(summary.avg_ticket_value)}`} />

      </div>

      {/* TOP LISTS */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",
        gap:12
      }}>

        <ProductList title={t("top_revenue")} products={topRevenue} field="revenue" />
        <ProductList title={t("top_profit")} products={topProfit} field="profit" />
        <ProductList title={t("top_volume")} products={topVolume} field="units" />

      </div>

    </div>
  );
}

// ==============================
// METRIC CARD
// ==============================
function Metric({ label, value }) {

  return (
    <div style={{
      background: COLORS.panel,
      borderRadius: 12,
      padding: 14
    }}>
      <div style={{
        fontSize: 12,
        color: COLORS.textDim
      }}>
        {label}
      </div>

      <div style={{
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.primary
      }}>
        {value}
      </div>
    </div>
  );
}

// ==============================
// PRODUCT LIST
// ==============================
function ProductList({ title, products, field }) {

  const { t } = useLang();

  return (
    <div style={card}>

      <h4 style={{ marginBottom: 10 }}>{title}</h4>

      {products.map((p,i)=>(
        <div
          key={i}
          style={{
            background: COLORS.panelAlt,
            borderRadius: 8,
            padding: 8,
            marginBottom: 6,
            display:"flex",
            justifyContent:"space-between"
          }}
        >
          <span>{p.name}</span>

          <span style={{ color: COLORS.primary }}>
            {field === "revenue" || field === "profit"
              ? `$${Number(p[field] || 0).toFixed(2)}`
              : p[field]}
          </span>
        </div>
      ))}

      {products.length === 0 && (
        <div style={{ color: COLORS.textDim }}>
          {t("no_data")}
        </div>
      )}

    </div>
  );
}

export default SalesAnalysisPanel;