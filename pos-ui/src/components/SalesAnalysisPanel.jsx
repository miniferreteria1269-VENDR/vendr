import {
  useEffect,
  useState
} from "react";

import {
  useLang
} from "../LanguageContext";

import apiClient from "../apiClient";

import {
  COLORS,
  card,
  btnPrimary,
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
        padding: 16
      }}
    >
      <h2
        style={{
          marginBottom: 12
        }}
      >
        {t("sales_analysis")}
      </h2>

      {/* DATE RANGE */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 20,
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
            "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
          marginBottom: 20
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
            "repeat(auto-fit,minmax(250px,1fr))",
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
        borderRadius: 12,
        padding: 14
      }}
    >
      <div
        style={{
          fontSize: 12,
          color:
            COLORS.textDim
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 20,
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
    <div style={card}>
      <h4
        style={{
          marginBottom: 10
        }}
      >
        {title}
      </h4>

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
              gap: 12
            }}
          >
            <span>
              {product.name}
            </span>

            <span
              style={{
                color:
                  COLORS.primary,
                whiteSpace:
                  "nowrap"
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
  );
}

export default SalesAnalysisPanel;
