import { useEffect, useMemo, useState } from "react";
import apiClient from "../apiClient";
// All visible product-supplier text is routed through i18n.
import { useLang } from "../LanguageContext";
import {
  COLORS,
  btnPrimary,
  btnSecondary,
  btnDanger,
  input
} from "../uiStyles";

const emptyAssignment = {
  supplier_id: "",
  is_preferred: false,
  supplier_sku: "",
  last_cost: "",
  lead_time_days: ""
};

export default function ProductSupplierManagement({ storeId }) {
  const { t } = useLang();

  const text = (key, fallback, replacements = {}) => {
    const translated = t(key);
    let value =
      !translated || translated === key
        ? fallback
        : translated;

    Object.entries(replacements).forEach(
      ([placeholder, replacement]) => {
        value = value.replaceAll(
          `{${placeholder}}`,
          String(replacement)
        );
      }
    );

    return value;
  };

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [assignedSuppliers, setAssignedSuppliers] = useState([]);

  const [search, setSearch] = useState("");
  const [assignment, setAssignment] = useState(emptyAssignment);

  const [loading, setLoading] = useState(false);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removingSupplierId, setRemovingSupplierId] = useState(null);
  const [updatingPreferredSupplierId, setUpdatingPreferredSupplierId] =
    useState(null);
  const [error, setError] = useState("");
  const [panelError, setPanelError] = useState("");

  const panelBusy =
    submitting ||
    removingSupplierId !== null ||
    updatingPreferredSupplierId !== null;

  useEffect(() => {
    setSelectedProductId(null);
    setAssignedSuppliers([]);
    setAssignment(emptyAssignment);

    if (storeId) {
      loadProducts();
      loadSuppliers();
    }
  }, [storeId]);

  useEffect(() => {
    if (selectedProductId == null) {
      setAssignedSuppliers([]);
      setPanelError("");
      setAssignment(emptyAssignment);
      return;
    }

    loadAssignedSuppliers(selectedProductId);
  }, [selectedProductId]);

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.get(
        "/product-supplier-summary",
        {
          params: {
            store_id: storeId
          }
        }
      );

      setProducts(response.data.products || []);
    } catch (err) {
      console.error(
        "Failed to load product supplier summary:",
        err
      );

      setProducts([]);
      setError(
        err.response?.data?.detail ||
        text(
          "unable_load_products",
          "Unable to load products."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadSuppliers() {
    try {
      const response = await apiClient.get("/suppliers");

      const sortedSuppliers = [
        ...(response.data.suppliers || [])
      ].sort((a, b) =>
        String(a.supplier_name || "").localeCompare(
          String(b.supplier_name || ""),
          undefined,
          { sensitivity: "base" }
        )
      );

      setSuppliers(sortedSuppliers);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
      setSuppliers([]);
      setPanelError(
        err.response?.data?.detail ||
        text(
          "unable_load_suppliers",
          "Unable to load suppliers."
        )
      );
    }
  }

  async function loadAssignedSuppliers(productId) {
    setLoadingPanel(true);
    setPanelError("");
    setAssignment(emptyAssignment);

    try {
      const response = await apiClient.get(
        `/products/${productId}/suppliers`
      );

      setAssignedSuppliers(
        response.data.suppliers || []
      );
    } catch (err) {
      console.error(
        "Failed to load assigned suppliers:",
        err
      );

      setAssignedSuppliers([]);
      setPanelError(
        err.response?.data?.detail ||
        text(
          "unable_load_assigned_suppliers",
          "Unable to load assigned suppliers."
        )
      );
    } finally {
      setLoadingPanel(false);
    }
  }

  function updateAssignment(field, value) {
    setAssignment(previous => ({
      ...previous,
      [field]: value
    }));
  }

  async function assignSupplier() {
    if (!assignment.supplier_id || selectedProductId == null) {
      setPanelError(
        text(
          "select_supplier_before_saving",
          "Select a supplier before saving."
        )
      );
      return;
    }

    if (submitting) return;

    setSubmitting(true);
    setPanelError("");

    try {
      await apiClient.post(
        `/products/${selectedProductId}/suppliers`,
        {
          supplier_id: Number(assignment.supplier_id),
          is_preferred: assignment.is_preferred,
          supplier_sku:
            assignment.supplier_sku.trim() || null,
          last_cost:
            assignment.last_cost === ""
              ? null
              : Number(assignment.last_cost),
          lead_time_days:
            assignment.lead_time_days === ""
              ? null
              : Number(assignment.lead_time_days)
        }
      );

      await loadProducts();
      setSelectedProductId(null);
      setAssignedSuppliers([]);
      setAssignment(emptyAssignment);
    } catch (err) {
      console.error(
        "Failed to assign supplier to product:",
        err
      );

      setPanelError(
        err.response?.data?.detail ||
        text(
          "unable_assign_supplier",
          "Unable to assign supplier."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function removeSupplier(supplier) {
    if (selectedProductId == null || panelBusy) return;

    const confirmed = window.confirm(
      text(
        "confirm_remove_supplier_product",
        "Remove {supplier} from {product}?",
        {
          supplier: supplier.supplier_name,
          product: selectedProduct.product_name
        }
      )
    );

    if (!confirmed) return;

    setRemovingSupplierId(supplier.supplier_id);
    setPanelError("");

    try {
      await apiClient.delete(
        `/products/${selectedProductId}/suppliers/${supplier.supplier_id}`
      );

      await Promise.all([
        loadAssignedSuppliers(selectedProductId),
        loadProducts()
      ]);
    } catch (err) {
      console.error(
        "Failed to remove supplier from product:",
        err
      );

      setPanelError(
        err.response?.data?.detail ||
        text(
          "unable_remove_supplier",
          "Unable to remove supplier."
        )
      );
    } finally {
      setRemovingSupplierId(null);
    }
  }

  async function togglePreferredSupplier(supplier) {
    if (selectedProductId == null || panelBusy) return;

    const nextPreferredStatus = !supplier.is_preferred;
    const currentPreferredSupplier = assignedSuppliers.find(
      assignedSupplier => assignedSupplier.is_preferred
    );

    let confirmationMessage;

    if (!nextPreferredStatus) {
      confirmationMessage = text(
        "confirm_remove_preferred",
        "Remove preferred supplier status from {supplier}? This product will have no preferred supplier.",
        {
          supplier: supplier.supplier_name
        }
      );
    } else if (currentPreferredSupplier) {
      confirmationMessage = text(
        "confirm_change_preferred",
        "Make {supplier} the preferred supplier instead of {current_supplier}?",
        {
          supplier: supplier.supplier_name,
          current_supplier:
            currentPreferredSupplier.supplier_name
        }
      );
    } else {
      confirmationMessage = text(
        "confirm_make_preferred",
        "Make {supplier} the preferred supplier?",
        {
          supplier: supplier.supplier_name
        }
      );
    }

    if (!window.confirm(confirmationMessage)) return;

    setUpdatingPreferredSupplierId(supplier.supplier_id);
    setPanelError("");

    try {
      await apiClient.patch(
        `/products/${selectedProductId}/suppliers/${supplier.supplier_id}/preferred`,
        {
          is_preferred: nextPreferredStatus
        }
      );

      await Promise.all([
        loadAssignedSuppliers(selectedProductId),
        loadProducts()
      ]);
    } catch (err) {
      console.error(
        "Failed to update preferred supplier:",
        err
      );

      setPanelError(
        err.response?.data?.detail ||
        text(
          "unable_update_preferred",
          "Unable to update preferred supplier."
        )
      );
    } finally {
      setUpdatingPreferredSupplierId(null);
    }
  }

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return products;

    return products.filter(product =>
      String(product.product_name || "")
        .toLowerCase()
        .includes(term)
    );
  }, [products, search]);

  const selectedProduct =
    products.find(
      product => product.product_id === selectedProductId
    ) || null;

  const availableSuppliers = useMemo(() => {
    const assignedIds = new Set(
      assignedSuppliers.map(supplier =>
        String(supplier.supplier_id)
      )
    );

    return suppliers.filter(
      supplier =>
        !assignedIds.has(String(supplier.supplier_id))
    );
  }, [suppliers, assignedSuppliers]);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>
        {text(
          "product_suppliers",
          "Product Suppliers"
        )}
      </h3>

      <input
        type="text"
        placeholder={text(
          "search_products",
          "Search products..."
        )}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{
          ...input,
          width: "100%",
          maxWidth: 420,
          marginBottom: 16,
          boxSizing: "border-box"
        }}
      />

      {loading && (
        <p>
          {text(
            "loading_products",
            "Loading products..."
          )}
        </p>
      )}

      {error && (
        <p style={{ color: COLORS.danger }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <div
          style={{
            overflow: "auto",
            maxHeight: "60vh",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6
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
                <th style={headerCellStyle}>
                  {text("product", "Product")}
                </th>
                <th style={headerCellStyle}>
                  {text(
                    "preferred_supplier",
                    "Preferred Supplier"
                  )}
                </th>
                <th style={headerCellStyle}>
                  {text("last_cost", "Last Cost")}
                </th>
                <th style={headerCellStyle}>
                  {text("supply_cycle", "Supply Cycle")}
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: 16,
                      textAlign: "center"
                    }}
                  >
                    {text(
                      "no_products_found",
                      "No products found."
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const isSelected =
                    product.product_id === selectedProductId;

                  const additionalSuppliers = Math.max(
                    (product.supplier_count || 0) - 1,
                    0
                  );

                  return (
                    <tr
                      key={product.product_id}
                      onClick={() =>
                        setSelectedProductId(product.product_id)
                      }
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected
                          ? "#26354d"
                          : "transparent"
                      }}
                    >
                      <td style={bodyCellStyle}>
                        {product.product_name}
                      </td>

                      <td style={bodyCellStyle}>
                        {product.preferred_supplier_name ? (
                          <>
                            {product.preferred_supplier_name}

                            {additionalSuppliers > 0 && (
                              <span>
                                {" "}(+{additionalSuppliers})
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td style={bodyCellStyle}>
                        {product.last_cost != null
                          ? `$${Number(product.last_cost).toFixed(2)}`
                          : "—"}
                      </td>

                      <td style={bodyCellStyle}>
                        {product.supply_cycle ??
                          product.lead_time_days ??
                          "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedProduct && (
        <div
          role="presentation"
          onMouseDown={() => {
            if (!panelBusy) {
              setSelectedProductId(null);
            }
          }}
          style={modalBackdropStyle}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={text(
              "manage_suppliers_for",
              "Manage suppliers for {product}",
              {
                product: selectedProduct.product_name
              }
            )}
            onMouseDown={(event) => event.stopPropagation()}
            style={modalPanelStyle}
          >
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0 }}>
                {selectedProduct.product_name}
              </h3>

              <button
                type="button"
                aria-label={text(
                  "close_supplier_assignment",
                  "Close supplier assignment"
                )}
                onClick={() => setSelectedProductId(null)}
                disabled={panelBusy}
                style={modalCloseStyle}
              >
                ×
              </button>
            </div>

            {panelError && (
              <div
                style={{
                  background: COLORS.panelAlt,
                  color: COLORS.danger,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 12
                }}
              >
                {panelError}
              </div>
            )}

            {loadingPanel ? (
              <p>
                {text(
                  "loading_assigned_suppliers",
                  "Loading assigned suppliers..."
                )}
              </p>
            ) : (
              <>
                <h4>
                  {text(
                    "assigned_suppliers",
                    "Assigned Suppliers"
                  )}
                </h4>

                {assignedSuppliers.length === 0 ? (
                  <p style={{ color: COLORS.textDim }}>
                    {text(
                      "no_suppliers_assigned",
                      "No suppliers are assigned to this product."
                    )}
                  </p>
                ) : (
                  <div
                    style={{
                      overflowX: "auto",
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 6,
                      marginBottom: 20
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
                          <th style={headerCellStyle}>
                            {text("supplier", "Supplier")}
                          </th>
                          <th style={headerCellStyle}>
                            {text("preferred", "Preferred")}
                          </th>
                          <th style={headerCellStyle}>
                            {text("supplier_sku", "Supplier SKU")}
                          </th>
                          <th style={headerCellStyle}>
                            {text("last_cost", "Last Cost")}
                          </th>
                          <th style={headerCellStyle}>
                            {text("lead_time", "Lead Time")}
                          </th>
                          <th style={headerCellStyle}>
                            {text("actions", "Actions")}
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {assignedSuppliers.map(supplier => (
                          <tr key={supplier.supplier_id}>
                            <td style={bodyCellStyle}>
                              <strong>{supplier.supplier_name}</strong>
                              {supplier.contact_name && (
                                <div
                                  style={{
                                    color: COLORS.textDim,
                                    marginTop: 2
                                  }}
                                >
                                  {supplier.contact_name}
                                </div>
                              )}
                            </td>

                            <td style={bodyCellStyle}>
                              <button
                                type="button"
                                title={
                                  supplier.is_preferred
                                    ? text(
                                        "remove_preferred_status",
                                        "Remove preferred supplier status"
                                      )
                                    : text(
                                        "make_preferred_supplier",
                                        "Make preferred supplier"
                                      )
                                }
                                aria-label={
                                  supplier.is_preferred
                                    ? text(
                                        "preferred_supplier_aria",
                                        "{supplier} is preferred. Click to remove preferred status.",
                                        {
                                          supplier:
                                            supplier.supplier_name
                                        }
                                      )
                                    : text(
                                        "make_preferred_supplier_aria",
                                        "Make {supplier} the preferred supplier.",
                                        {
                                          supplier:
                                            supplier.supplier_name
                                        }
                                      )
                                }
                                aria-pressed={supplier.is_preferred}
                                onClick={() =>
                                  togglePreferredSupplier(supplier)
                                }
                                disabled={panelBusy}
                                style={{
                                  ...preferredStarStyle,
                                  color: supplier.is_preferred
                                    ? "#f5c542"
                                    : COLORS.textDim,
                                  opacity:
                                    panelBusy &&
                                    updatingPreferredSupplierId !== supplier.supplier_id
                                      ? 0.5
                                      : 1,
                                  cursor: panelBusy
                                    ? "default"
                                    : "pointer"
                                }}
                              >
                                {updatingPreferredSupplierId === supplier.supplier_id
                                  ? "…"
                                  : supplier.is_preferred
                                    ? "★"
                                    : "☆"}
                              </button>
                            </td>

                            <td style={bodyCellStyle}>
                              {supplier.supplier_sku || "—"}
                            </td>

                            <td style={bodyCellStyle}>
                              {supplier.last_cost != null
                                ? `$${Number(supplier.last_cost).toFixed(2)}`
                                : "—"}
                            </td>

                            <td style={bodyCellStyle}>
                              {supplier.lead_time_days != null
                                ? `${supplier.lead_time_days} ${text(
                                    "days",
                                    "days"
                                  )}`
                                : "—"}
                            </td>

                            <td style={bodyCellStyle}>
                              <button
                                type="button"
                                onClick={() => removeSupplier(supplier)}
                                disabled={panelBusy}
                                style={{
                                  ...btnDanger,
                                  opacity: panelBusy ? 0.6 : 1,
                                  cursor: panelBusy
                                    ? "default"
                                    : "pointer",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {removingSupplierId === supplier.supplier_id
                                  ? text(
                                      "removing",
                                      "Removing..."
                                    )
                                  : text(
                                      "remove",
                                      "Remove"
                                    )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h4>
                  {text(
                    "assign_supplier",
                    "Assign Supplier"
                  )}
                </h4>

                {availableSuppliers.length === 0 ? (
                  <p style={{ color: COLORS.textDim }}>
                    {suppliers.length === 0
                      ? text(
                          "no_active_suppliers",
                          "No active suppliers are available."
                        )
                      : text(
                          "all_suppliers_assigned",
                          "All active suppliers are already assigned to this product."
                        )}
                  </p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 12,
                      maxWidth: 900
                    }}
                  >
                    <label style={fieldStyle}>
                      <span>
                        {text("supplier", "Supplier")} *
                      </span>
                      <select
                        value={assignment.supplier_id}
                        onChange={(event) =>
                          updateAssignment(
                            "supplier_id",
                            event.target.value
                          )
                        }
                        disabled={panelBusy}
                        style={{ ...input, width: "100%" }}
                      >
                        <option value="">
                          {text(
                            "select_supplier",
                            "Select supplier..."
                          )}
                        </option>
                        {availableSuppliers.map(supplier => (
                          <option
                            key={supplier.supplier_id}
                            value={supplier.supplier_id}
                          >
                            {supplier.supplier_name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={fieldStyle}>
                      <span>
                        {text(
                          "supplier_sku",
                          "Supplier SKU"
                        )}
                      </span>
                      <input
                        type="text"
                        value={assignment.supplier_sku}
                        onChange={(event) =>
                          updateAssignment(
                            "supplier_sku",
                            event.target.value
                          )
                        }
                        disabled={panelBusy}
                        style={{ ...input, width: "100%" }}
                      />
                    </label>

                    <label style={fieldStyle}>
                      <span>
                        {text("last_cost", "Last Cost")}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={assignment.last_cost}
                        onChange={(event) =>
                          updateAssignment(
                            "last_cost",
                            event.target.value
                          )
                        }
                        disabled={panelBusy}
                        style={{ ...input, width: "100%" }}
                      />
                    </label>

                    <label style={fieldStyle}>
                      <span>
                        {text(
                          "lead_time_days",
                          "Lead Time (days)"
                        )}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={assignment.lead_time_days}
                        onChange={(event) =>
                          updateAssignment(
                            "lead_time_days",
                            event.target.value
                          )
                        }
                        disabled={panelBusy}
                        style={{ ...input, width: "100%" }}
                      />
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        alignSelf: "end",
                        minHeight: 38
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={assignment.is_preferred}
                        onChange={(event) =>
                          updateAssignment(
                            "is_preferred",
                            event.target.checked
                          )
                        }
                        disabled={panelBusy}
                      />
                      {text(
                        "preferred_supplier",
                        "Preferred supplier"
                      )}
                    </label>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "end"
                      }}
                    >
                      <button
                        type="button"
                        onClick={assignSupplier}
                        disabled={panelBusy}
                        style={{
                          ...btnPrimary,
                          opacity: submitting ? 0.6 : 1,
                          cursor: submitting
                            ? "default"
                            : "pointer"
                        }}
                      >
                        {submitting
                          ? text("saving", "Saving...")
                          : text(
                              "assign_supplier",
                              "Assign Supplier"
                            )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAssignment(emptyAssignment);
                          setPanelError("");
                        }}
                        disabled={panelBusy}
                        style={btnSecondary}
                      >
                        {text("clear", "Clear")}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const headerCellStyle = {
  padding: "10px 12px",
  textAlign: "left",
  borderBottom: `1px solid ${COLORS.border}`,
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 1,
  background: COLORS.panelAlt
};

const bodyCellStyle = {
  padding: "10px 12px",
  borderBottom: `1px solid ${COLORS.border}`
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 5
};

const preferredStarStyle = {
  minWidth: 32,
  padding: "0 4px",
  border: "none",
  background: "transparent",
  fontSize: 25,
  lineHeight: 1,
  textAlign: "center"
};

const modalBackdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  background: "rgba(0, 0, 0, 0.72)"
};

const modalPanelStyle = {
  width: "min(1000px, 100%)",
  maxHeight: "88vh",
  overflowY: "auto",
  boxSizing: "border-box",
  padding: 20,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  background: COLORS.panelAlt,
  boxShadow: "0 18px 60px rgba(0, 0, 0, 0.5)"
};

const modalHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 16
};

const modalCloseStyle = {
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  fontSize: 28,
  lineHeight: 1,
  padding: "0 4px"
};
