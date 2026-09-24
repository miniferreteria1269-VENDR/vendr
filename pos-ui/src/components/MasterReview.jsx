import { useEffect, useMemo, useState } from "react";
import apiClient from "../apiClient";
import { useLang } from "../LanguageContext";
import {
  cacheProducts,
  getCachedProducts,
} from "../offlineCatalog";
import {
  REVIEW_RANGES,
  isReviewedWithinRange,
  reviewAgeDays,
} from "../masterReviewUtils";

const supplierCacheKey = storeId =>
  `vendr_intake_suppliers_${storeId}`;

const numberChanged = (left, right) =>
  Number(left) !== Number(right);

const isEnabled = value =>
  value === true || value === 1 || value === "1" || value === "true";

const requestDetail = (error, fallback) => {
  const detail =
    error?.response?.data?.detail ||
    error?.response?.data?.error ||
    error?.message;

  if (typeof detail === "object") {
    return detail.message || fallback;
  }

  return detail ? String(detail) : fallback;
};

function MasterReview({ storeId, onProductsChanged }) {
  const { t } = useLang();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [rangeDays, setRangeDays] = useState(90);
  const [hideReviewed, setHideReviewed] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState(null);
  const [assignedSuppliers, setAssignedSuppliers] = useState([]);
  const [supplierIds, setSupplierIds] = useState([]);
  const [preferredSupplierId, setPreferredSupplierId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [supplierDataReady, setSupplierDataReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offlineReadOnly, setOfflineReadOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadMasterReview = async () => {
    if (!storeId) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const [productResponse, supplierResponse] = await Promise.all([
        apiClient.get("/products", {
          params: { store_id: storeId },
        }),
        apiClient.get("/suppliers"),
      ]);

      const nextProducts = productResponse.data.products || [];
      const nextSuppliers = supplierResponse.data.suppliers || [];

      setProducts(nextProducts);
      setSuppliers(nextSuppliers);
      setOfflineReadOnly(false);

      await cacheProducts(storeId, nextProducts);
      localStorage.setItem(
        supplierCacheKey(storeId),
        JSON.stringify(nextSuppliers)
      );
    } catch (error) {
      const cachedProducts = await getCachedProducts(storeId);
      let cachedSuppliers = [];

      try {
        cachedSuppliers = JSON.parse(
          localStorage.getItem(supplierCacheKey(storeId)) || "[]"
        );
      } catch {
        cachedSuppliers = [];
      }

      if (cachedProducts.length) {
        setProducts(cachedProducts);
        setSuppliers(cachedSuppliers);
        setOfflineReadOnly(true);
      } else {
        setProducts([]);
        setErrorMessage(
          requestDetail(error, t("master_review_load_failed"))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Loading the store-scoped server projection is the intended
    // synchronization performed when this workspace opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMasterReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const reviewedCount = useMemo(
    () => products.filter(product =>
      isReviewedWithinRange(
        product.last_reviewed_at,
        rangeDays,
        nowMs
      )
    ).length,
    [products, rangeDays, nowMs]
  );

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter(product => {
      const reviewed = isReviewedWithinRange(
        product.last_reviewed_at,
        rangeDays,
        nowMs
      );

      if (hideReviewed && reviewed) return false;

      return !normalizedSearch || String(product.name || "")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [products, rangeDays, hideReviewed, search, nowMs]);

  const reviewLabel = product => {
    const age = reviewAgeDays(product.last_reviewed_at, nowMs);

    if (age === null) return t("never_reviewed");
    if (age === 0) return t("reviewed_today");

    return t("reviewed_days_ago").replace("{days}", age);
  };

  const openProduct = async product => {
    setSelectedProduct(product);
    setForm({
      name: product.name || "",
      cost: Number(product.cost || 0),
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      lowStockThreshold: Number(product.low_stock_threshold || 0),
      locationCode: product.location_code || "",
      tracksStock:
        isEnabled(product.tracks_stock),
    });
    setAssignedSuppliers([]);
    setSupplierIds([]);
    setPreferredSupplierId(null);
    setSupplierDataReady(false);
    setErrorMessage("");

    if (offlineReadOnly) return;

    setLoadingProduct(true);

    try {
      const response = await apiClient.get(
        `/products/${product.product_id}/suppliers`
      );
      const current = response.data.suppliers || [];

      setAssignedSuppliers(current);
      setSupplierIds(current.map(item => item.supplier_id));
      setPreferredSupplierId(
        current.find(item => item.is_preferred)?.supplier_id || null
      );
      setSupplierDataReady(true);
    } catch (error) {
      setErrorMessage(
        requestDetail(error, t("supplier_load_failed"))
      );
    } finally {
      setLoadingProduct(false);
    }
  };

  const closeProduct = () => {
    if (saving) return;
    setSelectedProduct(null);
    setForm(null);
    setErrorMessage("");
  };

  const toggleSupplier = supplierId => {
    setSupplierIds(current => {
      if (current.includes(supplierId)) {
        if (preferredSupplierId === supplierId) {
          setPreferredSupplierId(null);
        }
        return current.filter(id => id !== supplierId);
      }

      return [...current, supplierId];
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) return t("product_name_required");

    for (const value of [form.cost, form.price]) {
      if (!Number.isFinite(Number(value)) || Number(value) < 0) {
        return t("invalid_cost_price");
      }
    }

    for (const value of [form.stock, form.lowStockThreshold]) {
      if (
        !Number.isInteger(Number(value)) ||
        Number(value) < 0
      ) {
        return t("master_review_whole_numbers");
      }
    }

    if (
      !form.tracksStock &&
      numberChanged(form.stock, selectedProduct.stock)
    ) {
      return t("untracked_stock_review_error");
    }

    return "";
  };

  const saveProductBasics = async () => {
    await apiClient.post("/edit-product", null, {
      params: {
        store_id: storeId,
        product_id: selectedProduct.product_id,
        name: form.name.trim(),
        low_stock_threshold: Number(form.lowStockThreshold),
        tracks_stock: form.tracksStock,
        location_code: form.locationCode.trim(),
      },
    });
  };

  const saveSupplierChanges = async () => {
    const currentIds = assignedSuppliers.map(item => item.supplier_id);
    const removed = currentIds.filter(id => !supplierIds.includes(id));
    const added = supplierIds.filter(id => !currentIds.includes(id));

    for (const supplierId of removed) {
      await apiClient.delete(
        `/products/${selectedProduct.product_id}/suppliers/${supplierId}`
      );
    }

    for (const supplierId of added) {
      await apiClient.post(
        `/products/${selectedProduct.product_id}/suppliers`,
        {
          supplier_id: supplierId,
          is_preferred: supplierId === preferredSupplierId,
          supplier_sku: null,
          last_cost: null,
          lead_time_days: null,
        }
      );
    }

    const previousPreferred = assignedSuppliers.find(
      item => item.is_preferred
    )?.supplier_id;

    if (
      preferredSupplierId &&
      currentIds.includes(preferredSupplierId) &&
      preferredSupplierId !== previousPreferred
    ) {
      await apiClient.patch(
        `/products/${selectedProduct.product_id}/suppliers/${preferredSupplierId}/preferred`,
        { is_preferred: true }
      );
    } else if (
      !preferredSupplierId &&
      previousPreferred &&
      supplierIds.includes(previousPreferred)
    ) {
      await apiClient.patch(
        `/products/${selectedProduct.product_id}/suppliers/${previousPreferred}/preferred`,
        { is_preferred: false }
      );
    }
  };

  const saveAndMarkReviewed = async () => {
    if (offlineReadOnly) {
      setErrorMessage(t("master_review_offline_read_only"));
      return;
    }

    if (!supplierDataReady) {
      setErrorMessage(t("supplier_load_failed"));
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    setErrorMessage("");
    let changesStarted = false;

    try {
      const basicsChanged =
        form.name.trim() !== String(selectedProduct.name || "").trim() ||
        numberChanged(
          form.lowStockThreshold,
          selectedProduct.low_stock_threshold
        ) ||
        form.tracksStock !== isEnabled(selectedProduct.tracks_stock) ||
        form.locationCode.trim().toUpperCase() !==
          String(selectedProduct.location_code || "").trim().toUpperCase();
      const priceChanged =
        numberChanged(form.cost, selectedProduct.cost) ||
        numberChanged(form.price, selectedProduct.price);
      const stockChanged = numberChanged(form.stock, selectedProduct.stock);
      const wasTracked = isEnabled(selectedProduct.tracks_stock);

      if (priceChanged) {
        changesStarted = true;
        await apiClient.post("/price-change", null, {
          params: {
            store_id: storeId,
            product_id: selectedProduct.product_id,
            cost: Number(form.cost),
            price: Number(form.price),
          },
        });
      }

      if (basicsChanged && (!stockChanged || !wasTracked || form.tracksStock)) {
        changesStarted = true;
        await saveProductBasics();
      }

      if (stockChanged) {
        changesStarted = true;
        await apiClient.post("/stock-adjustment", {
          store_id: storeId,
          product_id: selectedProduct.product_id,
          counted_total: Number(form.stock),
          expected_stock: Number(selectedProduct.stock || 0),
          reason: "master_review",
          note: t("master_review_stock_note"),
          client_event_id: crypto.randomUUID?.(),
        });
      }

      if (basicsChanged && stockChanged && wasTracked && !form.tracksStock) {
        changesStarted = true;
        await saveProductBasics();
      }

      changesStarted = true;
      await saveSupplierChanges();

      const reviewResponse = await apiClient.post(
        "/master-review/mark-reviewed",
        {
          store_id: storeId,
          product_id: selectedProduct.product_id,
        }
      );

      const updatedProduct = {
        ...selectedProduct,
        name: form.name.trim(),
        cost: Number(form.cost),
        price: Number(form.price),
        stock: Number(form.stock),
        low_stock_threshold: Number(form.lowStockThreshold),
        location_code: form.locationCode.trim().toUpperCase() || null,
        tracks_stock: form.tracksStock ? 1 : 0,
        last_reviewed_at: reviewResponse.data.last_reviewed_at,
        last_reviewed_by: reviewResponse.data.last_reviewed_by,
      };

      const nextDue = products.find(product =>
        product.product_id !== selectedProduct.product_id &&
        !isReviewedWithinRange(
          product.last_reviewed_at,
          rangeDays,
          Date.now()
        ) &&
        (!search.trim() || String(product.name || "")
          .toLowerCase()
          .includes(search.trim().toLowerCase()))
      );

      setProducts(current => current.map(product =>
        product.product_id === updatedProduct.product_id
          ? updatedProduct
          : product
      ));
      setNowMs(Date.now());
      setSuccessMessage(t("product_marked_reviewed"));
      window.setTimeout(() => setSuccessMessage(""), 2500);
      await onProductsChanged?.();

      if (hideReviewed && nextDue) {
        await openProduct(nextDue);
      } else {
        setSelectedProduct(null);
        setForm(null);
      }
    } catch (error) {
      setErrorMessage(
        requestDetail(
          error,
          changesStarted
            ? t("master_review_partial_failure")
            : t("master_review_save_failed")
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const archiveProduct = async () => {
    if (
      offlineReadOnly ||
      !window.confirm(
        t("confirm_archive_review").replace(
          "{product}",
          selectedProduct.name
        )
      )
    ) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      await apiClient.post("/archive-product", null, {
        params: {
          store_id: storeId,
          product_id: selectedProduct.product_id,
          is_active: false,
        },
      });

      setProducts(current => current.filter(
        product => product.product_id !== selectedProduct.product_id
      ));
      setSelectedProduct(null);
      setForm(null);
      setSuccessMessage(t("product_archived_from_review"));
      window.setTimeout(() => setSuccessMessage(""), 2500);
      await onProductsChanged?.();
    } catch (error) {
      setErrorMessage(
        requestDetail(error, t("review_archive_failed"))
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="master-review">
      <header className="master-review-header">
        <div>
          <h2>{t("master_review")}</h2>
          <p>{t("master_review_subtitle")}</p>
        </div>
        <div className="master-review-progress">
          <strong>
            {t("review_progress")
              .replace("{reviewed}", reviewedCount)
              .replace("{total}", products.length)
              .replace("{days}", rangeDays)}
          </strong>
          <span>
            {t("review_due_count").replace(
              "{due}",
              products.length - reviewedCount
            )}
          </span>
        </div>
      </header>

      {offlineReadOnly && (
        <div className="master-review-banner">
          {t("master_review_offline_read_only")}
        </div>
      )}
      {errorMessage && !selectedProduct && (
        <div className="master-review-error">{errorMessage}</div>
      )}
      {successMessage && (
        <div className="master-review-success">{successMessage}</div>
      )}

      <div className="master-review-toolbar">
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder={t("master_review_search")}
        />
        <label>
          <span>{t("review_range")}</span>
          <select
            value={rangeDays}
            onChange={event => {
              setRangeDays(Number(event.target.value));
              setNowMs(Date.now());
            }}
          >
            {REVIEW_RANGES.map(days => (
              <option key={days} value={days}>
                {days} {t("days")}
              </option>
            ))}
          </select>
        </label>
        <label className="master-review-toggle">
          <input
            type="checkbox"
            checked={hideReviewed}
            onChange={event => setHideReviewed(event.target.checked)}
          />
          {t("hide_reviewed")}
        </label>
      </div>

      {loading ? (
        <p>{t("loading")}</p>
      ) : visibleProducts.length === 0 ? (
        <p className="master-review-empty">
          {hideReviewed
            ? t("no_products_due")
            : t("no_master_review_products")}
        </p>
      ) : (
        <div className="master-review-list">
          {visibleProducts.map(product => {
            const reviewed = isReviewedWithinRange(
              product.last_reviewed_at,
              rangeDays,
              nowMs
            );

            return (
              <button
                type="button"
                className="master-review-product"
                key={product.product_id}
                onClick={() => openProduct(product)}
              >
                <span
                  className={reviewed ? "review-dot reviewed" : "review-dot"}
                  aria-label={reviewed ? t("reviewed") : t("due_for_review")}
                />
                <span className="master-review-product-copy">
                  <strong>{product.name}</strong>
                  <small>{reviewLabel(product)}</small>
                </span>
                <span className="master-review-chevron">›</span>
              </button>
            );
          })}
        </div>
      )}

      {selectedProduct && form && (
        <div className="master-review-modal-backdrop" onMouseDown={closeProduct}>
          <div
            className="master-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="master-review-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="master-review-modal-heading">
              <div>
                <h3 id="master-review-title">{selectedProduct.name}</h3>
                <small>{reviewLabel(selectedProduct)}</small>
              </div>
              <button type="button" onClick={closeProduct} aria-label={t("cancel")}>
                ×
              </button>
            </div>

            {errorMessage && (
              <div className="master-review-error">{errorMessage}</div>
            )}

            <div className="master-review-form-grid">
              <label className="wide">
                {t("product_name")}
                <input
                  value={form.name}
                  onChange={event => setForm({ ...form, name: event.target.value })}
                />
              </label>
              <label>
                {t("cost")}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={event => setForm({ ...form, cost: event.target.value })}
                />
              </label>
              <label>
                {t("price")}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={event => setForm({ ...form, price: event.target.value })}
                />
              </label>
              <label>
                {t("current_stock")}
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={!form.tracksStock}
                  value={form.stock}
                  onChange={event => setForm({ ...form, stock: event.target.value })}
                />
              </label>
              <label>
                {t("low_stock_threshold")}
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.lowStockThreshold}
                  onChange={event => setForm({
                    ...form,
                    lowStockThreshold: event.target.value,
                  })}
                />
              </label>
              <label className="wide">
                {t("location")}
                <input
                  maxLength="24"
                  value={form.locationCode}
                  onChange={event => setForm({
                    ...form,
                    locationCode: event.target.value,
                  })}
                />
              </label>
              <label className="master-review-toggle wide">
                <input
                  type="checkbox"
                  checked={form.tracksStock}
                  onChange={event => setForm({
                    ...form,
                    tracksStock: event.target.checked,
                  })}
                />
                {t("tracks_stock")}
              </label>
            </div>

            <fieldset className="master-review-suppliers" disabled={loadingProduct}>
              <legend>{t("suppliers")}</legend>
              {loadingProduct ? (
                <p>{t("loading")}</p>
              ) : suppliers.length === 0 ? (
                <p>{t("no_suppliers")}</p>
              ) : suppliers.map(supplier => {
                const selected = supplierIds.includes(supplier.supplier_id);

                return (
                  <div className="master-review-supplier" key={supplier.supplier_id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSupplier(supplier.supplier_id)}
                      />
                      {supplier.supplier_name}
                    </label>
                    {selected && (
                      <label className="preferred-choice">
                        <input
                          type="radio"
                          name="preferred-supplier"
                          checked={preferredSupplierId === supplier.supplier_id}
                          onChange={() => setPreferredSupplierId(supplier.supplier_id)}
                        />
                        {t("preferred_supplier")}
                      </label>
                    )}
                  </div>
                );
              })}
            </fieldset>

            <div className="master-review-actions">
              <button
                type="button"
                className="master-review-archive"
                disabled={saving || offlineReadOnly}
                onClick={archiveProduct}
              >
                {t("archive_from_review")}
              </button>
              <span />
              <button type="button" disabled={saving} onClick={closeProduct}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="master-review-save"
                disabled={
                  saving ||
                  loadingProduct ||
                  !supplierDataReady ||
                  offlineReadOnly
                }
                onClick={saveAndMarkReviewed}
              >
                {saving ? t("saving") : t("save_mark_reviewed")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MasterReview;
