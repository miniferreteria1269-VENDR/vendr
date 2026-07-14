import { useState } from "react";
import axios from "axios";
import { useLang } from "../LanguageContext";
import { COLORS, card, input, btnPrimary } from "../uiStyles";

const API = "https://vendr-onkr.onrender.com";

function ProductMovementSummary({ storeId }) {
  const { t } = useLang();
  const today = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);

    try {
      const endExclusive = new Date(`${endDate}T00:00:00`);
      endExclusive.setDate(endExclusive.getDate() + 1);

      const res = await axios.get(`${API}/product-movement-summary`, {
        params: {
          store_id: storeId,
          start_date: startDate,
          end_date: endExclusive.toISOString().slice(0, 10),
        },
      });

      setRows(res.data.summary || []);
    } catch (err) {
      console.error("Could not load product movement summary:", err);
      alert("Could not load product movement summary.");
    } finally {
      setLoading(false);
    }
  };

  const cell = {
    padding: 8,
    borderBottom: `1px solid ${COLORS.border}`,
    textAlign: "right",
    whiteSpace: "nowrap",
    background: COLORS.panel,
  };

  const head = {
    ...cell,
    position: "sticky",
    top: 0,
    zIndex: 3,
    color: COLORS.textDim,
    fontWeight: "bold",
    background: COLORS.panelAlt || COLORS.panel,
  };

  const productHead = {
    ...head,
    left: 0,
    zIndex: 5,
    textAlign: "left",
    minWidth: 260,
  };

  const productCell = {
    ...cell,
    position: "sticky",
    left: 0,
    zIndex: 2,
    textAlign: "left",
    minWidth: 260,
    background: COLORS.panel,
  };

  const tableContainer = {
    maxHeight: "65vh",
    overflowY: "auto",
    overflowX: "auto",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
  };

  return (
    <div style={card}>
      <h3>
        {t("product_movement_summary") || "Product Movement Summary"}
      </h3>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={input}
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={input}
        />

        <button
          onClick={loadReport}
          style={btnPrimary}
          disabled={loading}
        >
          {loading ? "Loading..." : t("apply") || "Apply"}
        </button>
      </div>

      <div style={tableContainer}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            minWidth: 1100,
          }}
        >
          <thead>
            <tr>
              <th style={productHead}>Product</th>
              <th style={head}>Initial</th>
              <th style={head}>Purchase</th>
              <th style={head}>Sale</th>
              <th style={head}>Loss</th>
              <th style={head}>Transfer In</th>
              <th style={head}>Transfer Out</th>
              <th style={head}>Adj +</th>
              <th style={head}>Adj -</th>
              <th style={head}>Final</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.product_id}>
                <td style={productCell}>{r.product}</td>
                <td style={cell}>{r.initial_stock}</td>
                <td style={cell}>{r.purchase}</td>
                <td style={cell}>{r.sale}</td>
                <td style={cell}>{r.loss}</td>
                <td style={cell}>{r.transfer_in}</td>
                <td style={cell}>{r.transfer_out}</td>
                <td style={cell}>{r.adjustment_positive}</td>
                <td style={cell}>{r.adjustment_negative}</td>
                <td style={cell}>{r.final_stock}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p
            style={{
              color: COLORS.textDim,
              padding: 12,
              margin: 0,
            }}
          >
            No product movement found for this date range.
          </p>
        )}
      </div>
    </div>
  );
}

export default ProductMovementSummary;
