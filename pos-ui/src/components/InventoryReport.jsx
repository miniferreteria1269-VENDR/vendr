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

  return (
    <div style={{ padding: 16 }}>

      <h2 style={{ marginBottom: 12 }}>{t("inventory")}</h2>

      {/* NAV */}
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

      {/* SEARCH */}
      {inventoryView === "stock" && (
        <input
          placeholder={t("search_inventory")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...input, marginBottom: 16, width: 300 }}
        />
      )}

      {/* STOCK VIEW */}
      {inventoryView === "stock" && (
        <div style={card}>

          {/* TOTALS */}
          <div style={{
            display: "flex",
            gap: 30,
            marginBottom: 16,
            fontWeight: "bold"
          }}>
            <div>{t("cost")}: ${formatMoney(totals.cost)}</div>
            <div>{t("value")}: ${formatMoney(totals.price)}</div>
            <div style={{ color: COLORS.primary }}>
              {t("profit")}: ${formatMoney(totals.price - totals.cost)}
            </div>
          </div>

          {/* LIST */}
          <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
            {products.map((p, i) => (
              <div key={i} style={{
                background: COLORS.panelAlt,
                padding: 10,
                borderRadius: 8,
                marginBottom: 6,
                display: "flex",
                justifyContent: "space-between"
              }}>
                <div>
                  <b>{p.name}</b>
                  <div style={{ fontSize: 12, color: COLORS.textDim }}>
                    {t("qty")}: {p.quantity}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div>${formatMoney(p.price)}</div>
                  <div style={{ fontSize: 12, color: COLORS.textDim }}>
                    {t("inv")}: ${formatMoney(p.investment)}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* LOW STOCK */}
      {inventoryView === "lowstock" && (
        <div style={card}>
          <h3>{t("lowstock")}</h3>

          {lowStockItems.length === 0 && (
            <div style={{ color: COLORS.textDim }}>{t("no_issues")}</div>
          )}

          {lowStockItems.map((i, idx) => (
            <div key={idx} style={{
              padding: 8,
              borderBottom: `1px solid ${COLORS.border}`
            }}>
              <b>{i.name}</b>
              <div>{t("stock")}: {i.stock} / {t("min")}: {i.threshold}</div>
            </div>
          ))}
        </div>
      )}

      {/* PARETO */}
      {inventoryView === "pareto" && (
        <div style={card}>
          <h3>{t("pareto")}</h3>

          {paretoItems.map((p, i) => (
            <div key={i} style={{
              background: COLORS.panelAlt,
              padding: 8,
              marginBottom: 6,
              borderRadius: 6
            }}>
              {p.name} — ${formatMoney(p.investment)}
            </div>
          ))}
        </div>
      )}

      {/* SERVICES */}
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

          {serviceItems.map((s,i)=>(
            <div key={i} style={{
              background: COLORS.panelAlt,
              padding: 8,
              borderRadius: 6,
              marginBottom: 6
            }}>
              {s.name} — ${formatMoney(s.revenue)}
            </div>
          ))}
        </div>
      )}

      {/* DEAD STOCK */}
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
            <div key={i} style={{
              background: COLORS.panelAlt,
              padding: 8,
              marginBottom: 6,
              borderRadius: 6
            }}>
              {p.name} — {p.days_since_sale ?? t("never")}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default InventoryReport;