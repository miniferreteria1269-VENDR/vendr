import { useState, useEffect } from "react";
import axios from "axios";

function SalesAnalysisPanel({ storeId }) {

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

  const formatMoney = (v) => {
    return Number(v || 0).toFixed(2);
  };

  return (

    <div style={{ padding: 20 }}>

      <h2>Sales Analysis</h2>

      {/* DATE RANGE */}

      <div style={{ marginBottom: 20 }}>

        <label>Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e)=>setStartDate(e.target.value)}
          style={{ marginLeft:10 }}
        />

        <label style={{ marginLeft:20 }}>End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e)=>setEndDate(e.target.value)}
          style={{ marginLeft:10 }}
        />

        <button
          onClick={loadAnalysis}
          style={{ marginLeft:20 }}
        >
          Apply
        </button>

      </div>

      {/* SUMMARY */}

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(3,1fr)",
        gap:20,
        marginBottom:30
      }}>

        <Metric label="Revenue" value={`$${formatMoney(summary.revenue)}`} />
        <Metric label="Profit" value={`$${formatMoney(summary.profit)}`} />
        <Metric label="Tickets" value={summary.tickets || 0} />
        <Metric label="Avg Daily Revenue" value={`$${formatMoney(summary.avg_daily_revenue)}`} />
        <Metric label="Avg Daily Profit" value={`$${formatMoney(summary.avg_daily_profit)}`} />
        <Metric label="Avg Ticket Value" value={`$${formatMoney(summary.avg_ticket_value)}`} />

      </div>

      {/* TOP LISTS */}

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(3,1fr)",
        gap:20
      }}>

        <ProductList
          title="Top Revenue"
          products={topRevenue}
          field="revenue"
        />

        <ProductList
          title="Top Profit"
          products={topProfit}
          field="profit"
        />

        <ProductList
          title="Top Volume"
          products={topVolume}
          field="units"
        />

      </div>

    </div>

  );

}

function Metric({ label, value }) {

  return (
    <div style={{
      border:"1px solid #ccc",
      padding:15,
      borderRadius:4
    }}>
      <div style={{ fontSize:12 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:"bold" }}>
        {value}
      </div>
    </div>
  );

}

function ProductList({ title, products, field }) {

  return (

    <div style={{
      border:"1px solid #ccc",
      padding:15
    }}>

      <h4>{title}</h4>

      {products.map((p,i)=>(
        <div
          key={i}
          style={{
            display:"flex",
            justifyContent:"space-between",
            borderBottom:"1px solid #eee",
            padding:"4px 0"
          }}
        >
          <span>{p.name}</span>
          <span>
            {field === "revenue" || field === "profit"
              ? `$${Number(p[field] || 0).toFixed(2)}`
              : p[field]}
          </span>
        </div>
      ))}

    </div>

  );

}

export default SalesAnalysisPanel;