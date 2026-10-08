import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../apiClient";
import { calculateComboCostRange } from "../comboSales";
import { useLang } from "../LanguageContext";
import { COLORS, btnDanger, btnPrimary, btnSecondary, input } from "../uiStyles";
import ContextHelp from "./ContextHelp";

const makeKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emptySlot = selectionType => ({
  key: makeKey(),
  label: "",
  selection_type: selectionType,
  quantity: 1,
  options: [""]
});

const money = value => {
  const amount = Number(value || 0);
  return `${amount < 0 ? "-" : ""}$${Math.abs(amount).toFixed(2)}`;
};
const tracksStock = value =>
  value === true || value === 1 || value === "1" || value === "true";

function ProductSearchPicker({
  products,
  value,
  onChange,
  placeholder,
  excludeIds = []
}) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const selected = products.find(
    product => Number(product.product_id) === Number(value)
  );
  const excluded = new Set(excludeIds.map(Number));
  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery
    ? products.filter(product =>
        !excluded.has(Number(product.product_id)) &&
        (
          String(product.name || "").toLowerCase().includes(normalizedQuery) ||
          String(product.product_id || "").includes(normalizedQuery) ||
          String(product.location_code || "").toLowerCase().includes(normalizedQuery)
        )
      ).slice(0, 30)
    : [];

  if (selected) {
    return (
      <div className="combo-picker-selected">
        <div>
          <strong>{selected.name}</strong>
          <small>
            {money(selected.cost)} · {tracksStock(selected.tracks_stock)
              ? `${t("stock")}: ${Number(selected.stock || 0)}`
              : t("does_not_track_stock")}
          </small>
        </div>
        <button
          type="button"
          style={btnSecondary}
          onClick={() => {
            onChange("");
            setQuery("");
          }}
        >
          {t("change")}
        </button>
      </div>
    );
  }

  return (
    <div className="combo-product-picker">
      <input
        style={input}
        value={query}
        placeholder={placeholder}
        onChange={event => setQuery(event.target.value)}
      />
      {normalizedQuery && (
        <div className="combo-picker-results">
          {matches.length === 0 && (
            <div className="combo-picker-empty">{t("no_products_found")}</div>
          )}
          {matches.map(product => (
            <button
              type="button"
              key={product.product_id}
              onClick={() => {
                onChange(String(product.product_id));
                setQuery("");
              }}
            >
              <span>{product.name}</span>
              <small>
                {money(product.cost)} · {tracksStock(product.tracks_stock)
                  ? `${t("stock")}: ${Number(product.stock || 0)}`
                  : t("service")}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductComboManagement({ storeId, products, onChanged }) {
  const { t } = useLang();
  const [combos, setCombos] = useState([]);
  const [editingCombo, setEditingCombo] = useState(null);
  const [comboName, setComboName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [slots, setSlots] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const comboLoadFailedText = t("combo_load_failed");

  const comboProductIds = useMemo(
    () => new Set(combos.map(combo => Number(combo.product_id))),
    [combos]
  );
  const componentProducts = useMemo(
    () => products.filter(product =>
      product.is_active !== false &&
      !comboProductIds.has(Number(product.product_id))
    ),
    [products, comboProductIds]
  );
  const productsById = useMemo(
    () => new Map(products.map(product => [Number(product.product_id), product])),
    [products]
  );

  const load = useCallback(async () => {
    const response = await apiClient.get("/product-combos", {
      params: { store_id: storeId }
    });
    setCombos(response.data?.combos || []);
  }, [storeId]);

  useEffect(() => {
    let cancelled = false;
    apiClient.get("/product-combos", {
      params: { store_id: storeId }
    }).then(response => {
      if (!cancelled) setCombos(response.data?.combos || []);
    }).catch(err => {
      if (!cancelled) setError(err.response?.data?.detail || comboLoadFailedText);
    });
    return () => { cancelled = true; };
  }, [storeId, comboLoadFailedText]);

  const resetEditor = () => {
    setEditingCombo(null);
    setComboName("");
    setSellingPrice("");
    setSlots([]);
    setError("");
  };

  const editCombo = combo => {
    setEditingCombo(combo);
    setComboName(combo.product_name || "");
    setSellingPrice(String(combo.price ?? ""));
    setSlots(combo.slots.map(slot => ({
      key: makeKey(),
      label: slot.selection_type === "fixed" ? "" : slot.label,
      selection_type: slot.selection_type,
      quantity: slot.quantity,
      options: slot.options.map(option => String(option.product_id))
    })));
    setError("");
  };

  const updateSlot = (index, patchValue) =>
    setSlots(current => current.map((slot, slotIndex) =>
      slotIndex === index ? { ...slot, ...patchValue } : slot
    ));

  const updateOption = (slotIndex, optionIndex, value) =>
    setSlots(current => current.map((slot, index) =>
      index === slotIndex
        ? {
            ...slot,
            options: slot.options.map((option, idx) =>
              idx === optionIndex ? value : option
            )
          }
        : slot
    ));

  const costSlots = useMemo(
    () => slots.map(slot => ({
      ...slot,
      options: slot.options
        .map(productId => productsById.get(Number(productId)))
        .filter(Boolean)
        .map(product => ({ cost: Number(product.cost || 0) }))
    })),
    [slots, productsById]
  );
  const costRange = useMemo(
    () => calculateComboCostRange(costSlots),
    [costSlots]
  );
  const numericPrice = Number(sellingPrice);
  const priceIsValid = sellingPrice !== "" && Number.isFinite(numericPrice) && numericPrice >= 0;
  const componentsComplete = slots.length > 0 && slots.every(slot =>
    Number(slot.quantity) > 0 &&
    slot.options.length > 0 &&
    slot.options.every(Boolean) &&
    (slot.selection_type === "fixed" || (slot.label.trim() && slot.options.length >= 2))
  );
  const profitMinimum = numericPrice - costRange.maximum;
  const profitMaximum = numericPrice - costRange.minimum;
  const epsilon = 0.0001;
  let marginStatus = "profitable";
  if (priceIsValid && componentsComplete) {
    if (numericPrice < costRange.minimum - epsilon) marginStatus = "all_loss";
    else if (numericPrice < costRange.maximum - epsilon) marginStatus = "some_loss";
    else if (numericPrice <= costRange.maximum + epsilon) marginStatus = "zero_profit";
  }

  const payloadSlots = () => slots.map(slot => {
    const selectedProduct = productsById.get(Number(slot.options[0]));
    return {
      label: slot.selection_type === "fixed"
        ? String(selectedProduct?.name || t("fixed_component")).trim()
        : slot.label.trim(),
      selection_type: slot.selection_type,
      quantity: Number(slot.quantity),
      options: slot.options.map(id => ({ product_id: Number(id) }))
    };
  });

  const save = async () => {
    if (!comboName.trim()) {
      setError(t("combo_name_required"));
      return;
    }
    if (!priceIsValid) {
      setError(t("combo_price_required"));
      return;
    }
    if (!componentsComplete) {
      setError(t("combo_components_required"));
      return;
    }

    if (
      marginStatus !== "profitable" &&
      !window.confirm(t("combo_loss_confirm"))
    ) return;

    setSaving(true);
    setError("");
    try {
      if (editingCombo) {
        const currentProduct = productsById.get(Number(editingCombo.product_id));
        if (comboName.trim() !== String(editingCombo.product_name || "").trim()) {
          await apiClient.post("/edit-product", null, {
            params: {
              store_id: storeId,
              product_id: editingCombo.product_id,
              name: comboName.trim(),
              low_stock_threshold: Number(currentProduct?.low_stock_threshold || 0),
              tracks_stock: false
            }
          });
        }
        if (Number(editingCombo.price || 0) !== numericPrice) {
          await apiClient.post("/price-change", null, {
            params: {
              store_id: storeId,
              product_id: editingCombo.product_id,
              cost: 0,
              price: numericPrice
            }
          });
        }
        await apiClient.put(`/product-combos/${editingCombo.product_id}`, {
          store_id: storeId,
          slots: payloadSlots()
        });
      } else {
        await apiClient.post("/product-combos", {
          store_id: storeId,
          name: comboName.trim(),
          price: numericPrice,
          slots: payloadSlots()
        });
      }

      await load();
      await onChanged?.();
      resetEditor();
    } catch (err) {
      setError(err.response?.data?.detail || t("combo_save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const archive = async combo => {
    if (!window.confirm(t("archive_combo_confirm").replace("{combo}", combo.product_name))) return;
    try {
      await apiClient.delete(`/product-combos/${combo.product_id}`, {
        params: { store_id: storeId }
      });
      if (Number(editingCombo?.product_id) === Number(combo.product_id)) resetEditor();
      await load();
      await onChanged?.();
    } catch (err) {
      setError(err.response?.data?.detail || t("combo_archive_failed"));
    }
  };

  return (
    <div className="combo-management">
      <div className="combo-editor">
        <div className="combo-editor-title">
          <div>
            <h3 style={{ display: "flex", alignItems: "center" }}>
              {editingCombo ? t("edit_combo") : t("create_combo")}
              <ContextHelp topic="comboConfiguration" />
            </h3>
            <p>{t("combo_editor_help")}</p>
          </div>
          {editingCombo && (
            <button type="button" style={btnSecondary} onClick={resetEditor}>
              {t("new_combo")}
            </button>
          )}
        </div>

        <div className="combo-details-grid">
          <label>
            <span>{t("combo_name")}</span>
            <input
              style={input}
              value={comboName}
              onChange={event => setComboName(event.target.value)}
              placeholder={t("combo_name_placeholder")}
            />
          </label>
          <label>
            <span>{t("selling_price")}</span>
            <input
              style={input}
              type="number"
              min="0"
              step="0.01"
              value={sellingPrice}
              onChange={event => setSellingPrice(event.target.value)}
            />
          </label>
        </div>

        <div className="combo-section-heading">
          <div>
            <h4>{t("included_components")}</h4>
            <small>{t("combo_components_help")}</small>
          </div>
        </div>

        {slots.map((slot, slotIndex) => (
          <div className={`combo-slot-editor ${slot.selection_type}`} key={slot.key}>
            <div className="combo-slot-heading">
              <strong>
                {slot.selection_type === "fixed"
                  ? t("included_item")
                  : t("choice_group")}
              </strong>
              <button
                type="button"
                style={btnDanger}
                onClick={() => setSlots(current =>
                  current.filter((_, index) => index !== slotIndex)
                )}
                aria-label={t("remove")}
              >
                ×
              </button>
            </div>

            {slot.selection_type === "choose_one" && (
              <label className="combo-group-label">
                <span>{t("choice_group_name")}</span>
                <input
                  style={input}
                  value={slot.label}
                  onChange={event => updateSlot(slotIndex, { label: event.target.value })}
                  placeholder={t("choice_group_placeholder")}
                />
              </label>
            )}

            <label className="combo-quantity-field">
              <span>{t("quantity_per_combo")}</span>
              <input
                style={input}
                type="number"
                min="1"
                step="1"
                value={slot.quantity}
                onChange={event => updateSlot(slotIndex, { quantity: event.target.value })}
              />
            </label>

            {slot.options.map((option, optionIndex) => (
              <div className="combo-option-row" key={`${slot.key}-${optionIndex}`}>
                <ProductSearchPicker
                  products={componentProducts}
                  value={option}
                  onChange={value => updateOption(slotIndex, optionIndex, value)}
                  placeholder={slot.selection_type === "fixed"
                    ? t("search_component")
                    : t("search_choice_option")}
                  excludeIds={slot.options.filter((_, index) => index !== optionIndex)}
                />
                {slot.selection_type === "choose_one" && slot.options.length > 1 && (
                  <button
                    type="button"
                    style={btnDanger}
                    onClick={() => updateSlot(slotIndex, {
                      options: slot.options.filter((_, index) => index !== optionIndex)
                    })}
                    aria-label={t("remove")}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {slot.selection_type === "choose_one" && (
              <button
                type="button"
                style={btnSecondary}
                onClick={() => updateSlot(slotIndex, {
                  options: [...slot.options, ""]
                })}
              >
                + {t("add_searchable_option")}
              </button>
            )}
          </div>
        ))}

        <div className="combo-add-actions">
          <button
            type="button"
            style={btnSecondary}
            onClick={() => setSlots(current => [...current, emptySlot("fixed")])}
          >
            + {t("included_item")}
          </button>
          <button
            type="button"
            style={btnSecondary}
            onClick={() => setSlots(current => [...current, emptySlot("choose_one")])}
          >
            + {t("choice_group")}
          </button>
        </div>

        {componentsComplete && (
          <div className={`combo-cost-summary ${marginStatus}`}>
            <div>
              <span>{t("calculated_cost")}</span>
              <strong>
                {Math.abs(costRange.maximum - costRange.minimum) < epsilon
                  ? money(costRange.minimum)
                  : `${money(costRange.minimum)}–${money(costRange.maximum)}`}
              </strong>
            </div>
            {priceIsValid && (
              <div>
                <span>{t("profit_per_combo")}</span>
                <strong>
                  {Math.abs(profitMaximum - profitMinimum) < epsilon
                    ? money(profitMinimum)
                    : `${money(profitMinimum)}–${money(profitMaximum)}`}
                </strong>
              </div>
            )}
            {priceIsValid && componentsComplete && marginStatus !== "profitable" && (
              <p>{t(`combo_margin_${marginStatus}`)}</p>
            )}
          </div>
        )}

        <div className="combo-editor-actions">
          <button
            type="button"
            style={btnPrimary}
            disabled={saving}
            onClick={save}
          >
            {saving ? t("saving") : t("save_combo")}
          </button>
          {(editingCombo || comboName || slots.length > 0) && (
            <button type="button" style={btnSecondary} disabled={saving} onClick={resetEditor}>
              {t("cancel")}
            </button>
          )}
        </div>
        {error && <div className="combo-error">{String(error)}</div>}
      </div>

      <div className="combo-list">
        <h3>{t("existing_combos")}</h3>
        {!combos.length && <p>{t("no_combos")}</p>}
        {combos.map(combo => (
          <div className="combo-list-item" key={combo.combo_id}>
            <div>
              <strong>{combo.product_name}</strong>
              <small>{money(combo.price)} · {combo.slots.length} {t("components_groups")}</small>
            </div>
            <div>
              <button type="button" style={btnSecondary} onClick={() => editCombo(combo)}>
                {t("edit")}
              </button>
              <button type="button" style={btnDanger} onClick={() => archive(combo)}>
                {t("archive")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .combo-management { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr); gap:16px; color:${COLORS.text}; }
        .combo-editor,.combo-list { min-width:0; border:1px solid ${COLORS.border}; border-radius:10px; padding:14px; background:${COLORS.panel}; }
        .combo-editor h3,.combo-list h3,.combo-section-heading h4 { margin:0; }
        .combo-editor p,.combo-list p,.combo-section-heading small { color:${COLORS.textDim}; }
        .combo-editor-title,.combo-section-heading,.combo-slot-heading,.combo-picker-selected,.combo-list-item,.combo-list-item>div { display:flex; align-items:center; gap:8px; }
        .combo-editor-title,.combo-slot-heading,.combo-list-item { justify-content:space-between; }
        .combo-editor-title p { margin:5px 0 0; }
        .combo-details-grid { display:grid; grid-template-columns:minmax(0,1fr) 150px; gap:10px; margin-top:14px; }
        .combo-editor label { display:grid; gap:5px; }
        .combo-section-heading { margin-top:18px; }
        .combo-slot-editor { display:grid; grid-template-columns:minmax(0,1fr) 120px; gap:10px; margin-top:12px; padding:12px; border:1px solid ${COLORS.border}; border-radius:9px; background:${COLORS.panelAlt}; }
        .combo-slot-heading { grid-column:1/-1; }
        .combo-group-label { grid-column:1; }
        .combo-quantity-field { grid-column:2; grid-row:2; }
        .combo-option-row { grid-column:1/-1; display:flex; align-items:flex-start; gap:8px; min-width:0; }
        .combo-slot-editor.fixed .combo-option-row { grid-column:1; grid-row:2; }
        .combo-product-picker { position:relative; flex:1; min-width:0; }
        .combo-product-picker>input { width:100%; box-sizing:border-box; }
        .combo-picker-results { position:relative; z-index:3; display:grid; max-height:230px; overflow:auto; margin-top:4px; border:1px solid ${COLORS.border}; border-radius:8px; background:${COLORS.bg}; }
        .combo-picker-results button { display:flex; justify-content:space-between; gap:12px; padding:9px; border:0; border-bottom:1px solid ${COLORS.border}; background:transparent; color:${COLORS.text}; text-align:left; cursor:pointer; }
        .combo-picker-results button:hover { background:${COLORS.panel}; }
        .combo-picker-results small,.combo-picker-selected small { display:block; color:${COLORS.textDim}; }
        .combo-picker-empty { padding:10px; color:${COLORS.textDim}; }
        .combo-picker-selected { flex:1; min-width:0; justify-content:space-between; padding:8px 10px; border:1px solid ${COLORS.border}; border-radius:8px; background:${COLORS.panel}; }
        .combo-picker-selected>div { min-width:0; }
        .combo-picker-selected strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .combo-add-actions,.combo-editor-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
        .combo-cost-summary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:14px; padding:12px; border:1px solid ${COLORS.border}; border-radius:9px; background:${COLORS.panelAlt}; }
        .combo-cost-summary>div { display:grid; gap:3px; }
        .combo-cost-summary span { color:${COLORS.textDim}; }
        .combo-cost-summary strong { font-size:1.18rem; color:${COLORS.primary}; }
        .combo-cost-summary.some_loss,.combo-cost-summary.all_loss,.combo-cost-summary.zero_profit { border-color:#d3763b; }
        .combo-cost-summary.some_loss strong,.combo-cost-summary.all_loss strong,.combo-cost-summary.zero_profit strong { color:#ffad66; }
        .combo-cost-summary p { grid-column:1/-1; margin:0; color:#ffad66; font-weight:700; }
        .combo-list-item { padding:10px 0; border-bottom:1px solid ${COLORS.border}; }
        .combo-list-item>div:first-child { display:grid; min-width:0; }
        .combo-list-item>div:last-child { flex-shrink:0; }
        .combo-list-item small { color:${COLORS.textDim}; }
        .combo-error { color:${COLORS.danger}; margin-top:10px; }
        @media (max-width:760px) {
          .combo-management { grid-template-columns:1fr; }
          .combo-details-grid { grid-template-columns:1fr 120px; }
          .combo-slot-editor { grid-template-columns:minmax(0,1fr) 95px; padding:10px; }
          .combo-list-item { align-items:flex-start; }
        }
        @media (max-width:480px) {
          .combo-editor-title { align-items:flex-start; }
          .combo-details-grid,.combo-cost-summary { grid-template-columns:1fr; }
          .combo-slot-editor { grid-template-columns:1fr 82px; }
          .combo-cost-summary p { grid-column:1; }
          .combo-list-item { display:grid; }
        }
      `}</style>
    </div>
  );
}
