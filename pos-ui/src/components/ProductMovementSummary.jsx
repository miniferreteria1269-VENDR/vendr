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
  btnPrimary
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

  const invalidDateRange =
    !startDate ||
    !endDate ||
    startDate > endDate;

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
      const response =
        await apiClient.get(
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
        );

      setRows(
        response.data.summary || []
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
                  {row.product}
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

                <td style={cell}>
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
    </div>
  );
}

export default ProductMovementSummary;
