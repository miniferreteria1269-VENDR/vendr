import { useState, useEffect } from "react";
import { useLang } from "../LanguageContext";
import ProductMovementSummary from "./ProductMovementSummary";
import { StockAdjustment } from "./ProductManagement";
import axios from "axios";
import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  input,
} from "../uiStyles";

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
  const [totals, setTotals] = useState({
    cost: 0,
    price: 0,
  });

  const formatMoney = (value) => Number(value || 0).toFixed(2);

  const loadInventory = async () => {
    const res = await axios.get(
      "https://vendr-onkr.onrender.com/stock-report",
      {
        params: {
          store_id: storeId,
          name: searchTerm || undefined,
        },
      }
    );

    const sorted = (res.data.products || []).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      })
    );

    setProducts(sorted);

    setTotals({
      cost: res.data.total_inventory_cost || 0,
      price: res.data.total_inventory_price || 0,
    });
  };

  const loadLowStock = async () => {
    const res = await axios.get(
      "https://vendr-onkr.onrender.com/low-stock",
      {
        params: {
          store_id: storeId,
        },
      }
    );

    setLowStockItems(res.data.low_stock || []);
  };

  const loadPareto = async () => {
    const res = await axios.get(
      "https://vendr-onkr.onrender.com/inventory-pareto",
      {
        params: {
          store_id: storeId,
        },
      }
    );

    setParetoItems(res.data.products || []);
  };

  const loadDeadStock = async () => {
    const res = await axios.get(
      "https://vendr-onkr.onrender.com/dead-stock",
      {
        params: {
          store_id: storeId,
          days: deadStockDays,
        },
      }
    );

    setDeadStockItems(res.data.products || []);
  };

  const loadServices = async () => {
    const res = await axios.get(
      "https://vendr-onkr.onrender.com/service-report",
      {
        params: {
          store_id: storeId,
          start_date: serviceStartDate || undefined,
          end_date: serviceEndDate || undefined,
        },
      }
    );

    setServiceItems(res.data.services || []);
  };

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    if (inventoryView !== "stock") return;

    const delay = setTimeout(loadInventory, 300);

    return () => clearTimeout(delay);
  }, [searchTerm]);

  useEffect(() => {
    if (inventoryView === "services") {
      loadServices();
    }
  }, [serviceStartDate, serviceEndDate]);

  useEffect(() => {
    if (inventoryView === "lowstock") {
      loadLowStock();
    }

    if (inventoryView === "pareto") {
      loadPareto();
    }

    if (inventoryView === "services") {
      loadServices();
    }

    if (inventoryView === "deadstock") {
      loadDeadStock();
    }
  }, [inventoryView]);

  useEffect(() => {
    if (inventoryView === "deadstock") {
      loadDeadStock();
    }
  }, [deadStockDays]);

  const serviceTotals = {
    cost: serviceItems.reduce(
      (sum, service) => sum + (service.cost || 0),
      0
    ),
    revenue: serviceItems.reduce(
      (sum, service) => sum + (service.revenue || 0),
      0
    ),
    profit: serviceItems.reduce(
      (sum, service) => sum + (service.profit || 0),
      0
    ),
  };

  const filteredProducts = products.filter(
    (product) =>
      product.quantity !== null &&
      product.quantity !== undefined
  );

  const filteredLowStock = lowStockItems.filter(
    (item) =>
      item.stock !== null &&
      item.stock !== undefined &&
      item.threshold !== null
  );

  const filteredServices = serviceItems.filter(
    (service) => service.instances !== undefined
  );

  const sortedPareto = [...paretoItems].sort((a, b) => {
    const getValue = (product) =>
      paretoMode === "investment"
        ? product.investment || 0
        : paretoMode === "sales"
        ? product.revenue || 0
        : product.profit || 0;

    return getValue(b) - getValue(a);
  });

  const topCount = Math.ceil(sortedPareto.length * 0.2);

  return (
    <div
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <h2 style={{ marginBottom: 12 }}>{t("inventory")}</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {[
          "stock",
          "movement",
          "adjustment",
          "pareto",
          "lowstock",
          "services",
          "deadstock",
        ].map((view) => (
          <button
            key={view}
            onClick={() => setInventoryView(view)}
            style={
              inventoryView === view
                ? btnPrimary
                : btnSecondary
            }
          >
            {t(view).toUpperCase()}
          </button>
        ))}
      </div>

      {inventoryView === "stock" && (
        <input
          placeholder={t("search_inventory")}
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(event.target.value)
          }
          style={{
            ...input,
            marginBottom: 16,
            width: 300,
          }}
        />
      )}

      {/* STOCK */}
      {inventoryView === "stock" && (
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 30,
              marginBottom: 16,
              fontWeight: "bold",
              flexWrap: "wrap",
            }}
          >
            <div>
              {t("cost")}: ${formatMoney(totals.cost)}
            </div>

            <div>
              {t("value")}: ${formatMoney(totals.price)}
            </div>

            <div style={{ color: COLORS.primary }}>
              {t("profit")}: $
              {formatMoney(totals.price - totals.cost)}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              minHeight: 0,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}
                >
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
                {filteredProducts.map((product, index) => {
                  const totalCost =
                    product.investment || 0;

                  const totalValue =
                    (product.price || 0) *
                    (product.quantity || 0);

                  const profit =
                    totalValue - totalCost;

                  return (
                    <tr
                      key={index}
                      style={{
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <td>{product.name}</td>
                      <td>{product.quantity}</td>
                      <td>
                        ${formatMoney(product.cost)}
                      </td>
                      <td>
                        ${formatMoney(product.price)}
                      </td>
                      <td>
                        ${formatMoney(totalCost)}
                      </td>
                      <td>
                        ${formatMoney(totalValue)}
                      </td>
                      <td
                        style={{
                          color:
                            profit >= 0
                              ? COLORS.primary
                              : COLORS.danger,
                        }}
                      >
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

      {/* MOVEMENT */}
      {inventoryView === "movement" && (
        <ProductMovementSummary storeId={storeId} />
      )}

      {/* ADJUSTMENT */}
      {inventoryView === "adjustment" && (
        <StockAdjustment storeId={storeId} />
      )}

      {/* LOW STOCK */}
      {inventoryView === "lowstock" && (
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <h3>{t("lowstock")}</h3>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {filteredLowStock.length === 0 && (
              <div style={{ color: COLORS.textDim }}>
                {t("no_issues")}
              </div>
            )}

            {filteredLowStock.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: 8,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                <b>{item.name}</b>

                <div>
                  {t("stock")}: {item.stock} /{" "}
                  {t("min")}: {item.threshold}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PARETO */}
      {inventoryView === "pareto" && (
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <h3>{t("pareto")}</h3>

          <div
            style={{
              background: COLORS.panelAlt,
              padding: 10,
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 13,
              color: COLORS.textDim,
            }}
          >
            <div style={{ marginBottom: 6 }}>
              {t("pareto_desc_1")}
            </div>

            <div style={{ marginBottom: 6 }}>
              {t("pareto_desc_2")}
            </div>

            <div style={{ marginBottom: 6 }}>
              {t("pareto_desc_3")}
            </div>

            <ul style={{ paddingLeft: 18 }}>
              <li>{t("pareto_focus")}</li>
              <li>{t("pareto_reduce")}</li>
              <li>{t("pareto_improve")}</li>
            </ul>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            {["investment", "sales", "profit"].map(
              (mode) => (
                <button
                  key={mode}
                  onClick={() => setParetoMode(mode)}
                  style={
                    paretoMode === mode
                      ? btnPrimary
                      : btnSecondary
                  }
                >
                  {t(mode).toUpperCase()}
                </button>
              )
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {sortedPareto.map((product, index) => {
              const value =
                paretoMode === "investment"
                  ? product.investment
                  : paretoMode === "sales"
                  ? product.revenue
                  : product.profit;

              return (
                <div
                  key={index}
                  style={{
                    background:
                      index < topCount
                        ? COLORS.highlight
                        : COLORS.panelAlt,
                    padding: 8,
                    marginBottom: 6,
                    borderRadius: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      color:
                        index < topCount
                          ? COLORS.primary
                          : COLORS.text,
                    }}
                  >
                    {product.name}
                  </div>

                  <div
                    style={{
                      color:
                        index < topCount
                          ? COLORS.primary
                          : COLORS.text,
                    }}
                  >
                    ${formatMoney(value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SERVICES */}
      {inventoryView === "services" && (
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <input
              type="date"
              value={serviceStartDate}
              onChange={(event) =>
                setServiceStartDate(event.target.value)
              }
              style={input}
            />

            <input
              type="date"
              value={serviceEndDate}
              onChange={(event) =>
                setServiceEndDate(event.target.value)
              }
              style={input}
            />

            <button
              onClick={loadServices}
              style={btnPrimary}
            >
              {t("apply")}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 30,
              marginBottom: 12,
              fontWeight: "bold",
              flexWrap: "wrap",
            }}
          >
            <div>
              {t("cost")}: $
              {formatMoney(serviceTotals.cost)}
            </div>

            <div>
              {t("value")}: $
              {formatMoney(serviceTotals.revenue)}
            </div>

            <div style={{ color: COLORS.primary }}>
              {t("profit")}: $
              {formatMoney(serviceTotals.profit)}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              minHeight: 0,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}
                >
                  <th>Name</th>
                  <th>Instances</th>
                  <th>Cost</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                </tr>
              </thead>

              <tbody>
                {filteredServices.map(
                  (service, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <td>{service.name}</td>
                      <td>{service.instances || 0}</td>
                      <td>
                        ${formatMoney(service.cost)}
                      </td>
                      <td>
                        ${formatMoney(service.revenue)}
                      </td>
                      <td
                        style={{
                          color:
                            (service.profit || 0) >= 0
                              ? COLORS.primary
                              : COLORS.danger,
                        }}
                      >
                        ${formatMoney(service.profit)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DEAD STOCK */}
      {inventoryView === "deadstock" && (
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <input
              type="number"
              value={deadStockDays}
              onChange={(event) =>
                setDeadStockDays(
                  Number(event.target.value)
                )
              }
              style={input}
            />

            <button
              onClick={loadDeadStock}
              style={btnPrimary}
            >
              {t("apply")}
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {deadStockItems.map((product, index) => (
              <div
                key={index}
                style={{
                  background: COLORS.panelAlt,
                  padding: 8,
                  marginBottom: 6,
                  borderRadius: 6,
                }}
              >
                {product.name} —{" "}
                {product.days_since_sale ?? t("never")}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryReport;
