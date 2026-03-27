import { useState, useEffect } from "react";
import { useLang } from "../LanguageContext";
import axios from "axios";
import { COLORS, card, btnPrimary, btnSecondary, input } from "../uiStyles";

function InventoryReport({ storeId }) {

  const { t } = useLang();

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryView, setInventoryView] = useState("stock");

  const [lowStockItems, setLowStockItems] = useState([]);
  const [paretoItems, setParetoItems] = useState([]);
  const [deadStockItems, setDeadStockItems] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);

  const [serviceStartDate, setServiceStartDate] = useState("");
  const [serviceEndDate, setServiceEndDate] = useState("");
  const [deadStockDays, setDeadStockDays] = useState(90);
  const [paretoMode, setParetoMode] = useState("investment");
  const [totals, setTotals] = useState({ cost: 0, price: 0 });

  const formatMoney = (v) => Number(v || 0).toFixed(2);

  const loadInventory = async () => {
    const res = await axios.get("https://vendr-onkr.onrender.com/stock-report", {
      params: { store_id: storeId, name: searchTerm || undefined }
    });

    const sorted = (res.data.products || []).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

    setProducts(sorted);
    setTotals({
      cost: res.data.total_inventory_cost || 0,
      price: res.data.total_inventory_price || 0
    });
  };

  const loadLowStock = async () => {
    const res = await axios.get("https://vendr-onkr.onrender.com/low-stock", {
      params: { store_id: storeId }
    });
    setLowStockItems(res.data.low_stock || []);
  };

  const loadPareto = async () => {
    const res = await axios.get("https://vendr-onkr.onrender.com/inventory-pareto", {
      params: { store_id: storeId }
    });
    setParetoItems(res.data.products || []);
  };

  const loadDeadStock = async () => {
    const res = await axios.get("https://vendr-onkr.onrender.com/dead-stock", {
      params: { store_id: storeId, days: deadStockDays }
    });
    setDeadStockItems(res.data.products || []);
  };

  const loadServices = async () => {
    const res = await axios.get("https://vendr-onkr.onrender.com/service-report", {
      params: {
        store_id: storeId,
        start_date: serviceStartDate || undefined,
        end_date: serviceEndDate || undefined
      }
    });
    setServiceItems(res.data.services || []);
  };

  useEffect(() => { loadInventory(); }, []);

  useEffect(() => {
    if (inventoryView !== "stock") return;
    const delay = setTimeout(loadInventory, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  useEffect(() => {
    if (inventoryView === "services") loadServices();
  }, [serviceStartDate, serviceEndDate]);

  useEffect(() => {
    if (inventoryView === "lowstock") loadLowStock();
    if (inventoryView === "pareto") loadPareto();
    if (inventoryView === "services") loadServices();
    if (inventoryView === "deadstock") loadDeadStock();
  }, [inventoryView]);

  useEffect(() => {
    if (inventoryView === "deadstock") loadDeadStock();
  }, [deadStockDays]);

  const serviceTotals = {
    cost: serviceItems.reduce((sum, s) => sum + (s.cost || 0), 0),
    revenue: serviceItems.reduce((sum, s) => sum + (s.revenue || 0), 0),
    profit: serviceItems.reduce((sum, s) => sum + (s.profit || 0), 0)
  };

  const filteredProducts = products.filter(p =>
    p.quantity !== null && p.quantity !== undefined
  );

  const filteredLowStock = lowStockItems.filter(i =>
    i.stock !== null && i.stock !== undefined && i.threshold !== null
  );

  const filteredServices = serviceItems.filter(s =>
    s.instances !== undefined
  );

  // ✅ ADDED: Pareto sorting logic
  const sortedPareto = [...paretoItems].sort((a, b) => {
    const getValue = (p) =>
      paretoMode === "investment"
        ? p.investment || 0
        : paretoMode === "sales"
        ? p.revenue || 0
        : p.profit || 0;

    return getValue(b) - getValue(a);
  });

  const topCount = Math.ceil(sortedPareto.length * 0.2);

  return (
    <div style={{ padding: 16 }}>

      <h2 style={{ marginBottom: 12 }}>{t("inventory")}</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["stock","pareto","lowstock","services","deadstock"].map(v => (
          <button
            key={v}
            onClick={() => setInventoryView(v)}
            style={inventoryView === v ? btnPrimary : btnSecondary}
          >
            {t(v).toUpperCase()}
          </button>
        ))}
      </div>

      {inventoryView === "stock" && (
        <input
          placeholder={t("search_inventory")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...input, marginBottom: 16, width: 300 }}
        />
      )}

      {/* STOCK unchanged */}
      {inventoryView === "stock" && (
        <div style={card}>
          <div style={{ display: "flex", gap: 30, marginBottom: 16, fontWeight: "bold" }}>
            <div>{t("cost")}: ${formatMoney(totals.cost)}</div>
            <div>{t("value")}: ${formatMoney(totals.price)}</div>
            <div style={{ color: COLORS.primary }}>
              {t("profit")}: ${formatMoney(totals.price - totals.cost)}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <th>Name</th>
                  <th>Qty</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th>Total Cost</th>
                  <th>Total Value</th>
                  <th>Profit</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((p, i) => {
                  const totalCost = p.investment || 0;
                  const totalValue = (p.price || 0) * (p.quantity || 0);
                  const profit = totalValue - totalCost;

                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td>{p.name}</td>
                      <td>{p.quantity}</td>
                      <td>${formatMoney(p.cost)}</td>
                      <td>${formatMoney(p.price)}</td>
                      <td>${formatMoney(totalCost)}</td>
                      <td>${formatMoney(totalValue)}</td>
                      <td style={{ color: profit >= 0 ? COLORS.primary : COLORS.danger }}>
                        ${formatMoney(profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LOW STOCK unchanged */}
      {inventoryView === "lowstock" && (
        <div style={card}>
          <h3>{t("lowstock")}</h3>

          {filteredLowStock.length === 0 && (
            <div style={{ color: COLORS.textDim }}>{t("no_issues")}</div>
          )}

          {filteredLowStock.map((i, idx) => (
            <div key={idx} style={{ padding: 8, borderBottom: `1px solid ${COLORS.border}` }}>
              <b>{i.name}</b>
              <div>{t("stock")}: {i.stock} / {t("min")}: {i.threshold}</div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ UPDATED PARETO ONLY */}
      {inventoryView === "pareto" && (
        <div style={card}>
          <h3>{t("pareto")}</h3>

          <div style={{
            background: COLORS.panelAlt,
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
            color: COLORS.textDim
          }}>
            <div style={{ marginBottom: 6 }}>
              Pareto analysis helps you identify which products matter most.
            </div>
            <div style={{ marginBottom: 6 }}>
              A small number of products usually account for most of your results.
            </div>
            <div style={{ marginBottom: 6 }}>
              You can use this data in order to:
            </div>
            <ul style={{ paddingLeft: 18 }}>
              <li>Focus on your most important products</li>
              <li>Reduce money tied up in slow items</li>
              <li>Improve profitability decisions</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["investment", "sales", "profit"].map(mode => (
              <button
                key={mode}
                onClick={() => setParetoMode(mode)}
                style={paretoMode === mode ? btnPrimary : btnSecondary}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>


          
          {sortedPareto.map((p, i) => {

            const value =
              paretoMode === "investment"
                ? p.investment
                : paretoMode === "sales"
                ? p.revenue
                : p.profit;

            return (
              <div key={i} style={{
                background: i < topCount ? COLORS.highlight : COLORS.panelAlt,
                padding: 8,
                marginBottom: 6,
                borderRadius: 6,
                display: "flex",
                justifyContent: "space-between"
              }}>
                <div>{p.name}</div>
                <div style={{ color: COLORS.primary }}>
                  ${formatMoney(value)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SERVICES unchanged */}
      {inventoryView === "services" && (
        <div style={card}>
          <div style={{ marginBottom: 12 }}>
            <input type="date" value={serviceStartDate}
              onChange={(e)=>setServiceStartDate(e.target.value)} style={input}/>
            <input type="date" value={serviceEndDate}
              onChange={(e)=>setServiceEndDate(e.target.value)} style={{...input, marginLeft:8}}/>
            <button onClick={loadServices} style={{...btnPrimary, marginLeft:8}}>
              {t("apply")}
            </button>
          </div>

          <div style={{ display: "flex", gap: 30, marginBottom: 12, fontWeight: "bold" }}>
            <div>{t("cost")}: ${formatMoney(serviceTotals.cost)}</div>
            <div>{t("value")}: ${formatMoney(serviceTotals.revenue)}</div>
            <div style={{ color: COLORS.primary }}>
              {t("profit")}: ${formatMoney(serviceTotals.profit)}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <th>Name</th>
                  <th>Instances</th>
                  <th>Cost</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                </tr>
              </thead>

              <tbody>
                {filteredServices.map((s, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td>{s.name}</td>
                    <td>{s.instances || 0}</td>
                    <td>${formatMoney(s.cost)}</td>
                    <td>${formatMoney(s.revenue)}</td>
                    <td style={{ color: (s.profit || 0) >= 0 ? COLORS.primary : COLORS.danger }}>
                      ${formatMoney(s.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DEAD STOCK unchanged */}
      {inventoryView === "deadstock" && (
        <div style={card}>
          <div style={{ marginBottom: 12 }}>
            <input type="number" value={deadStockDays}
              onChange={(e)=>setDeadStockDays(Number(e.target.value))}
              style={input}/>
            <button onClick={loadDeadStock} style={{...btnPrimary, marginLeft:8}}>
              {t("apply")}
            </button>
          </div>

          {deadStockItems.map((p,i)=>(
            <div key={i} style={{ background: COLORS.panelAlt, padding: 8, marginBottom: 6, borderRadius: 6 }}>
              {p.name} — {p.days_since_sale ?? t("never")}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default InventoryReport;