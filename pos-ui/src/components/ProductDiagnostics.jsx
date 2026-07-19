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
  { key: "all", labelKey: "all" },
  { key: "price_below_cost", labelKey: "price_less_than_cost" },
  { key: "zero_cost", labelKey: "cost_equals_zero" },
  { key: "zero_price", labelKey: "price_equals_zero" },
  { key: "negative_stock", labelKey: "negative_stock" },
  { key: "lst_unreviewed", labelKey: "lst_review_filter" },
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
  const [newLST, setNewLST] = useState(0);
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
        t("could_not_load_diagnostics");

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
      lst_unreviewed: 0,
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
        return t("price_below_cost");
      case "zero_cost":
        return t("cost_is_zero");
      case "zero_price":
        return t("price_is_zero");
      case "negative_stock":
        return t("stock_is_negative");
      case "lst_unreviewed":
        return t("lst_requires_review");
      default:
        return type;
    }
  };

  const recommendedActionLabel = (issueType) => {
    switch (issueType) {
      case "price_below_cost":
        return t("review_cost_and_sale_price");
      case "zero_cost":
        return t("enter_product_cost");
      case "zero_price":
        return t("enter_sale_price");
      case "negative_stock":
        return t("verify_physical_stock");
      case "lst_unreviewed":
        return t("review_reorder_threshold");
      default:
        return t("review_product");
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
      setNote(t("verify_physical_stock"));
    }

    if (issue.recommended_action === "review_lst") {
      setNewLST(Number(product.low_stock_threshold ?? 0));
    }
  };

  const exportAllIssues = () => {
    if (products.length === 0) {
      alert(t("no_issues_to_export"));
      return;
    }

    // Create one spreadsheet row for every individual issue.
    const exportRows = products.flatMap((product) =>
      (product.issues || []).map((issue) => ({
        [t("product_id")]: product.product_id,
        [t("product")]: product.name,
        [t("issue")]: issueLabel(issue.type),
        [t("stock")]: Number(product.stock || 0),
        [t("cost")]: Number(product.cost || 0),
        [t("price")]: Number(product.price || 0),
        [t("recommended_action")]: recommendedActionLabel(issue.type),
        [t("reviewed")]: "",
        [t("notes")]: "",
      }))
    );

    const exportedAt = new Date();
    const dateStamp = exportedAt.toISOString().slice(0, 10);

    // Create the summary section at the top of the sheet.
    const worksheet = XLSX.utils.aoa_to_sheet([
      [t("vendr_product_diagnostics")],
      [t("store_id"), storeId],
      [t("exported"), exportedAt.toLocaleString()],
      [t("products_requiring_attention"), products.length],
      [t("total_issues"), exportRows.length],
      [],
    ]);

    // Add the diagnostic table beginning on row 7.
    XLSX.utils.sheet_add_json(worksheet, exportRows, {
      origin: "A7",
      skipHeader: false,
    });

    // Set practical column widths for Excel and printing.
    worksheet["!cols"] = [
      { wch: 12 }, // Product ID
      { wch: 42 }, // Product
      { wch: 22 }, // Issue
      { wch: 10 }, // Stock
      { wch: 12 }, // Cost
      { wch: 12 }, // Price
      { wch: 28 }, // Recommended Action
      { wch: 12 }, // Verified
      { wch: 36 }, // Notes
    ];

    // Enable Excel filtering on the exported table.
    worksheet["!autofilter"] = {
      ref: `A7:I${exportRows.length + 7}`,
    };

    // Format Cost and Price as currency.
    for (let row = 8; row <= exportRows.length + 7; row += 1) {
      const costCell = worksheet[`E${row}`];
      const priceCell = worksheet[`F${row}`];

      if (costCell) {
        costCell.z = "$0.00";
      }

      if (priceCell) {
        priceCell.z = "$0.00";
      }
    }

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      t("product_diagnostics").slice(0, 31)
    );

    XLSX.writeFile(
      workbook,
      `VENDR_Diagnostics_Store_${storeId}_${dateStamp}.xlsx`
    );
  };  
  const closeModal = (force = false) => {
    if (saving && !force) return;

    setSelectedProduct(null);
    setSelectedIssue(null);
    setNewCost("");
    setNewPrice("");
    setCorrectStock(0);
    setNewLST(0);
    setNote("");
  };

  const showSuccess = () => {
    setSuccessMessage(t("issue_fixed"));

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
        t("invalid_cost_price")
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

      closeModal(true);
      showSuccess();

      // Refresh while preserving the current filter and search.
      await loadDiagnostics();
    } catch (err) {
      console.error("Could not correct product price:", err);

      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        t("could_not_apply_price_correction");

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
        t("invalid_correct_stock")
      );
      return;
    }

    const difference = parsedCorrectStock - currentStock;

    if (difference === 0) {
      setErrorMessage(
        t("same_stock_value")
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
          `${t("verify_physical_stock")}: ${currentStock} → ${parsedCorrectStock}.`,
      });

      closeModal(true);
      showSuccess();

      // Refresh while preserving the current filter and search.
      await loadDiagnostics();
    } catch (err) {
      console.error("Could not correct negative stock:", err);

      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        t("could_not_apply_stock_correction");

      setErrorMessage(String(detail));
    } finally {
      setSaving(false);
    }
  };

  const submitLSTReview = async () => {
    const parsedLST = Number(newLST);

    if (
      !Number.isFinite(parsedLST) ||
      parsedLST < 0 ||
      !Number.isInteger(parsedLST)
    ) {
      setErrorMessage(t("invalid_lst"));
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      await axios.post(`${API}/review-lst`, {
        store_id: storeId,
        product_id: selectedProduct.product_id,
        low_stock_threshold: parsedLST,
      });

      closeModal(true);
      showSuccess();

      // Refresh while preserving the current filter and search.
      await loadDiagnostics();
    } catch (err) {
      console.error("Could not review low stock threshold:", err);

      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        t("could_not_apply_lst_review");

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
            {products.length} {t("products_need_attention")} ·{" "}
            {issueCounts.all} {t("total_issues")}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={exportAllIssues}
            style={btnPrimary}
            disabled={loading || products.length === 0}
          >
            {t("export_all_issues")}
          </button>

          <button
            type="button"
            onClick={loadDiagnostics}
            style={btnSecondary}
            disabled={loading}
          >
            {loading ? t("loading") : t("refresh")}
          </button>
        </div>
      </div>
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
        placeholder={t("search_product_or_id")}
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
            <span>{t(filter.labelKey)}</span>

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
        {t("showing_products_with_issues")
          .replace("{products}", visibleProducts.length)
          .replace("{issues}", visibleIssueCount)}
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
            {t("no_diagnostic_issues")}
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
                    {t("product_id")}: {product.product_id}
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
                    {t("stock")}:{" "}
                    <strong style={{ color: COLORS.text }}>
                      {product.stock}
                    </strong>
                  </span>

                  <span>
                    {t("cost")}:{" "}
                    <strong style={{ color: COLORS.text }}>
                      ${Number(product.cost || 0).toFixed(2)}
                    </strong>
                  </span>

                  <span>
                    {t("price")}:{" "}
                    <strong style={{ color: COLORS.text }}>
                      ${Number(product.price || 0).toFixed(2)}
                    </strong>
                  </span>

                  <span>
                    {t("low_stock")}:{" "}
                    <strong style={{ color: COLORS.text }}>
                      {Number(product.low_stock_threshold || 0)}
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
                    {t("review")}
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
              {t("review_diagnostic_issue")}
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
                {t("product_id")}: {selectedProduct.product_id}
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
                  {t("cost")}
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
                  {t("price")}
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
                    {t("price_still_below_cost")}
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
                    {t("cancel")}
                  </button>

                  <button
                    type="button"
                    onClick={submitPriceCorrection}
                    style={btnPrimary}
                    disabled={saving}
                  >
                    {saving
                      ? t("saving")
                      : t("apply_price_change")}
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
                  {t("current_stock")}:{" "}
                  <strong>{selectedProduct.stock}</strong>
                </div>

                <label
                  style={{
                    display: "block",
                    marginBottom: 5,
                    color: COLORS.textDim,
                  }}
                >
                  {t("correct_physical_stock")}
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
                  {t("note")}
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
                  {t("adjustment")}:{" "}
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
                    {t("cancel")}
                  </button>

                  <button
                    type="button"
                    onClick={submitStockCorrection}
                    style={btnPrimary}
                    disabled={saving}
                  >
                    {saving
                      ? t("saving")
                      : t("apply_stock_adjustment")}
                  </button>
                </div>
              </>
            )}

            {selectedIssue.recommended_action ===
              "review_lst" && (
              <>
                <div
                  style={{
                    padding: 10,
                    marginBottom: 12,
                    borderRadius: 7,
                    background: COLORS.panelAlt,
                  }}
                >
                  {t("current_lst")}:{" "}
                  <strong>
                    {Number(selectedProduct.low_stock_threshold || 0)}
                  </strong>
                </div>

                <label
                  style={{
                    display: "block",
                    marginBottom: 5,
                    color: COLORS.textDim,
                  }}
                >
                  {t("confirmed_lst")}
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newLST}
                  onChange={(event) =>
                    setNewLST(event.target.value)
                  }
                  style={{
                    ...input,
                    width: "100%",
                    boxSizing: "border-box",
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
                  {t("review_reorder_threshold")}
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
                    {t("cancel")}
                  </button>

                  <button
                    type="button"
                    onClick={submitLSTReview}
                    style={btnPrimary}
                    disabled={saving}
                  >
                    {saving
                      ? t("saving")
                      : t("confirm_lst")}
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
