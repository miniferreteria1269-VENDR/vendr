import { useEffect, useState } from "react";

import apiClient from "../apiClient";
import { useLang } from "../LanguageContext";
import {
  COLORS,
  btnPrimary,
  btnSecondary,
  input
} from "../uiStyles";
import { ProductPerformance } from "./ProductManagement";

function ProductMovementOptions({
  product,
  storeId,
  onClose,
  onThresholdChanged
}) {
  const { t } = useLang();
  const [view, setView] = useState("menu");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [threshold, setThreshold] = useState(
    String(product.low_stock_threshold ?? 0)
  );
  const [supplierChoices, setSupplierChoices] = useState([]);
  const [reorderForm, setReorderForm] = useState({
    supplier_id: "",
    quantity: Math.max(
      Number(product.low_stock_threshold || 0) -
        Number(product.current_stock || 0),
      1
    ),
    purchase_priority: false
  });

  const text = (key, fallback) => {
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };

  useEffect(() => {
    setView("menu");
    setError("");
    setThreshold(String(product.low_stock_threshold ?? 0));
  }, [product.product_id]);

  const openReorder = async () => {
    setView("reorder");
    setError("");
    setLoading(true);

    try {
      const [itemsResponse, assignedResponse, suppliersResponse] =
        await Promise.all([
          apiClient.get("/reorder-items", {
            params: { store_id: storeId }
          }),
          apiClient.get(`/products/${product.product_id}/suppliers`),
          apiClient.get("/suppliers")
        ]);

      const existing = (itemsResponse.data.reorder_items || []).find(
        item => item.product_id === product.product_id
      );
      const assigned = assignedResponse.data.suppliers || [];
      const allSuppliers = suppliersResponse.data.suppliers || [];
      const choices = assigned.length > 0 ? assigned : allSuppliers;
      const preferred = assigned.find(item => item.is_preferred);

      setSupplierChoices(
        [...choices].sort((a, b) =>
          String(a.supplier_name || "").localeCompare(
            String(b.supplier_name || ""),
            undefined,
            { sensitivity: "base" }
          )
        )
      );
      setReorderForm({
        supplier_id:
          existing?.supplier_id != null
            ? String(existing.supplier_id)
            : preferred
              ? String(preferred.supplier_id)
              : "",
        quantity:
          existing?.quantity ||
          Math.max(
            Number(product.low_stock_threshold || 0) -
              Number(product.current_stock || 0),
            1
          ),
        purchase_priority: existing?.purchase_priority === true
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          text("unable_load_reorder_list", "Unable to load reorder details.")
      );
    } finally {
      setLoading(false);
    }
  };

  const saveThreshold = async () => {
    const numericThreshold = Number(threshold);

    if (!Number.isInteger(numericThreshold) || numericThreshold < 0) {
      setError(t("invalid_low_stock_threshold"));
      return;
    }

    if (numericThreshold === Number(product.low_stock_threshold || 0)) {
      setError(t("same_low_stock_threshold"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiClient.post("/edit-product", null, {
        params: {
          store_id: storeId,
          product_id: product.product_id,
          name: product.product,
          low_stock_threshold: numericThreshold,
          tracks_stock: true
        }
      });
      onThresholdChanged(product.product_id, numericThreshold);
      setView("menu");
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          t("low_stock_threshold_update_failed")
      );
    } finally {
      setSaving(false);
    }
  };

  const saveReorder = async () => {
    const quantity = Number(reorderForm.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError(text("invalid_quantity", "Enter a positive whole number."));
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiClient.post(`/reorder-items/${product.product_id}`, {
        quantity,
        supplier_id:
          reorderForm.supplier_id === ""
            ? null
            : Number(reorderForm.supplier_id),
        purchase_priority: reorderForm.purchase_priority === true
      });
      onClose();
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          text("unable_save_reorder", "Unable to save reorder item.")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={() => !saving && onClose()}
      style={backdrop}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${t("options")} — ${product.product}`}
        onMouseDown={event => event.stopPropagation()}
        style={{
          ...panel,
          width: view === "performance" ? "min(980px, 100%)" : "min(520px, 100%)"
        }}
      >
        <div style={header}>
          <div>
            <h3 style={{ margin: 0 }}>{product.product}</h3>
            <div style={metadata}>
              {t("final")}: {product.final_stock} · {t("current_stock")}: {product.current_stock} · {t("low_stock_threshold")}: {product.low_stock_threshold}
            </div>
          </div>

          <button
            type="button"
            aria-label={t("close") || "Close"}
            onClick={onClose}
            disabled={saving}
            style={closeButton}
          >
            ×
          </button>
        </div>

        {view !== "menu" && view !== "performance" && (
          <button
            type="button"
            onClick={() => {
              setView("menu");
              setError("");
            }}
            disabled={saving}
            style={{ ...btnSecondary, padding: "5px 9px", marginBottom: 12 }}
          >
            ← {text("back", "Back")}
          </button>
        )}

        {error && <div style={errorStyle}>{error}</div>}

        {view === "menu" && (
          <div style={optionGrid}>
            <button
              type="button"
              onClick={openReorder}
              disabled={!product.is_active}
              title={!product.is_active ? t("archived") : undefined}
              style={{
                ...optionButton,
                opacity: product.is_active ? 1 : 0.55,
                cursor: product.is_active ? "pointer" : "not-allowed"
              }}
            >
              <strong>{t("add_to_reorder")}</strong>
            </button>
            <button type="button" onClick={() => setView("performance")} style={optionButton}>
              <strong>{t("performance")}</strong>
            </button>
            <button type="button" onClick={() => setView("threshold")} style={optionButton}>
              <strong>{t("change_low_stock")}</strong>
            </button>
          </div>
        )}

        {view === "performance" && (
          <ProductPerformance
            product={{
              product_id: product.product_id,
              name: product.product,
              stock: product.current_stock,
              low_stock_threshold: product.low_stock_threshold,
              tracks_stock: true
            }}
          />
        )}

        {view === "threshold" && (
          <>
            <label style={field}>
              <span>{t("low_stock_threshold")}</span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                autoFocus
                value={threshold}
                onChange={event => setThreshold(event.target.value)}
                disabled={saving}
                style={{ ...input, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <div style={footer}>
              <button type="button" onClick={() => setView("menu")} disabled={saving} style={btnSecondary}>
                {t("cancel")}
              </button>
              <button type="button" onClick={saveThreshold} disabled={saving} style={btnPrimary}>
                {saving ? t("loading") : t("save")}
              </button>
            </div>
          </>
        )}

        {view === "reorder" && (
          loading ? (
            <div style={{ color: COLORS.textDim }}>{t("loading")}</div>
          ) : (
            <>
              <div style={formGrid}>
                <label style={field}>
                  <span>{t("supplier")}</span>
                  <select
                    value={reorderForm.supplier_id}
                    onChange={event => setReorderForm(previous => ({ ...previous, supplier_id: event.target.value }))}
                    disabled={saving}
                    style={{ ...input, width: "100%" }}
                  >
                    <option value="">{t("unassigned")}</option>
                    {supplierChoices.map(supplier => (
                      <option key={supplier.supplier_id} value={supplier.supplier_id}>
                        {supplier.is_preferred ? "★ " : ""}{supplier.supplier_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={field}>
                  <span>{t("quantity")}</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={reorderForm.quantity}
                    onChange={event => setReorderForm(previous => ({ ...previous, quantity: event.target.value }))}
                    disabled={saving}
                    style={{ ...input, width: "100%", boxSizing: "border-box" }}
                  />
                </label>
              </div>
              <label style={priorityField}>
                <input
                  type="checkbox"
                  checked={reorderForm.purchase_priority}
                  onChange={event => setReorderForm(previous => ({ ...previous, purchase_priority: event.target.checked }))}
                  disabled={saving}
                />
                <span>
                  <strong>{t("mark_purchase_priority")}</strong>
                  <span style={{ display: "block", marginTop: 2, color: COLORS.textDim, fontSize: 12 }}>
                    {t("purchase_priority_help")}
                  </span>
                </span>
              </label>
              <div style={footer}>
                <button type="button" onClick={() => setView("menu")} disabled={saving} style={btnSecondary}>
                  {t("cancel")}
                </button>
                <button type="button" onClick={saveReorder} disabled={saving} style={btnPrimary}>
                  {saving ? t("loading") : t("save")}
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

const backdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  background: "rgba(0, 0, 0, 0.68)"
};

const panel = {
  maxHeight: "calc(100dvh - 32px)",
  overflow: "auto",
  boxSizing: "border-box",
  padding: 16,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  background: COLORS.panelAlt,
  color: COLORS.text,
  boxShadow: "0 18px 50px rgba(0, 0, 0, 0.45)"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14
};

const metadata = { marginTop: 4, color: COLORS.textDim, fontSize: 12 };
const closeButton = { ...btnSecondary, padding: "3px 9px", fontSize: 20, lineHeight: 1 };
const optionGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8 };
const optionButton = { ...btnSecondary, minHeight: 58, textAlign: "left" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 };
const field = { display: "flex", flexDirection: "column", gap: 5 };
const priorityField = { display: "flex", alignItems: "flex-start", gap: 9, marginTop: 14, padding: 10, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.panel };
const footer = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 };
const errorStyle = { marginBottom: 12, padding: 10, borderRadius: 6, background: "rgba(255, 92, 92, 0.12)", color: COLORS.danger };

export default ProductMovementOptions;
