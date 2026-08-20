import { useState, useEffect } from "react";
import { useLang } from "../LanguageContext";
import apiClient from "../apiClient";
import {
  exportProductMasterToExcel
} from "../utils/excelExport";
import {
  savePendingEvent,
  submitPendingEvent
} from "../offlineEvents";
import ProductSupplierManagement from "./ProductSupplierManagement";
import {
  getCachedProducts,
  applyLocalStockCountToCatalog
} from "../offlineCatalog";
import { offlineDb } from "../offlineDb";
import ProductImporter from "./ProductImporter";
import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  btnDanger,
  input
} from "../uiStyles";

// ==============================
// MAIN PANEL
// ==============================
function ProductManagement({ storeId, onProductsChanged }) {
  const { t } = useLang();
  const [pmView, setPmView] = useState("menu");
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const immediateTool = pmView === "create" || pmView === "import";
  const requiresProduct = pmView !== "menu" && !immediateTool;

  const loadProducts = async () => {
    if (!storeId) return;
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.get("/products", {
        params: { store_id: storeId, include_archived: true }
      });
      setProducts(response.data.products || []);
    } catch (err) {
      console.error("PRODUCT MASTER LOAD ERROR:", err);
      setProducts([]);
      setError(err.response?.data?.detail || t("unable_load_products"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [storeId]);

  const refreshProducts = async () => {
    await loadProducts();
    if (onProductsChanged) await onProductsChanged();
  };

  const chooseTool = key => {
    setSelectedProduct(null);
    setPmView(key);
  };

  const filteredProducts = products.filter(product => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    return (
      String(product.name || "").toLowerCase().includes(term) ||
      String(product.product_id || "").includes(term) ||
      String(product.location_code || "").toLowerCase().includes(term)
    );
  });

  const activeProductCount = products.filter(
    product => product.is_active !== false
  ).length;

  const archivedProductCount = products.filter(
    product => product.is_active === false
  ).length;

  const translatedText = (key, fallback) => {
    const translated = t(key);

    return translated && translated !== key
      ? translated
      : fallback;
  };

  const exportVisibleProductMaster = () => {
    if (filteredProducts.length === 0) return;

    exportProductMasterToExcel({
      products: filteredProducts,
      storeId,
      labels: {
        productId: translatedText("product_id", "Product ID"),
        product: translatedText("product", "Product"),
        location: translatedText("location", "Location"),
        stock: translatedText("stock", "Stock"),
        lowStock: translatedText("low_stock_short", "Low Stock"),
        cost: translatedText("cost", "Cost"),
        price: translatedText("price", "Price"),
        tracksStock: translatedText("tracks_stock", "Tracks Stock"),
        status: translatedText("status", "Status"),
        createdAt: translatedText("created_at", "Created At"),
        yes: translatedText("yes", "Yes"),
        no: translatedText("no", "No"),
        active: translatedText("active", "Active"),
        archived: translatedText("archived", "Archived"),
        productMasterSheet: translatedText(
          "product_master",
          "Product Master"
        )
      }
    });
  };

  return (
    <div style={{ padding: 16, minHeight: 0 }}>
      <h2 style={{ marginBottom: 12 }}>{t("product_management")}</h2>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 12
        }}
      >
        <div
          style={{
            ...card,
            padding: "10px 14px",
            minWidth: 145
          }}
        >
          <div style={{ color: COLORS.textDim, fontSize: 12 }}>
            {t("active_products")}
          </div>
          <div style={{ color: COLORS.primary, fontSize: 22, fontWeight: "bold" }}>
            {activeProductCount}
          </div>
        </div>

        <div
          style={{
            ...card,
            padding: "10px 14px",
            minWidth: 145
          }}
        >
          <div style={{ color: COLORS.textDim, fontSize: 12 }}>
            {t("archived_products")}
          </div>
          <div style={{ fontSize: 22, fontWeight: "bold" }}>
            {archivedProductCount}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          ["create", "create"],
          ["price", "price"],
          ["edit", "edit"],
          ["suppliers", "suppliers"],
          ["loss", "loss"],
          ["archive", "archive"],
          ["import", "import"],
          ["performance", "performance"]
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => chooseTool(key)}
            style={pmView === key ? btnPrimary : btnSecondary}
          >
            {t(label)}
          </button>
        ))}
      </div>

      <div style={{ color: COLORS.textDim, marginBottom: 10 }}>
        {requiresProduct ? t("select_product") : t("select_tool")}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12
        }}
      >
        <input
          type="text"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder={t("search_products")}
          style={{
            ...input,
            width: "100%",
            maxWidth: 440
          }}
        />

        <button
          type="button"
          onClick={exportVisibleProductMaster}
          disabled={filteredProducts.length === 0}
          title={translatedText(
            "export_excel",
            "Export the visible product list to Excel"
          )}
          style={{
            ...btnSecondary,
            opacity:
              filteredProducts.length === 0
                ? 0.55
                : 1,
            cursor:
              filteredProducts.length === 0
                ? "not-allowed"
                : "pointer"
          }}
        >
          ↓ Excel (.xlsx)
        </button>
      </div>

      {error && <div style={{ color: COLORS.danger, marginBottom: 10 }}>{error}</div>}

      <ProductMasterTable
        products={filteredProducts}
        loading={loading}
        selectable={requiresProduct}
        onSelect={setSelectedProduct}
        t={t}
      />

      {pmView === "create" && (
        <ToolModal onClose={() => setPmView("menu")}>
          <CreateProduct
            storeId={storeId}
            goBack={() => setPmView("menu")}
            onCompleted={refreshProducts}
          />
        </ToolModal>
      )}

      {pmView === "import" && (
        <ToolModal onClose={() => setPmView("menu")} wide>
          <ProductImporter storeId={storeId} />
        </ToolModal>
      )}

      {selectedProduct && (
        <ToolModal
          onClose={() => setSelectedProduct(null)}
          wide={pmView === "suppliers" || pmView === "performance"}
        >
          {pmView === "price" && <PriceChange storeId={storeId} product={selectedProduct} onCompleted={refreshProducts} onClose={() => setSelectedProduct(null)} />}
          {pmView === "edit" && <EditDetails storeId={storeId} product={selectedProduct} onCompleted={refreshProducts} onClose={() => setSelectedProduct(null)} />}
          {pmView === "loss" && <LogLoss storeId={storeId} product={selectedProduct} onCompleted={refreshProducts} onClose={() => setSelectedProduct(null)} />}
          {pmView === "archive" && <ArchiveProduct storeId={storeId} product={selectedProduct} onCompleted={refreshProducts} onClose={() => setSelectedProduct(null)} />}
          {pmView === "suppliers" && <ProductSupplierManagement storeId={storeId} product={selectedProduct} embedded onChanged={refreshProducts} />}
          {pmView === "performance" && (
            <ProductPerformance
              product={selectedProduct}
            />
          )}
        </ToolModal>
      )}
    </div>
  );
}

