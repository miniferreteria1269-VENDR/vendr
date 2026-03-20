import { useState, useEffect } from "react";
import axios from "axios";

function InventoryReport({ storeId }) {

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryView, setInventoryView] = useState("stock");

  const [lowStockItems, setLowStockItems] = useState([]);
  const [paretoItems, setParetoItems] = useState([]);
  const [deadStockItems, setDeadStockItems] = useState([]);

  const [deadStockDays, setDeadStockDays] = useState(90);

  const [totals, setTotals] = useState({
    cost: 0,
    price: 0
  });

  const formatMoney = (value) => {
    return Number(value || 0).toFixed(2);
  };

  // -----------------------------
  // LOAD INVENTORY REPORT
  // -----------------------------

  const loadInventory = async () => {

    const res = await axios.get(
      "http://127.0.0.1:8000/stock-report",
      {
        params: {
          store_id: storeId,
          name: searchTerm || undefined
        }
      }
    );

    const data = res.data;

    const sortedProducts = (data.products || []).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

    setProducts(sortedProducts);

    setTotals({
      cost: data.total_inventory_cost || 0,
      price: data.total_inventory_price || 0
    });

  };

  // -----------------------------
  // LOAD LOW STOCK
  // -----------------------------

  const loadLowStock = async () => {

    const res = await axios.get(
      "http://127.0.0.1:8000/low-stock",
      {
        params: { store_id: storeId }
      }
    );

    setLowStockItems(res.data.low_stock || []);

  };

  // -----------------------------
  // LOAD PARETO
  // -----------------------------

  const loadPareto = async () => {

    const res = await axios.get(
      "http://127.0.0.1:8000/inventory-pareto",
      {
        params: { store_id: storeId }
      }
    );

    setParetoItems(res.data.products || []);

  };

  // -----------------------------
  // LOAD DEAD STOCK
  // -----------------------------

  const loadDeadStock = async () => {

    const res = await axios.get(
      "http://127.0.0.1:8000/dead-stock",
      {
        params: {
          store_id: storeId,
          days: deadStockDays
        }
      }
    );

    setDeadStockItems(res.data.products || []);

  };

  // -----------------------------
  // INITIAL LOAD
  // -----------------------------

  useEffect(() => {
    loadInventory();
  }, []);

  // -----------------------------
  // SEARCH DEBOUNCE
  // -----------------------------

  useEffect(() => {

    if (inventoryView !== "stock") return;

    const delay = setTimeout(() => {
      loadInventory();
    }, 300);

    return () => clearTimeout(delay);

  }, [searchTerm]);

  // -----------------------------
  // VIEW SWITCH LOADER
  // -----------------------------

  useEffect(() => {

    if (inventoryView === "lowstock") {
      loadLowStock();
    }

    if (inventoryView === "pareto") {
      loadPareto();
    }

    if (inventoryView === "deadstock") {
      loadDeadStock();
    }

  }, [inventoryView]);

  // reload dead stock when threshold changes
  useEffect(() => {

    if (inventoryView === "deadstock") {
      loadDeadStock();
    }

  }, [deadStockDays]);

  return (

    <div style={{ padding: 20 }}>

      <h2>Inventory</h2>

      {/* NAVIGATION */}

      <div style={{ marginBottom: 20 }}>

        <button onClick={() => setInventoryView("stock")}>
          Stock Report
        </button>

        <button
          onClick={() => setInventoryView("pareto")}
          style={{ marginLeft: 10 }}
        >
          Pareto
        </button>

        <button
          onClick={() => setInventoryView("lowstock")}
          style={{ marginLeft: 10 }}
        >
          Low Stock
        </button>

        <button
          onClick={() => setInventoryView("deadstock")}
          style={{ marginLeft: 10 }}
        >
          Dead Stock
        </button>

      </div>

      {/* SEARCH BAR */}

      {inventoryView === "stock" && (

        <div style={{ marginBottom: 20 }}>

          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: 300,
              padding: 8
            }}
          />

        </div>

      )}

      {/* STOCK REPORT */}

      {inventoryView === "stock" && (

        <>

          <div
            style={{
              display: "flex",
              gap: 40,
              marginBottom: 20,
              fontWeight: "bold"
            }}
          >

            <div>
              Total Inventory Cost: ${formatMoney(totals.cost)}
            </div>

            <div>
              Total Inventory Retail Value: ${formatMoney(totals.price)}
            </div>

            <div>
              Projected Margin: ${formatMoney(totals.price - totals.cost)}
            </div>

          </div>

          <div
            style={{
              border: "1px solid #ccc",
              maxHeight: "65vh",
              overflowY: "auto"
            }}
          >

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse"
              }}
            >

              <thead style={{ background: "#eee" }}>

                <tr>
                  <th style={cellHeader}>Product</th>
                  <th style={cellHeader}>Qty</th>
                  <th style={cellHeader}>Cost</th>
                  <th style={cellHeader}>Price</th>
                  <th style={cellHeader}>Investment</th>
                  <th style={cellHeader}>Valuation</th>
                </tr>

              </thead>

              <tbody>

                {products.map((p, index) => (

                  <tr key={index}>

                    <td style={cell}>{p.name}</td>
                    <td style={cell}>{p.quantity}</td>
                    <td style={cell}>${formatMoney(p.cost)}</td>
                    <td style={cell}>${formatMoney(p.price)}</td>
                    <td style={cell}>${formatMoney(p.investment)}</td>
                    <td style={cell}>${formatMoney(p.valuation)}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </>

      )}

      {/* LOW STOCK */}

      {inventoryView === "lowstock" && (

        <div>

          <h3>Low Stock Report</h3>

          {lowStockItems.length === 0 && (
            <p>No low stock items.</p>
          )}

          {lowStockItems.map((item, index) => (

            <div
              key={index}
              style={{
                borderBottom: "1px solid #eee",
                padding: "8px 0"
              }}
            >

              <b>{item.name}</b>

              <div>
                Stock: {item.stock} | Minimum: {item.threshold}
              </div>

            </div>

          ))}

        </div>

      )}

      {/* PARETO */}

      {inventoryView === "pareto" && (

        <div>

          <h3>Pareto Inventory Report</h3>

          <div
            style={{
              border: "1px solid #ccc",
              maxHeight: "65vh",
              overflowY: "auto"
            }}
          >

            <table style={{ width: "100%", borderCollapse: "collapse" }}>

              <thead style={{ background: "#eee" }}>

                <tr>
                  <th style={cellHeader}>Product</th>
                  <th style={cellHeader}>Stock</th>
                  <th style={cellHeader}>Cost</th>
                  <th style={cellHeader}>Investment</th>
                </tr>

              </thead>

              <tbody>

                {paretoItems.map((p, index) => (

                  <tr key={index}>

                    <td style={cell}>{p.name}</td>
                    <td style={cell}>{p.stock}</td>
                    <td style={cell}>${formatMoney(p.cost)}</td>
                    <td style={cell}>${formatMoney(p.investment)}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

      {/* DEAD STOCK */}

      {inventoryView === "deadstock" && (

        <div>

          <h3>Dead Stock Report</h3>

          <div style={{ marginBottom: 10 }}>

            Dead Stock Threshold:

            
            <div style={{ marginBottom: 15 }}>

              <label>
                Dead Stock Threshold (days)
              </label>

              <div style={{ display: "flex", gap: 10, marginTop: 5 }}>

                <input
                  type="number"
                  value={deadStockDays}
                  onChange={(e) => setDeadStockDays(Number(e.target.value))}
                  style={{ width: 100 }}
                />

                <button onClick={loadDeadStock}>
                  Apply
                </button>

              </div>

            </div>

          </div>

          {deadStockItems.length === 0 && (
            <p>No dead stock detected.</p>
          )}

          <div
            style={{
              border: "1px solid #ccc",
              maxHeight: "65vh",
              overflowY: "auto"
            }}
          >

            <table style={{ width: "100%", borderCollapse: "collapse" }}>

              <thead style={{ background: "#eee" }}>

                <tr>
                  <th style={cellHeader}>Product</th>
                  <th style={cellHeader}>Stock</th>
                  <th style={cellHeader}>Cost</th>
                  <th style={cellHeader}>Investment</th>
                  <th style={cellHeader}>Last Sale</th>
                  <th style={cellHeader}>Days Since Sale</th>
                </tr>

              </thead>

              <tbody>

                {deadStockItems.map((p, index) => (

                  <tr key={index}>

                    <td style={cell}>{p.name}</td>
                    <td style={cell}>{p.stock}</td>
                    <td style={cell}>${formatMoney(p.cost)}</td>
                    <td style={cell}>${formatMoney(p.investment)}</td>
                    <td style={cell}>{p.last_sale || "Never"}</td>
                    <td style={cell}>{p.days_since_sale ?? "Never"}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

    </div>

  );

}

const cellHeader = {
  textAlign: "left",
  padding: "8px",
  borderBottom: "1px solid #ccc"
};

const cell = {
  padding: "8px",
  borderBottom: "1px solid #eee"
};

export default InventoryReport;