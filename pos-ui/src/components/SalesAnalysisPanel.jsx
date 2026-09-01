import {
  useEffect,
  useState
} from "react";

import {
  useLang
} from "../LanguageContext";

import apiClient from "../apiClient";

import AIWeeklyBriefPanel from "./AIWeeklyBriefPanel";

import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  input
} from "../uiStyles";

const getLocalDateValue = () => {
  const now = new Date();

  const localDate = new Date(
    now.getTime() -
    now.getTimezoneOffset() * 60000
  );

  return localDate
    .toISOString()
    .slice(0, 10);
};

function SalesAnalysisPanel({
  storeId
}) {
  const { t } = useLang();

  const today =
    getLocalDateValue();

  const [
    startDate,
    setStartDate
  ] = useState(today);

  const [
    endDate,
    setEndDate
  ] = useState(today);

  const [
    summary,
    setSummary
  ] = useState({});

  const [
    topRevenue,
    setTopRevenue
  ] = useState([]);

  const [
    topProfit,
    setTopProfit
  ] = useState([]);

  const [
    topVolume,
    setTopVolume
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage
  ] = useState("");

  const [
    analysisView,
    setAnalysisView
  ] = useState("sales");

  const invalidDateRange =
    !startDate ||
    !endDate ||
    startDate > endDate;

  const loadAnalysis = async () => {
    if (
      !storeId ||
      invalidDateRange ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response =
        await apiClient.get(
          "/sales-analysis",
          {
            params: {
              store_id: storeId,
              start_date: startDate,
              end_date: endDate
            }
          }
        );

      setSummary(
        response.data.summary || {}
      );

      setTopRevenue(
        response.data
          .top_revenue_products || []
      );

      setTopProfit(
        response.data
          .top_profit_products || []
      );

      setTopVolume(
        response.data
          .top_volume_products || []
      );
    } catch (error) {
      console.error(
        "COULD NOT LOAD SALES ANALYSIS:",
        error
      );

      const detail =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        error.message ||
        "Could not load sales analysis.";

      setErrorMessage(
        String(detail)
      );

      setSummary({});
      setTopRevenue([]);
      setTopProfit([]);
      setTopVolume([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      loadAnalysis();
    }
  }, [storeId]);

  const formatMoney = value =>
    Number(
      value || 0
    ).toFixed(2);

  return (
    <div
      style={{
        padding: 16,
        position: "absolute",
        inset: 0,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box"
      }}
    >
      <h2
        style={{
          marginBottom: 12
        }}
      >
        {analysisView === "weekly"
          ? t("weekly_brief")
          : t("sales_analysis")}
      </h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16
        }}
      >
        <button
          type="button"
          onClick={() =>
            setAnalysisView("sales")
          }
          style={
            analysisView === "sales"
              ? btnPrimary
              : btnSecondary
          }
        >
          {t("sales_analysis")}
        </button>

        <button
          type="button"
          onClick={() =>
            setAnalysisView("weekly")
          }
          style={
            analysisView === "weekly"
              ? btnPrimary
              : btnSecondary
          }
        >
          {t("weekly_brief")}
        </button>
      </div>

      {analysisView === "weekly" ? (
        <div
          style={{
            flex: "1 1 0",
            minHeight: 0,
            position: "relative",
            overflow: "hidden"
          }}
        >
          <AIWeeklyBriefPanel
            storeId={storeId}
          />
        </div>
      ) : (
        <div
          style={{
            flex: "1 1 0",
            minHeight: 0,
            overflowY: "auto",
            paddingRight: 4,
            scrollbarGutter: "stable"
          }}
        >

      {/* DATE RANGE */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap"
        }}
      >
        <input
          type="date"
          value={startDate}
          onChange={event =>
            setStartDate(
              event.target.value
            )
          }
          style={input}
        />

        <input
          type="date"
          value={endDate}
          onChange={event =>
            setEndDate(
              event.target.value
            )
          }
          style={input}
        />

        <button
          type="button"
          onClick={loadAnalysis}
          disabled={
            loading ||
            invalidDateRange
          }
          style={{
            ...btnPrimary,
            opacity:
              loading ||
              invalidDateRange
                ? 0.6
                : 1,
            cursor:
              loading ||
              invalidDateRange
                ? "not-allowed"
                : "pointer"
          }}
        >
          {loading
            ? t("loading") ||
              "Loading..."
            : t("apply")}
        </button>
      </div>

      {errorMessage && (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 8,
            background:
              "rgba(255, 92, 92, 0.12)",
            color:
              COLORS.danger ||
              "#ff5c5c"
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(125px, 1fr))",
          gap: 10,
          marginBottom: 16
        }}
      >
        <Metric
          label={t("revenue")}
          value={`$${formatMoney(
            summary.revenue
          )}`}
        />

        <Metric
          label={t("profit")}
          value={`$${formatMoney(
            summary.profit
          )}`}
        />

        <Metric
          label={t("tickets")}
          value={
            summary.tickets || 0
          }
        />

        <Metric
          label={t(
            "avg_daily_revenue"
          )}
          value={`$${formatMoney(
            summary.avg_daily_revenue
          )}`}
        />

        <Metric
          label={t(
            "avg_daily_profit"
          )}
          value={`$${formatMoney(
            summary.avg_daily_profit
          )}`}
        />

        <Metric
          label={t("avg_ticket")}
          value={`$${formatMoney(
            summary.avg_ticket_value
          )}`}
        />
      </div>

      {/* TOP LISTS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12
        }}
      >
        <ProductList
          title={t("top_revenue")}
          products={topRevenue}
          field="revenue"
        />

        <ProductList
          title={t("top_profit")}
          products={topProfit}
          field="profit"
        />

        <ProductList
          title={t("top_volume")}
          products={topVolume}
          field="units"
        />
      </div>
        </div>
      )}
    </div>
  );
}

// ==============================
// METRIC CARD
// ==============================
function Metric({
  label,
  value
}) {
  return (
    <div
      style={{
        background:
          COLORS.panel,
        borderRadius: 10,
        padding: "10px 12px",
        minWidth: 0
      }}
    >
      <div
        style={{
          fontSize: 11,
          lineHeight: 1.25,
          color:
            COLORS.textDim
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 2,
          fontSize: 18,
          lineHeight: 1.2,
          fontWeight: "bold",
          color:
            COLORS.primary
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ==============================
// PRODUCT LIST
// ==============================
function ProductList({
  title,
  products,
  field
}) {
  const { t } =
    useLang();

  return (
    <div
      style={{
        ...card,
        height:
          "clamp(220px, 42vh, 420px)",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}
    >
      <h4
        style={{
          marginTop: 0,
          marginBottom: 10,
          flexShrink: 0
        }}
      >
        {title}
      </h4>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          paddingRight: 3
        }}
      >
        {products.map(
          (product, index) => (
            <div
              key={
                product.product_id ??
                `${product.name}-${index}`
              }
              style={{
                background:
                  COLORS.panelAlt,
                borderRadius: 8,
                padding: 8,
                marginBottom: 6,
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "flex-start",
                gap: 12
              }}
            >
              <span
                style={{
                  minWidth: 0,
                  overflowWrap:
                    "anywhere"
                }}
              >
                {product.name}
              </span>

              <span
                style={{
                  color:
                    COLORS.primary,
                  whiteSpace:
                    "nowrap",
                  flexShrink: 0
                }}
              >
                {field === "revenue" ||
                field === "profit"
                  ? `$${Number(
                      product[field] || 0
                    ).toFixed(2)}`
                  : Number(
                      product[field] || 0
                    )}
              </span>
            </div>
          )
        )}

        {products.length === 0 && (
          <div
            style={{
              color:
                COLORS.textDim
            }}
          >
            {t("no_data")}
          </div>
        )}
      </div>
    </div>
  );
}

export default SalesAnalysisPanel;