const getLocalDateValue = date => {
  const localDate = new Date(
    date.getTime() -
    date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 10);
};

function ProductPerformance({ product }) {
  const { t } = useLang();

  const text = (key, fallback) => {
    const translated = t(key);
    return !translated || translated === key
      ? fallback
      : translated;
  };

  const today = getLocalDateValue(new Date());
  const currentMonthStart = `${today.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(today);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const invalidDateRange =
    !startDate ||
    !endDate ||
    startDate > endDate;

  const loadPerformance = async () => {
    if (!product?.product_id || invalidDateRange || loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await apiClient.get(
        `/products/${product.product_id}/performance`,
        {
          params: {
            start_date: startDate,
            end_date: endDate
          }
        }
      );

      setPerformance(response.data);
    } catch (err) {
      console.error("PRODUCT PERFORMANCE LOAD ERROR:", err);
      setPerformance(null);
      setError(
        err.response?.data?.detail ||
        text(
          "product_performance_load_failed",
          "Unable to load product performance."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformance();
  }, [product?.product_id]);

  const money = value =>
    `$${Number(value || 0).toFixed(2)}`;

  const number = value =>
    Number(value || 0).toFixed(2);

  const formatDateTime = value => {
    if (!value) return "—";

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? String(value)
      : parsed.toLocaleString();
  };

  const productData = performance?.product || product;
  const gross = performance?.gross || {};
  const returns = performance?.returns || {};
  const net = performance?.net || {};
  const velocity = performance?.sales_velocity || {};
  const priceFluctuation = performance?.price_fluctuation || {};
  const priceHistory = priceFluctuation.history || [];

  return (
    <div>
      <div style={{ paddingRight: 34, marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>
          {text("product_performance", "Product Performance")}
        </h3>
        <div style={{ marginTop: 4, fontWeight: 700 }}>
          {product.name}
        </div>
      </div>

      <div style={performanceMetadataStyle}>
        <MetadataItem
          label={text("created", "Created")}
          value={formatDateTime(productData.created_at)}
        />
        <MetadataItem
          label={text("location", "Location")}
          value={productData.location_code || "—"}
        />
        <MetadataItem
          label={text("current_stock", "Current Stock")}
          value={productData.tracks_stock ? Number(productData.stock || 0) : text("stock_not_tracked", "Stock not tracked")}
        />
        <MetadataItem
          label={text("current_cost", "Current Cost")}
          value={money(productData.cost)}
        />
        <MetadataItem
          label={text("current_price", "Current Price")}
          value={money(productData.price)}
        />
      </div>

      <div style={performanceDateStyle}>
        <label style={performanceFieldStyle}>
          <span>{text("start_date", "Start Date")}</span>
          <input
            type="date"
            value={startDate}
            onChange={event => setStartDate(event.target.value)}
            style={input}
          />
        </label>

        <label style={performanceFieldStyle}>
          <span>{text("end_date", "End Date")}</span>
          <input
            type="date"
            value={endDate}
            onChange={event => setEndDate(event.target.value)}
            style={input}
          />
        </label>

        <button
          type="button"
          onClick={loadPerformance}
          disabled={loading || invalidDateRange}
          style={{
            ...btnPrimary,
            alignSelf: "end",
            opacity: loading || invalidDateRange ? 0.6 : 1,
            cursor: loading || invalidDateRange ? "default" : "pointer"
          }}
        >
          {loading
            ? text("loading", "Loading...")
            : text("apply", "Apply")}
        </button>
      </div>

      {invalidDateRange && (
        <div style={performanceErrorStyle}>
          {text(
            "invalid_date_range",
            "Start date cannot be after end date."
          )}
        </div>
      )}

      {error && <div style={performanceErrorStyle}>{error}</div>}

      {!performance && loading && (
        <p style={{ color: COLORS.textDim }}>
          {text("loading_product_performance", "Loading product performance...")}
        </p>
      )}

      {performance && (
        <>
          <div style={performanceMetricsStyle}>
            <PerformanceMetric label={text("net_revenue", "Net Revenue")} value={money(net.revenue)} />
            <PerformanceMetric label={text("net_profit", "Net Profit")} value={money(net.profit)} />
            <PerformanceMetric label={text("net_units", "Net Units")} value={Number(net.units || 0)} />
            <PerformanceMetric label={text("gross_units_sold", "Gross Units Sold")} value={Number(gross.units_sold || 0)} />
            <PerformanceMetric label={text("units_returned", "Units Returned")} value={Number(returns.units_returned || 0)} danger={Number(returns.units_returned || 0) > 0} />
            <PerformanceMetric label={text("sale_tickets", "Sale Tickets")} value={Number(gross.sale_tickets || 0)} />
            <PerformanceMetric label={text("average_selling_price", "Average Selling Price")} value={money(gross.average_selling_price)} />
            <PerformanceMetric label={text("net_margin", "Net Margin")} value={`${number(net.margin_percent)}%`} />
            <PerformanceMetric label={text("units_per_week", "Units / Week")} value={number(velocity.units_per_week)} />
          </div>

          <div style={performanceSectionsStyle}>
            <PerformanceSection
              title={text("gross_sales", "Gross Sales")}
              rows={[
                [text("revenue", "Revenue"), money(gross.revenue)],
                [text("cost_of_goods", "Cost of Goods"), money(gross.cost)],
                [text("profit", "Profit"), money(gross.profit)],
                [text("margin", "Margin"), `${number(gross.margin_percent)}%`]
              ]}
            />

            <PerformanceSection
              title={text("product_returns", "Product Returns")}
              rows={[
                [text("returned_revenue", "Returned Revenue"), money(returns.returned_revenue)],
                [text("restored_cost", "Restored Cost"), money(returns.restored_cost)],
                [text("returned_profit", "Returned Profit"), money(returns.returned_profit)],
                [text("return_tickets", "Return Tickets"), Number(returns.return_tickets || 0)]
              ]}
            />

            <PerformanceSection
              title={text("sales_velocity", "Sales Velocity")}
              rows={[
                [text("units_per_day", "Units / Day"), number(velocity.units_per_day)],
                [text("units_per_week", "Units / Week"), number(velocity.units_per_week)],
                [text("period_days", "Days in Period"), Number(performance.period?.days || 0)],
                [text("price_changes", "Price Changes"), Number(priceFluctuation.change_count || 0)]
              ]}
            />
          </div>

          <div style={{ ...card, marginTop: 14 }}>
            <h4 style={{ marginTop: 0, marginBottom: 10 }}>
              {text("price_history", "Price History")}
            </h4>

            {priceHistory.length === 0 ? (
              <div style={{ color: COLORS.textDim }}>
                {text(
                  "no_price_changes_period",
                  "No recorded price changes in this period."
                )}
              </div>
            ) : (
              <div style={{ overflow: "auto", maxHeight: 230, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={performanceTableHeaderStyle}>{text("date", "Date")}</th>
                      <th style={performanceTableHeaderStyle}>{text("cost", "Cost")}</th>
                      <th style={performanceTableHeaderStyle}>{text("price", "Price")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.map(change => (
                      <tr key={change.event_id}>
                        <td style={performanceTableCellStyle}>{formatDateTime(change.event_datetime)}</td>
                        <td style={performanceTableCellStyle}>{money(change.cost)}</td>
                        <td style={performanceTableCellStyle}>{money(change.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {priceHistory.length > 0 && (
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 10, color: COLORS.textDim, fontSize: 13 }}>
                <span>{text("lowest_price", "Lowest")}: {money(priceFluctuation.lowest_recorded_price)}</span>
                <span>{text("highest_price", "Highest")}: {money(priceFluctuation.highest_recorded_price)}</span>
                <span>{text("price_range", "Range")}: {money(priceFluctuation.recorded_price_range)}</span>
              </div>
            )}
          </div>

          <p style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 0 }}>
            {text(
              "generic_refunds_excluded_note",
              "Cash-only refunds are excluded because they are not linked to individual products."
            )}
          </p>
        </>
      )}
    </div>
  );
}

function MetadataItem({ label, value }) {
  return (
    <div>
      <div style={{ color: COLORS.textDim, fontSize: 11 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function PerformanceMetric({ label, value, danger = false }) {
  return (
    <div style={{ background: COLORS.panel, borderRadius: 10, padding: 10, minWidth: 0 }}>
      <div style={{ color: COLORS.textDim, fontSize: 11 }}>{label}</div>
      <div style={{ color: danger ? COLORS.danger : COLORS.primary, fontSize: 18, fontWeight: 700, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function PerformanceSection({ title, rows }) {
  return (
    <div style={{ ...card, padding: 12 }}>
      <h4 style={{ marginTop: 0, marginBottom: 8 }}>{title}</h4>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ color: COLORS.textDim }}>{label}</span>
          <strong style={{ whiteSpace: "nowrap" }}>{value}</strong>
        </div>
      ))}
    </div>
  );
}

const performanceMetadataStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, padding: 10, marginBottom: 12, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.panel };
const performanceDateStyle = { display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap", marginBottom: 12 };
const performanceFieldStyle = { display: "flex", flexDirection: "column", gap: 4, minWidth: 155 };
const performanceMetricsStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 8, marginBottom: 12 };
const performanceSectionsStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 };
const performanceErrorStyle = { padding: 10, marginBottom: 12, borderRadius: 8, background: "rgba(255, 92, 92, 0.12)", color: COLORS.danger };
const performanceTableHeaderStyle = { padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap", position: "sticky", top: 0, background: COLORS.panelAlt, borderBottom: `1px solid ${COLORS.border}` };
const performanceTableCellStyle = { padding: "8px 10px", whiteSpace: "nowrap", borderBottom: `1px solid ${COLORS.border}` };

function ProductMasterTable({
  products,
  loading,
  selectable,
  onSelect,
  t
}) {
  if (loading) {
    return (
      <div style={card}>
        {t("loading")}
      </div>
    );
  }

  const columns = [
    "product",
    "location",
    "stock",
    "low_stock_short",
    "cost",
    "price",
    "tracks_stock",
    "status"
  ];

  return (
    <div
      style={{
        border:
          `1px solid ${COLORS.border}`,
        borderRadius: 8,
        overflow: "auto",
        maxHeight:
          "calc(100dvh - 245px)",
        minHeight: 220
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse"
        }}
      >
        <thead>
          <tr>
            {columns.map(key => {
              const isCompactNumber =
                key === "stock" ||
                key ===
                  "low_stock_short";

              return (
                <th
                  key={key}
                  style={{
                    ...masterHeaderStyle,

                    width:
                      isCompactNumber
                        ? 78
                        : undefined,

                    textAlign:
                      isCompactNumber
                        ? "center"
                        : "left"
                  }}
                >
                  {t(key)}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {products.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                style={{
                  padding: 18,
                  textAlign: "center",
                  color:
                    COLORS.textDim
                }}
              >
                {t(
                  "no_products_found"
                )}
              </td>
            </tr>
          ) : (
            products.map(product => {
              const tracksStock =
                Boolean(
                  Number(
                    product.tracks_stock
                  )
                );

              return (
                <tr
                  key={
                    product.product_id
                  }
                  onClick={() =>
                    selectable &&
                    onSelect(product)
                  }
                  style={{
                    cursor:
                      selectable
                        ? "pointer"
                        : "default",

                    opacity:
                      product.is_active
                        ? 1
                        : 0.58
                  }}
                >
                  <td
                    style={
                      masterCellStyle
                    }
                  >
                    <strong>
                      {product.name}
                    </strong>

                    <div
                      style={{
                        fontSize: 11,
                        color:
                          COLORS.textDim
                      }}
                    >
                      #
                      {
                        product.product_id
                      }
                    </div>
                  </td>

                  <td
                    style={
                      masterCellStyle
                    }
                  >
                    {product.location_code ||
                      "—"}
                  </td>

                  <td
                    style={{
                      ...masterCellStyle,
                      textAlign: "center"
                    }}
                  >
                    {tracksStock
                      ? Number(
                          product.stock ||
                            0
                        )
                      : "—"}
                  </td>

                  <td
                    style={{
                      ...masterCellStyle,
                      textAlign: "center"
                    }}
                  >
                    {tracksStock
                      ? Number(
                          product
                            .low_stock_threshold ||
                            0
                        )
                      : "—"}
                  </td>

                  <td
                    style={
                      masterCellStyle
                    }
                  >
                    $
                    {Number(
                      product.cost || 0
                    ).toFixed(2)}
                  </td>

                  <td
                    style={
                      masterCellStyle
                    }
                  >
                    $
                    {Number(
                      product.price || 0
                    ).toFixed(2)}
                  </td>

                  <td
                    style={
                      masterCellStyle
                    }
                  >
                    {tracksStock
                      ? t("yes")
                      : t("no")}
                  </td>

                  <td
                    style={{
                      ...masterCellStyle,

                      color:
                        product.is_active
                          ? "#3ddc84"
                          : COLORS.danger,

                      fontWeight: 600
                    }}
                  >
                    {product.is_active
                      ? t("active")
                      : t("archived")}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
function ToolModal({ children, onClose, wide = false }) {
  return (
    <div role="presentation" onMouseDown={onClose} style={toolBackdropStyle}>
      <div role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()} style={{ ...toolModalStyle, width: wide ? "min(1000px, 100%)" : "min(520px, 100%)" }}>
        <button type="button" onClick={onClose} aria-label="Close" style={toolCloseStyle}>×</button>
        {children}
      </div>
    </div>
  );
}

const masterHeaderStyle = { padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 1, background: COLORS.panelAlt, borderBottom: `1px solid ${COLORS.border}` };
const masterCellStyle = { padding: "9px 12px", whiteSpace: "nowrap", borderBottom: `1px solid ${COLORS.border}` };
const toolBackdropStyle = { position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 18, background: "rgba(0, 0, 0, 0.72)" };
const toolModalStyle = { position: "relative", maxHeight: "90dvh", overflow: "auto", boxSizing: "border-box", padding: 20, border: `1px solid ${COLORS.border}`, borderRadius: 10, background: COLORS.panelAlt, boxShadow: "0 18px 60px rgba(0, 0, 0, 0.5)" };
const toolCloseStyle = { position: "absolute", top: 8, right: 10, border: "none", background: "transparent", color: COLORS.text, cursor: "pointer", fontSize: 28, lineHeight: 1 };

// ==============================
const resultCard = () => ({
  background: COLORS.panelAlt,
  padding: 10,
  borderRadius: 8,
  marginBottom: 6,
  cursor: "pointer",
  border: "1px solid transparent"
});

function CreateProduct({ storeId, goBack, onCompleted }) {

  const { t } = useLang();

  const [name, setName] = useState("");
  const [initialStock, setInitialStock] = useState(0);
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [tracksStock, setTracksStock] = useState(true);
  const [threshold, setThreshold] = useState(0);
  const [locationCode, setLocationCode] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {

    if (name.length < 2) {
      setSuggestions([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        const res = await apiClient.get(
          "/products/search",
          {
            params: {
              store_id: storeId,
              name
            }
          }
        );
        setSuggestions(res.data.products.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(delay);

  }, [name, storeId]);

  const createProduct = async () => {

    if (!name.trim()) {
      alert(t("product_name_required"));
      return;
    }

    await apiClient.post(
      "/create-product",
      null,
      {
        params: {
          store_id: storeId,
          name,
          initial_stock: initialStock,
          cost,
          price,
          tracks_stock: tracksStock,
          low_stock_threshold: threshold,
          location_code:
            locationCode.trim() || null
        }
      }
    );

    if (onCompleted) await onCompleted();
    alert(t("product_created"));
    goBack();

  };

  return (
    <div style={{ maxWidth: 400 }}>

      <h3>{t("create_product")}</h3>

      <label>{t("name")}</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 6 }}
        placeholder={t("product_name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {suggestions.map(p => (
        <div key={p.product_id} style={resultCard()}>
          {p.name}
        </div>
      ))}

      <label>{t("initial_stock")}</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8 }}
        type="number"
        value={initialStock}
        onChange={(e) => setInitialStock(Number(e.target.value))}
      />

      <label>{t("cost")}</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8 }}
        type="number"
        value={cost}
        onChange={(e) => setCost(Number(e.target.value))}
      />

      <label>{t("price")}</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8 }}
        type="number"
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
      />

      <label>{t("low_stock")}</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8 }}
        type="number"
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
      />

      <label>{t("location")}</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8, textTransform: "uppercase" }}
        type="text"
        maxLength={24}
        value={locationCode}
        onChange={e => setLocationCode(e.target.value.toUpperCase())}
        placeholder={t("location_code_placeholder")}
      />

      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <label>
          <input
            type="checkbox"
            checked={tracksStock}
            onChange={(e) => setTracksStock(e.target.checked)}
          />
          {" "}{t("tracks_stock")}
        </label>
      </div>

      <button style={btnPrimary} onClick={createProduct}>
        {t("create_product")}
      </button>

      <button
        style={{ ...btnSecondary, marginLeft: 8 }}
        onClick={goBack}
      >
        {t("cancel")}
      </button>

    </div>
  );
}

// ==============================
// PRICE CHANGE
// ==============================
function PriceChange({ storeId, product, onCompleted, onClose }) {

  const { t } = useLang();

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(product || null);
  const [cost, setCost] = useState(Number(product?.cost || 0));
  const [price, setPrice] = useState(Number(product?.price || 0));

  const searchProducts = async (term) => {
    const res = await apiClient.get(
      "/products/search",
      {
        params: {
          store_id: storeId,
          name: term
        }
      }
    );
    setProducts(res.data.products || []);
  };

  const submit = async () => {
    await apiClient.post(
      "/price-change",
      null,
      {
        params: {
          store_id: storeId,
          product_id: selected.product_id,
          cost,
          price
        }
      }
    );
    if (onCompleted) await onCompleted();
    alert(t("updated"));
    if (onClose) onClose();
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h3>{t("price_change")}</h3>

      {!selected && (
        <>
          <input
            style={{ ...input, width: "100%", marginBottom: 10 }}
            placeholder={t("search_product")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.length > 1) searchProducts(e.target.value);
            }}
          />

          {products.map(p => (
            <div key={p.product_id} onClick={()=>{
              setSelected(p);
              setCost(p.cost || 0);
              setPrice(p.price || 0);
            }} style={resultCard()}>
              {p.name}
            </div>
          ))}
        </>
      )}

      {selected && (
        <>
          <strong>{selected.name}</strong>

          <label>{t("cost")}</label>
          <input style={input} type="number" value={cost}
            onChange={e=>setCost(Number(e.target.value))}/>

          <label>{t("price")}</label>
          <input style={input} type="number" value={price}
            onChange={e=>setPrice(Number(e.target.value))}/>

          <button
              style={btnPrimary}
              onClick={submit}
          >
              {t("save")}
          </button>
          <button style={btnSecondary} onClick={()=>onClose ? onClose() : setSelected(null)}>
            {t("cancel")}
          </button>
        </>
      )}
    </div>
  );
}

// ==============================
// LOG LOSS
// ==============================
function LogLoss({ storeId, product, onCompleted, onClose }) {

  const { t } = useLang();

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(product || null);
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  const searchProducts = async (term) => {
    const res = await apiClient.get(
      "/products/search",
      {
        params: {
          store_id: storeId,
          name: term
        }
      }
    );
    setProducts(res.data.products || []);
  };

  const submit = async () => {
    await apiClient.post(
      "/loss",
      null,
      {
        params: {
          store_id: storeId,
          product_id: selected.product_id,
          quantity,
          notes
        }
      }
    );
    if (onCompleted) await onCompleted();
    alert(t("loss_recorded"));
    if (onClose) onClose();
    else setSelected(null);
    setNotes("");
    setQuantity(1);
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h3>{t("log_loss")}</h3>

      {!selected && (
        <>
          <input style={input} placeholder={t("search_product")}
            value={search}
            onChange={(e)=>{
              setSearch(e.target.value);
              if(e.target.value.length>1) searchProducts(e.target.value);
            }}
          />

          {products.map(p=>(
            <div key={p.product_id} onClick={()=>setSelected(p)} style={resultCard()}>
              {p.name} ({t("stock")}: {p.stock})
            </div>
          ))}
        </>
      )}

      {selected && (
        <>
          <strong>{selected.name}</strong>

          <label>{t("quantity")}</label>
          <input style={input} type="number" value={quantity}
            onChange={e=>setQuantity(Number(e.target.value))}/>

          <label>{t("notes")}</label>
          <input style={input} value={notes}
            onChange={e=>setNotes(e.target.value)}/>

          <button
            style={btnPrimary}
            onClick={submit}
          >
            {t("submit")}
          </button>
          <button style={btnSecondary} onClick={()=>onClose ? onClose() : setSelected(null)}>
            {t("cancel")}
          </button>
        </>
      )}
    </div>
  );
}

// ==============================
// EDIT DETAILS
// ==============================
function EditDetails({ storeId, product, onCompleted, onClose }) {

  const { t } = useLang();

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(product || null);

  const [name, setName] = useState(product?.name || "");
  const [threshold, setThreshold] = useState(Number(product?.low_stock_threshold || 0));
  const [tracksStock, setTracksStock] = useState(Boolean(product?.tracks_stock));
  const [locationCode, setLocationCode] = useState(product?.location_code || "");

  const searchProducts = async (term) => {
    const res = await apiClient.get(
      "/products/search",
      {
        params: {
          store_id: storeId,
          name: term,
          include_inactive: true
        }
      }
    );
    setProducts(res.data.products || []);
  };

  const submit = async () => {
    await apiClient.post(
      "/edit-product",
      null,
      {
        params: {
          store_id: storeId,
          product_id: selected.product_id,
          name,
          low_stock_threshold: threshold,
          tracks_stock: tracksStock ? 1 : 0,
          location_code: locationCode
        }
      }
    );
    if (onCompleted) await onCompleted();
    alert(t("updated"));
    if (onClose) onClose();
    else setSelected(null);
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h3>{t("edit_product")}</h3>

      {!selected && (
        <>
          <input style={input} value={search}
            onChange={(e)=>{
              setSearch(e.target.value);
              if(e.target.value.length>1) searchProducts(e.target.value);
            }}/>

          {products.map(p=>(
            <div key={p.product_id} onClick={()=>{
              setSelected(p);
              setName(p.name);
              setThreshold(p.low_stock_threshold||0);
              setTracksStock(p.tracks_stock);
              setLocationCode(p.location_code || "");
            }} style={resultCard()}>
              {p.name}
            </div>
          ))}
        </>
      )}

      {selected && (
        <>
          <label>{t("name")}</label>
          <input style={input} value={name} onChange={e=>setName(e.target.value)}/>

          <label>{t("low_stock")}</label>
          <input style={input} value={threshold}
            onChange={e=>setThreshold(Number(e.target.value))}/>

          <label>{t("location")}</label>
          <input
            style={input}
            maxLength={24}
            value={locationCode}
            onChange={e=>setLocationCode(e.target.value.toUpperCase())}
            placeholder={t("location_code_placeholder")}
          />

          <label>
            <input type="checkbox" checked={tracksStock}
              onChange={e=>setTracksStock(e.target.checked)}/>
            {" "}{t("tracks_stock")}
          </label>

          <button style={btnPrimary} onClick={submit}>
            {t("save")}
          </button>
          <button style={btnSecondary} onClick={()=>onClose ? onClose() : setSelected(null)}>
            {t("cancel")}
          </button>
        </>
      )}
    </div>
  );
}

// ==============================
// ARCHIVE
// ==============================
function ArchiveProduct({ storeId, product, onCompleted, onClose }) {

  const { t } = useLang();

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);

  const searchProducts = async (term) => {
    const res = await apiClient.get(
      "/products/search",
      {
        params: {
          store_id: storeId,
          name: term,
          include_inactive: true
        }
      }
    );
    setProducts(res.data.products || []);
  };

  const archive = async (p) => {
    await apiClient.post(
      "/archive-product",
      null,
      {
        params: {
          store_id: storeId,
          product_id: p.product_id,
          is_active: !p.is_active
        }
      }
    );

    alert(t("updated"));

    if (onCompleted) await onCompleted();

    if (onClose) {
      onClose();
      return;
    }

    setProducts(prev =>
      prev.map(x =>
        x.product_id === p.product_id
          ? { ...x, is_active: !x.is_active }
          : x
      )
    );
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h3>{t("archive_product")}</h3>

      {product ? (
        <div style={resultCard()}>
          <p><strong>{product.name}</strong></p>
          <p style={{ color: COLORS.textDim }}>
            {product.is_active ? t("active") : t("archived")}
          </p>
          <button style={product.is_active ? btnDanger : btnPrimary} onClick={() => archive(product)}>
            {product.is_active ? t("archive") : t("restore")}
          </button>
          <button style={{ ...btnSecondary, marginLeft: 8 }} onClick={onClose}>
            {t("cancel")}
          </button>
        </div>
      ) : (
        <>

      <input
        style={{ ...input, width: "100%", marginBottom: 10 }}
        placeholder={t("search_product")}
        value={search}
        onChange={(e)=>{
          setSearch(e.target.value);
          if(e.target.value.length>1) searchProducts(e.target.value);
          else setProducts([]);
        }}
      />

      {products.map(p=>(
        <div key={p.product_id} style={resultCard()}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span>{p.name}</span>
            <button style={btnDanger} onClick={()=>archive(p)}>
              {p.is_active===false ? t("restore") : t("archive")}
            </button>
          </div>
        </div>
      ))}
        </>
      )}
    </div>
  );
}

const getOrCreateAdjustmentDeviceId = () => {
  const storageKey = "vendr_device_id";

  let deviceId =
    localStorage.getItem(storageKey);

  if (!deviceId) {
    deviceId =
      crypto.randomUUID?.() ||
      `device-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    localStorage.setItem(
      storageKey,
      deviceId
    );
  }

  return deviceId;
};

