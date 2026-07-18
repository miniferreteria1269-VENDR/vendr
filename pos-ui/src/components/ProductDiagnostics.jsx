import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { useLang } from "../LanguageContext";
import {
  COLORS,
  card,
  input,
  btnPrimary,
  btnSecondary,
} from "../uiStyles";

const API = "https://vendr-onkr.onrender.com";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "price_below_cost", label: "Price < Cost" },
  { key: "zero_cost", label: "Cost = 0" },
  { key: "zero_price", label: "Price = 0" },
  { key: "negative_stock", label: "Negative Stock" },
];

function ProductDiagnostics({ storeId }) {
  const { t } = useLang();

  const [products, setProducts] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);

  const [newCost, setNewCost] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [correctStock, setCorrectStock] = useState(0);
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadDiagnostics = async () => {
    if (!storeId) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await axios.get(`${API}/product-diagnostics`, {
        params: {
          store_id: storeId,
        },
      });

      setProducts(res.data.products || []);
    } catch (err) {
      console.error("Could not load product diagnostics:", err);

      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        "Could not load product diagnostics.";

      setErrorMessage(String(detail));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, [storeId]);

  const issueCounts = useMemo(() => {
    const counts = {
      all: 0,
      price_below_cost: 0,
      zero_cost: 0,
      zero_price: 0,
      negative_stock: 0,
    };

    products.forEach((product) => {
      product.issues.forEach((issue) => {
        counts.all += 1;

        if (counts[issue.type] !== undefined) {
          counts[issue.type] += 1;
        }
      });
    });

    return counts;
  }, [products]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        String(product.product_id).includes(normalizedSearch);

      const matchesFilter =
        activeFilter === "all" ||
        product.issues.some(
          (issue) => issue.type === activeFilter
        );

      return matchesSearch && matchesFilter;
    });
  }, [products, activeFilter, searchTerm]);

  const visibleIssueCount = useMemo(() => {
    if (activeFilter === "all") {
      return visibleProducts.reduce(
        (sum, product) => sum + product.issues.length,
        0
      );
    }

    return visibleProducts.reduce(
      (sum, product) =>
        sum +
        product.issues.filter(
          (issue) => issue.type === activeFilter
        ).length,
      0
    );
  }, [visibleProducts, activeFilter]);

  const issueLabel = (type) => {
    switch (type) {
      case "price_below_cost":
        return "Price below cost";
      case "zero_cost":
        return "Cost is zero";
      case "zero_price":
        return "Price is zero";
      case "negative_stock":
        return "Stock is negative";
      default:
        return type;
    }
  };

  const openReview = (product, issue) => {
    setSelectedProduct(product);
    setSelectedIssue(issue);
    setErrorMessage("");

    if (issue.recommended_action === "price_change") {
      setNewCost(String(product.cost ?? 0));
      setNewPrice(String(product.price ?? 0));
    }

    if (issue.recommended_action === "stock_adjustment") {
      setCorrectStock(0);
      setNote("Diagnostic correction: physical stock verification.");
    }
  };

  const closeModal = () => {
    if (saving) return;

    setSelectedProduct(null);
    setSelectedIssue(null);
    setNewCost("");
    setNewPrice("");
    setCorrectStock(0);
    setNote("");
  };

  const showSuccess = () => {
    setSuccessMessage("Issue Fixed!");

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 2500);
  };

  const submitPriceCorrection = async () => {
    const parsedCost = Number(newCost);
    const parsedPrice = Number(newPrice);

    if (
      !Number.isFinite(parsedCost) ||
      !Number.isFinite(parsedPrice) ||
      parsedCost < 0 ||
      parsedPrice < 0
    ) {
      setErrorMessage(
        "Cost and price must be valid numbers equal to or greater than zero."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      await axios.post(`${API}/price-change`, null, {
        params: {
          store_id: storeId,
          product_id: selectedProduct.product_id,
          cost: parsedCost,
          price: parsedPrice,
        },
      });

      closeModal();
      showSuccess();

      // Refresh while preserving the current filter and search.
      await loadDiagnostics();
    } catch (err) {
      console.error("Could not correct product price:", err);

      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        "Could not apply the price correction.";

      setErrorMessage(String(detail));
    } finally {
      setSaving(false);
    }
  };

  const submitStockCorrection = async () => {
    const parsedCorrectStock = Number(correctStock);
    const currentStock = Number(selectedProduct.stock || 0);

    if (
      !Number.isFinite(parsedCorrectStock) ||
      parsedCorrectStock < 0
    ) {
      setErrorMessage(
        "Correct stock must be a valid number equal to or greater than zero."
      );
      return;
    }

    const difference = parsedCorrectStock - currentStock;

    if (difference === 0) {
      setErrorMessage(
        "The corrected stock is the same as the current stock."
      );
      return;
    }

    const direction =
      difference > 0 ? "positive" : "negative";

    setSaving(true);
    setErrorMessage("");

    try {
      await axios.post(`${API}/stock-adjustment`, {
        store_id: storeId,
        product_id: selectedProduct.product_id,
        quantity: Math.abs(difference),
        direction,
        reason: "diagnostic_correction",
        note:
          note.trim() ||
          `Diagnostic correction. Stock changed from ${currentStock} to ${parsedCorrectStock}.`,
      });

      closeModal();
      showSuccess();

      // Refresh while preserving the current filter and search.
      await loadDiagnostics();
    } catch (err) {
      console.error("Could not correct negative stock:", err);

      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        "Could not apply the stock correction.";

      setErrorMessage(String(detail));
    } finally {
      setSaving(false);
    }
  };

  const modalOverlay = {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background: "rgba(0, 0, 0, 0.72)",
  };

  const modalCard = {
    ...card,
    width: "min(520px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 18px 55px rgba(0, 0, 0, 0.45)",
  };

  const diagnosticCard = {
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  };

  const filterButton = (filterKey) => ({
    ...(activeFilter === filterKey
      ? btnPrimary
      : btnSecondary),
    display: "flex",
    alignItems: "center",
    gap: 6,
  });

  const badge = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 24,
    height: 20,
    padding: "0 6px",
    borderRadius: 10,
    fontSize: 12,
    background: "rgba(255,255,255,0.12)",
  };

  return (
    <div
      style={{
        ...card,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>
            {t("product_diagnostics") ||
              "Product Diagnostics"}
          </h3>

          <div
            style={{
              color: COLORS.textDim,
              marginTop: 5,
              fontSize: 13,
            }}
          >
            {products.length} products need attention ·{" "}
            {issueCounts.all} total issues
          </div>
        </div>

        <button
          type="button"
          onClick={loadDiagnostics}
          style={btnSecondary}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <button
          onClick={() => console.log(XLSX.version)}
      >
          Test XLSX
      </button>
      {successMessage && (
        <div
          style={{
            padding: 12,
            marginBottom: 12,
            borderRadius: 8,
            background: "rgba(47, 201, 128, 0.16)",
            border: "1px solid rgba(47, 201, 128, 0.4)",
            color: COLORS.primary,
            fontWeight: "bold",
          }}
        >
          ✓ {successMessage}
        </div>
      )}

      {errorMessage && !selectedProduct && (
        <div
          style={{
            padding: 12,
            marginBottom: 12,
            borderRadius: 8,
            background: "rgba(255, 92, 92, 0.12)",
            border: "1px solid rgba(255, 92, 92, 0.35)",
            color: COLORS.danger || "#ff5c5c",
          }}
        >
          {errorMessage}
        </div>
      )}

      <input
        value={searchTerm}
        onChange={(event) =>
          setSearchTerm(event.target.value)
        }
        placeholder="Search product name or ID..."
        style={{
          ...input,
          width: "100%",
          boxSizing: "border-box",
          marginBottom: 12,
        }}
      />

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        {FILTERS.map((filter) => (
          <button
            type="button"
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            style={filterButton(filter.key)}
          >
            <span>{filter.label}</span>

            <span style={badge}>
              {issueCounts[filter.key] || 0}
            </span>
          </button>
        ))}
      </div>

      <div
        style={{
          color: COLORS.textDim,
          fontSize: 13,
          marginBottom: 10,
        }}
      >
        Showing {visibleProducts.length} products with{" "}
        {visibleIssueCount} matching issues
      </div>

      <div
        style={{
          overflowY: "auto",
          minHeight: 0,
          maxHeight: "65vh",
          paddingRight: 4,
        }}
      >
        {!loading && visibleProducts.length === 0 && (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              color: COLORS.textDim,
            }}
          >
            No diagnostic issues match this view.
          </div>
        )}

        {visibleProducts.map((product) => {
          const visibleIssues =
            activeFilter === "all"
              ? product.issues
              : product.issues.filter(
                  (issue) => issue.type === activeFilter
                );

          return (
            <div
              key={product.product_id}
              style={diagnosticCard}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    {product.name}
                  </div>

                  <div
                    style={{
                      color: COLORS.textDim,
                      fontSize: 12,
                      marginTop: 3,
                    }}
                  >
                    Product ID: {product.product_id}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    color: COLORS.textDim,
                    fontSize: 13,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    Stock:{" "}
                    <strong style={{ color: COLORS.text }}>
                      {product.stock}
                    </strong>
                  </span>

                  <span>
                    Cost:{" "}
                    <strong style={{ color: COLORS.text }}>
                      ${Number(product.cost || 0).toFixed(2)}
                    </strong>
                  </span>

                  <span>
                    Price:{" "}
                    <strong style={{ color: COLORS.text }}>
                      ${Number(product.price || 0).toFixed(2)}
                    </strong>
                  </span>
                </div>
              </div>

              {visibleIssues.map((issue) => (
                <div
                  key={issue.type}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderTop: `1px solid ${COLORS.border}`,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <span
                      style={{
                        color: "#f0a23b",
                        marginRight: 7,
                      }}
                    >
                      ⚠
                    </span>

                    <strong>
                      {issueLabel(issue.type)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openReview(product, issue)
                    }
                    style={btnPrimary}
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {selectedProduct && selectedIssue && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{ marginTop: 0 }}>
              Review Diagnostic Issue
            </h3>

            <div
              style={{
                marginBottom: 14,
                paddingBottom: 12,
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: 17,
                }}
              >
                {selectedProduct.name}
              </div>

              <div
                style={{
                  color: COLORS.textDim,
                  marginTop: 4,
                }}
              >
                Product ID: {selectedProduct.product_id}
              </div>

              <div
                style={{
                  color: "#f0a23b",
                  marginTop: 8,
                  fontWeight: "bold",
                }}
              >
                ⚠ {issueLabel(selectedIssue.type)}
              </div>
            </div>

            {errorMessage && (
              <div
                style={{
                  padding: 10,
                  marginBottom: 12,
                  borderRadius: 7,
                  background: "rgba(255, 92, 92, 0.12)",
                  color: COLORS.danger || "#ff5c5c",
                }}
              >
                {errorMessage}
              </div>
            )}

            {selectedIssue.recommended_action ===
              "price_change" && (
              <>
                <label
                  style={{
                    display: "block",
                    marginBottom: 5,
                    color: COLORS.textDim,
                  }}
                >
                  Cost
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newCost}
                  onChange={(event) =>
                    setNewCost(event.target.value)
                  }
                  style={{
                    ...input,
                    width: "100%",
                    boxSizing: "border-box",
                    marginBottom: 12,
                  }}
                />

                <label
                  style={{
                    display: "block",
                    marginBottom: 5,
                    color: COLORS.textDim,
                  }}
                >
                  Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPrice}
                  onChange={(event) =>
                    setNewPrice(event.target.value)
                  }
                  style={{
                    ...input,
                    width: "100%",
                    boxSizing: "border-box",
                    marginBottom: 14,
                  }}
                />

                {Number(newPrice) < Number(newCost) && (
                  <div
                    style={{
                      color: "#f0a23b",
                      marginBottom: 14,
                      fontSize: 13,
                    }}
                  >
                    Warning: the entered price is still below
                    cost.
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeModal}
                    style={btnSecondary}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={submitPriceCorrection}
                    style={btnPrimary}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Apply Price Change"}
                  </button>
                </div>
              </>
            )}

            {selectedIssue.recommended_action ===
              "stock_adjustment" && (
              <>
                <div
                  style={{
                    padding: 10,
                    marginBottom: 12,
                    borderRadius: 7,
                    background: COLORS.panelAlt,
                  }}
                >
                  Current stock:{" "}
                  <strong>{selectedProduct.stock}</strong>
                </div>

                <label
                  style={{
                    display: "block",
                    marginBottom: 5,
                    color: COLORS.textDim,
                  }}
                >
                  Correct physical stock
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={correctStock}
                  onChange={(event) =>
                    setCorrectStock(event.target.value)
                  }
                  style={{
                    ...input,
                    width: "100%",
                    boxSizing: "border-box",
                    marginBottom: 12,
                  }}
                />

                <label
                  style={{
                    display: "block",
                    marginBottom: 5,
                    color: COLORS.textDim,
                  }}
                >
                  Note
                </label>

                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  style={{
                    ...input,
                    width: "100%",
                    boxSizing: "border-box",
                    minHeight: 90,
                    resize: "vertical",
                    marginBottom: 14,
                  }}
                />

                <div
                  style={{
                    color: COLORS.textDim,
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  Adjustment:{" "}
                  {Number(correctStock) -
                    Number(selectedProduct.stock || 0) >
                  0
                    ? "+"
                    : ""}
                  {Number(correctStock) -
                    Number(selectedProduct.stock || 0)}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeModal}
                    style={btnSecondary}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={submitStockCorrection}
                    style={btnPrimary}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Apply Stock Adjustment"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDiagnostics;
