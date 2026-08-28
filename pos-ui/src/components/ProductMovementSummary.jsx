import {
  useState
} from "react";

import apiClient from "../apiClient";

import {
  useLang
} from "../LanguageContext";

import {
  COLORS,
  card,
  input,
  btnPrimary,
  btnSecondary
} from "../uiStyles";

import ProductMovementOptions from "./ProductMovementOptions";

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

function ProductMovementSummary({
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
    rows,
    setRows
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
    optionsProduct,
    setOptionsProduct
  ] = useState(null);

  const invalidDateRange =
    !startDate ||
    !endDate ||
    startDate > endDate;

  const rangeIncludesToday =
    Boolean(startDate && endDate) &&
    startDate <= today &&
    today <= endDate;

  const updateRowThreshold = (productId, threshold) => {
    setRows(previous =>
      previous.map(row =>
        row.product_id === productId
          ? { ...row, low_stock_threshold: threshold }
          : row
      )
    );

    setOptionsProduct(previous =>
      previous?.product_id === productId
        ? { ...previous, low_stock_threshold: threshold }
        : previous
    );
  };

  const loadReport = async () => {
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
      const [response, productsResponse] =
        await Promise.all([
          apiClient.get(
            "/product-movement-summary",
            {
              params: {
                store_id:
                  storeId,

                start_date:
                  startDate,

                end_date:
                  endDate
              }
            }
          ),
          apiClient.get("/products", {
            params: {
              store_id: storeId,
              include_archived: true
            }
          })
        ]);

      const currentProducts = new Map(
        (productsResponse.data.products || []).map(product => [
          product.product_id,
          product
        ])
      );

      setRows(
        (response.data.summary || []).map(row => {
          const currentProduct = currentProducts.get(row.product_id);

          return {
            ...row,
            current_stock: Number(currentProduct?.stock || 0),
            low_stock_threshold: Number(
              currentProduct?.low_stock_threshold || 0
            ),
            has_current_product: Boolean(currentProduct),
            is_active: currentProduct?.is_active !== false
          };
        })
      );
    } catch (error) {
      console.error(
        "COULD NOT LOAD PRODUCT MOVEMENT SUMMARY:",
        error
      );

      const detail =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        error.message ||
        "Could not load product movement summary.";

      setErrorMessage(
        String(detail)
      );

      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const cell = {
    padding: 8,
    borderBottom:
      `1px solid ${COLORS.border}`,
    textAlign: "right",
    whiteSpace: "nowrap",
    background:
      COLORS.panel
  };

  const head = {
    ...cell,
    position: "sticky",
    top: 0,
    zIndex: 3,
    color:
      COLORS.textDim,
    fontWeight: "bold",
    background:
      COLORS.panelAlt ||
      COLORS.panel
  };

  const productHead = {
    ...head,
    left: 0,
    zIndex: 5,
    textAlign: "left",
    minWidth: 260
  };

  const productCell = {
    ...cell,
    position: "sticky",
    left: 0,
    zIndex: 2,
    textAlign: "left",
    minWidth: 260,
    background:
      COLORS.panel
  };

  const tableContainer = {
    maxHeight: "65vh",
    overflowY: "auto",
    overflowX: "auto",
    border:
      `1px solid ${COLORS.border}`,
    borderRadius: 8
  };

  return (
    <div style={card}>
      <h3>
        {t(
          "product_movement_summary"
        ) ||
          "Product Movement Summary"}
      </h3>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center"
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
          style={{
            ...input,
            minHeight: 38
          }}
        />

        <input
          type="date"
          value={endDate}
          onChange={event =>
            setEndDate(
              event.target.value
            )
          }
          style={{
            ...input,
            minHeight: 38
          }}
        />

        <button
          type="button"
          onClick={loadReport}
          style={{
            ...btnPrimary,
            minHeight: 38,
            padding: "8px 16px",
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
          disabled={
            loading ||
            invalidDateRange
          }
        >
          {loading
            ? t("loading") ||
              "Loading..."
            : t("apply") ||
              "Apply"}
        </button>
      </div>

      {errorMessage && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 6,
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

      <div style={tableContainer}>
        <table
          style={{
            width: "100%",
            borderCollapse:
              "separate",
            borderSpacing: 0,
            minWidth: 1100
          }}
        >
          <thead>
            <tr>
              <th style={productHead}>
                {t("product") ||
                  "Product"}
              </th>

              <th style={head}>
                {t("initial") ||
                  "Initial"}
              </th>

              <th style={head}>
                {t("purchase") ||
                  "Purchase"}
              </th>

              <th style={head}>
                {t("sale") ||
                  "Sale"}
              </th>

              <th style={head}>
                {t("loss") ||
                  "Loss"}
              </th>

              <th style={head}>
                {t("transfer_in") ||
                  "Transfer In"}
              </th>

              <th style={head}>
                {t("transfer_out") ||
                  "Transfer Out"}
              </th>

              <th style={head}>
                {t(
                  "adjustment_positive"
                ) || "Adj +"}
              </th>

              <th style={head}>
                {t(
                  "adjustment_negative"
                ) || "Adj -"}
              </th>

              <th style={head}>
                {t("final") ||
                  "Final"}
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map(row => (
              <tr
                key={row.product_id}
              >
                <td style={productCell}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8
                    }}
                  >
                    <span>{row.product}</span>

                    <button
                      type="button"
                      onClick={() => setOptionsProduct(row)}
                      style={{
                        ...btnSecondary,
                        flex: "0 0 auto",
                        padding: "4px 8px",
                        fontSize: 12
                      }}
                    >
                      {t("options") || "Options"}
                    </button>
                  </div>
                </td>

                <td style={cell}>
                  {row.initial_stock}
                </td>

                <td style={cell}>
                  {row.purchase}
                </td>

                <td style={cell}>
                  {row.sale}
                </td>

                <td style={cell}>
                  {row.loss}
                </td>

                <td style={cell}>
                  {row.transfer_in}
                </td>

                <td style={cell}>
                  {row.transfer_out}
                </td>

                <td style={cell}>
                  {
                    row.adjustment_positive
                  }
                </td>

                <td style={cell}>
                  {
                    row.adjustment_negative
                  }
                </td>

                <td
                  title={
                    rangeIncludesToday &&
                    row.has_current_product &&
                    Number(row.final_stock) <=
                      Number(row.low_stock_threshold)
                      ? `${t("final")}: ${row.final_stock} · ${t("low_stock_threshold")}: ${row.low_stock_threshold}`
                      : undefined
                  }
                  style={{
                    ...cell,
                    color:
                      rangeIncludesToday &&
                      row.has_current_product &&
                      Number(row.final_stock) <=
                        Number(row.low_stock_threshold)
                        ? "#f5c542"
                        : undefined,
                    fontWeight:
                      rangeIncludesToday &&
                      row.has_current_product &&
                      Number(row.final_stock) <=
                        Number(row.low_stock_threshold)
                        ? 700
                        : undefined
                  }}
                >
                  {row.final_stock}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading &&
          rows.length === 0 &&
          !errorMessage && (
            <p
              style={{
                color:
                  COLORS.textDim,
                padding: 12,
                margin: 0
              }}
            >
              {t(
                "no_product_movement"
              ) ||
                "No product movement found for this date range."}
            </p>
          )}
      </div>

      {optionsProduct && (
        <ProductMovementOptions
          product={optionsProduct}
          storeId={storeId}
          onClose={() => setOptionsProduct(null)}
          onThresholdChanged={updateRowThreshold}
        />
      )}
    </div>
  );
}

export default ProductMovementSummary;