const createAdjustmentClientEventId = () =>
  crypto.randomUUID?.() ||
  `adjustment-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;


export function StockAdjustment({
  storeId
}) {
  const { t } = useLang();

  const [search, setSearch] =
    useState("");

  const [products, setProducts] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  const [countedTotal, setCountedTotal] =
    useState("");

  const [reason, setReason] =
    useState("physical_count");

  const [note, setNote] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const tracksStock = product =>
    product.tracks_stock === 1 ||
    product.tracks_stock === true ||
    product.tracks_stock === "1" ||
    product.tracks_stock === "true";

  const sortProducts = loadedProducts =>
    [...loadedProducts]
      .filter(tracksStock)
      .sort((a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || ""),
          undefined,
          { sensitivity: "base" }
        )
      );

  const loadAdjustmentProducts = async () => {
    if (!storeId) {
      setProducts([]);
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.get(
        "/products",
        {
          params: {
            store_id: storeId
          }
        }
      );

      setProducts(
        sortProducts(
          response.data.products || []
        )
      );
    } catch (error) {
      console.warn(
        "USING CACHED ADJUSTMENT PRODUCTS:",
        error
      );

      const cachedProducts =
        await getCachedProducts(storeId);

      setProducts(
        sortProducts(cachedProducts)
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdjustmentProducts();
  }, [storeId]);

  const resetSelection = () => {
    setSelected(null);
    setCountedTotal("");
    setReason("physical_count");
    setNote("");
  };

  const selectProduct = product => {
    setSelected({
      ...product,
      stock: Number(product.stock || 0)
    });
    setCountedTotal("");
    setReason("physical_count");
    setNote("");
  };

  const normalizedSearch =
    search.trim().toLowerCase();

  const visibleProducts = products.filter(
    product =>
      !normalizedSearch ||
      String(product.name || "")
        .toLowerCase()
        .includes(normalizedSearch) ||
      String(product.product_id || "")
        .includes(normalizedSearch) ||
      String(product.location_code || "")
        .toLowerCase()
        .includes(normalizedSearch)
  );

  const numericCountedTotal =
    Number(countedTotal);

  const currentStock = Number(
    selected?.stock || 0
  );

  const hasValidCount =
    countedTotal !== "" &&
    Number.isInteger(numericCountedTotal) &&
    numericCountedTotal >= 0;

  const stockDifference = hasValidCount
    ? numericCountedTotal - currentStock
    : null;

  const submit = async () => {
    if (submitting) {
      return;
    }

    if (
      !storeId ||
      !selected?.product_id ||
      !hasValidCount
    ) {
      alert(
        t("invalid_counted_stock")
      );

      return;
    }

    if (stockDifference === 0) {
      alert(t("same_stock_value"));
      return;
    }

    const clientEventId =
      createAdjustmentClientEventId();

    const deviceId =
      getOrCreateAdjustmentDeviceId();

    const clientCreatedAt =
      new Date().toISOString();

    const payload = {
      store_id: storeId,
      product_id:
        selected.product_id,
      counted_total: numericCountedTotal,
      expected_stock: currentStock,
      reason,
      note: note.trim(),
      client_event_id:
        clientEventId,
      device_id: deviceId,
      client_created_at:
        clientCreatedAt
    };

    const pendingEvent = {
      client_event_id:
        clientEventId,
      event_type:
        "stock_adjustment",
      store_id: storeId,
      device_id: deviceId,
      client_created_at:
        clientCreatedAt,
      payload
    };

    setSubmitting(true);

    try {
      /*
       * Save locally first. Once this succeeds, the
       * adjustment is durable even without internet.
       */
      const saveResult =
        await savePendingEvent(
          pendingEvent
        );

      // The local catalog mirrors the physical count.
      if (saveResult.created) {
        await applyLocalStockCountToCatalog(
          storeId,
          selected.product_id,
          numericCountedTotal
        );
      }

      let synchronized = false;

      if (navigator.onLine) {
        try {
          await submitPendingEvent(
            pendingEvent
          );

          synchronized = true;
        } catch (syncError) {
          const detail =
            syncError.response?.data?.detail;

          if (
            syncError.response?.status === 409 &&
            detail?.code === "STOCK_CHANGED"
          ) {
            await offlineDb.pendingEvents.delete(
              clientEventId
            );

            const serverStock = Number(
              detail.current_stock || 0
            );

            await applyLocalStockCountToCatalog(
              storeId,
              selected.product_id,
              serverStock
            );

            setProducts(previous =>
              previous.map(product =>
                product.product_id ===
                selected.product_id
                  ? {
                      ...product,
                      stock: serverStock
                    }
                  : product
              )
            );

            setSelected(previous => ({
              ...previous,
              stock: serverStock
            }));

            setCountedTotal("");
            alert(t("stock_changed_recount"));
            return;
          }

          console.warn(
            "STOCK ADJUSTMENT SAVED PENDING SYNC:",
            syncError
          );
        }
      }

      setProducts(previous =>
        previous.map(product =>
          product.product_id ===
          selected.product_id
            ? {
                ...product,
                stock: numericCountedTotal
              }
            : product
        )
      );

      resetSelection();

      alert(
        synchronized
          ? t("stock_adjustment_completed")
          : t("stock_adjustment_saved_pending")
      );
    } catch (error) {
      console.error(
        "STOCK ADJUSTMENT LOCAL SAVE ERROR:",
        error
      );

      alert(
        t("stock_adjustment_failed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        ...card,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>
            {t("stock_adjustment")}
          </h3>

          <div
            style={{
              color: COLORS.textDim,
              fontSize: 13,
              marginTop: 4
            }}
          >
            {t("counted_total_help")}
          </div>
        </div>

        <input
          type="text"
          placeholder={t("search_inventory")}
          value={search}
          onChange={event =>
            setSearch(event.target.value)
          }
          disabled={submitting}
          style={{
            ...input,
            width: 300,
            maxWidth: "100%"
          }}
        />
      </div>

      {selected && (
        <div
          style={{
            background: COLORS.panelAlt,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: 12,
            marginBottom: 12
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 10
            }}
          >
            <strong>{selected.name}</strong>

            <span style={{ color: COLORS.textDim }}>
              {t("current_stock")}: {currentStock}
            </span>

            {stockDifference !== null && (
              <span
                style={{
                  color:
                    stockDifference > 0
                      ? "#3ddc84"
                      : stockDifference < 0
                        ? COLORS.danger
                        : COLORS.textDim,
                  fontWeight: "bold"
                }}
              >
                {t("calculated_adjustment")}: {" "}
                {stockDifference > 0 ? "+" : ""}
                {stockDifference}
              </span>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 10
            }}
          >
            <select
              value={reason}
              onChange={event =>
                setReason(event.target.value)
              }
              disabled={submitting}
              style={input}
            >
              <option value="physical_count">
                {t("physical_count")}
              </option>
              <option value="damage_or_loss">
                {t("damage_or_loss")}
              </option>
              <option value="found_stock">
                {t("found_stock")}
              </option>
              <option value="data_correction">
                {t("data_correction")}
              </option>
              <option value="other">
                {t("other")}
              </option>
            </select>

            <input
              type="text"
              placeholder={t("note_optional")}
              value={note}
              onChange={event =>
                setNote(event.target.value)
              }
              disabled={submitting}
              style={input}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              flexWrap: "wrap",
              marginTop: 10
            }}
          >
            <button
              type="button"
              onClick={resetSelection}
              disabled={submitting}
              style={btnSecondary}
            >
              {t("cancel")}
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={
                submitting ||
                !hasValidCount ||
                stockDifference === 0
              }
              style={{
                ...btnPrimary,
                opacity:
                  submitting ||
                  !hasValidCount ||
                  stockDifference === 0
                    ? 0.6
                    : 1
              }}
            >
              {submitting
                ? t("loading")
                : t("confirm_adjustment")}
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto"
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse"
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>
                {t("product")}
              </th>
              <th style={{ textAlign: "left", padding: 8 }}>
                {t("location")}
              </th>
              <th style={{ textAlign: "right", padding: 8 }}>
                {t("current_stock")}
              </th>
              <th style={{ textAlign: "right", padding: 8 }}>
                {t("counted_total")}
              </th>
              <th style={{ textAlign: "right", padding: 8 }}>
                {t("difference")}
              </th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={{ padding: 12 }}>
                  {t("loading")}
                </td>
              </tr>
            )}

            {!loading && visibleProducts.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 12,
                    color: COLORS.textDim
                  }}
                >
                  {t("no_products_found")}
                </td>
              </tr>
            )}

            {!loading && visibleProducts.map(product => {
              const isSelected =
                selected?.product_id ===
                product.product_id;

              return (
                <tr
                  key={product.product_id}
                  onClick={() =>
                    !submitting && selectProduct(product)
                  }
                  style={{
                    borderTop:
                      `1px solid ${COLORS.border}`,
                    background: isSelected
                      ? "rgba(58, 160, 255, 0.12)"
                      : "transparent",
                    cursor: submitting
                      ? "default"
                      : "pointer"
                  }}
                >
                  <td style={{ padding: 8 }}>
                    <strong>{product.name}</strong>
                  </td>
                  <td style={{ padding: 8 }}>
                    {product.location_code || "—"}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      textAlign: "right"
                    }}
                  >
                    {Number(product.stock || 0)}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      textAlign: "right"
                    }}
                  >
                    {isSelected ? (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        autoFocus
                        value={countedTotal}
                        onClick={event =>
                          event.stopPropagation()
                        }
                        onChange={event =>
                          setCountedTotal(
                            event.target.value
                          )
                        }
                        disabled={submitting}
                        aria-label={t("counted_total")}
                        style={{
                          ...input,
                          width: 100,
                          border:
                            `2px solid ${COLORS.primary}`,
                          textAlign: "right"
                        }}
                      />
                    ) : (
                      <span style={{ color: COLORS.textDim }}>
                        {t("select")}
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      textAlign: "right",
                      fontWeight: "bold",
                      color:
                        isSelected && stockDifference > 0
                          ? "#3ddc84"
                          : isSelected && stockDifference < 0
                            ? COLORS.danger
                            : COLORS.textDim
                    }}
                  >
                    {isSelected && stockDifference !== null
                      ? `${stockDifference > 0 ? "+" : ""}${stockDifference}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductSuppliers({ storeId }) {

  const { t } = useLang();

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);

  const searchProducts = async (term) => {

    if (term.length < 2) {
      setProducts([]);
      return;
    }

    try {

      const res = await apiClient.get(
        "/products/search",
        {
          params: {
            store_id: storeId,
            name: term
          }
        }
      );

      setProducts(res.data.products || []);

    } catch (err) {

      console.error(err);

    }

  };

  return (

    <div style={{ maxWidth: 500 }}>

      <h3>Product Suppliers</h3>

      {!selected && (

        <>

          <input
            style={{
              ...input,
              width: "100%",
              marginBottom: 10
            }}
            placeholder={t("search_product")}
            value={search}
            onChange={(e) => {

              setSearch(e.target.value);

              searchProducts(e.target.value);

            }}
          />

          {products.map(product => (

            <div
              key={product.product_id}
              style={resultCard()}
              onClick={() => {

                setSelected(product);

              }}
            >

              {product.name}

            </div>

          ))}

        </>

      )}

      {selected && (

        <>

          <strong>{selected.name}</strong>

          <br />
          <br />

          <button
            style={btnSecondary}
            onClick={() => {

              setSelected(null);

              setSearch("");

              setProducts([]);

            }}
          >

            {t("back")}

          </button>

        </>

      )}

    </div>

  );

}
export default ProductManagement;
