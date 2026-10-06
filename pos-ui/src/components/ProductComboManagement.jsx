import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../apiClient";
import { useLang } from "../LanguageContext";
import { COLORS, btnDanger, btnPrimary, btnSecondary, input } from "../uiStyles";

const emptySlot = type => ({
  label: "",
  selection_type: type,
  quantity: 1,
  options: [""]
});

export default function ProductComboManagement({ storeId, products, onChanged }) {
  const { t } = useLang();
  const [combos, setCombos] = useState([]);
  const [productId, setProductId] = useState("");
  const [slots, setSlots] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const comboLoadFailedText = t("combo_load_failed");

  const activeProducts = useMemo(
    () => products.filter(product => product.is_active !== false),
    [products]
  );
  const comboProductIds = useMemo(
    () => new Set(combos.map(combo => Number(combo.product_id))),
    [combos]
  );
  const parentProducts = activeProducts;

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

  const editCombo = combo => {
    setProductId(String(combo.product_id));
    setSlots(combo.slots.map(slot => ({
      label: slot.label,
      selection_type: slot.selection_type,
      quantity: slot.quantity,
      options: slot.options.map(option => String(option.product_id))
    })));
    setError("");
  };

  const updateSlot = (index, patch) =>
    setSlots(current => current.map((slot, slotIndex) =>
      slotIndex === index ? { ...slot, ...patch } : slot
    ));

  const updateOption = (slotIndex, optionIndex, value) =>
    setSlots(current => current.map((slot, index) =>
      index === slotIndex
        ? { ...slot, options: slot.options.map((option, idx) => idx === optionIndex ? value : option) }
        : slot
    ));

  const save = async () => {
    if (!productId || !slots.length) return;
    setSaving(true);
    setError("");
    try {
      await apiClient.put(`/product-combos/${productId}`, {
        store_id: storeId,
        slots: slots.map(slot => ({
          label: slot.label.trim(),
          selection_type: slot.selection_type,
          quantity: Number(slot.quantity),
          options: slot.options.filter(Boolean).map(id => ({ product_id: Number(id) }))
        }))
      });
      await load();
      await onChanged?.();
    } catch (err) {
      setError(err.response?.data?.detail || t("combo_save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const archive = async combo => {
    if (!window.confirm(t("archive_combo_confirm").replace("{combo}", combo.product_name))) return;
    await apiClient.delete(`/product-combos/${combo.product_id}`, {
      params: { store_id: storeId }
    });
    if (String(combo.product_id) === productId) {
      setProductId("");
      setSlots([]);
    }
    await load();
    await onChanged?.();
  };

  return (
    <div className="combo-management">
      <div className="combo-editor">
        <h3>{t("combo_editor")}</h3>
        <p>{t("combo_editor_help")}</p>
        <label>
          <span>{t("combo_product")}</span>
          <select value={productId} onChange={event => { setProductId(event.target.value); setSlots([]); }} style={input}>
            <option value="">{t("select_product")}</option>
            {parentProducts.map(product => (
              <option key={product.product_id} value={product.product_id}>{product.name}</option>
            ))}
          </select>
        </label>

        {productId && slots.map((slot, slotIndex) => (
          <div className="combo-slot-editor" key={slotIndex}>
            <div className="combo-slot-heading">
              <strong>{slot.selection_type === "fixed" ? t("fixed_component") : t("choice_group")}</strong>
              <button type="button" style={btnDanger} onClick={() => setSlots(current => current.filter((_, index) => index !== slotIndex))}>×</button>
            </div>
            <div className="combo-slot-grid">
              <label><span>{t("label")}</span><input style={input} value={slot.label} onChange={event => updateSlot(slotIndex, { label: event.target.value })} /></label>
              <label><span>{t("quantity")}</span><input style={input} type="number" min="1" step="1" value={slot.quantity} onChange={event => updateSlot(slotIndex, { quantity: event.target.value })} /></label>
            </div>
            {slot.options.map((option, optionIndex) => (
              <div className="combo-option-row" key={optionIndex}>
                <select style={input} value={option} onChange={event => updateOption(slotIndex, optionIndex, event.target.value)}>
                  <option value="">{t("select_component")}</option>
                  {activeProducts.filter(product =>
                    Number(product.product_id) !== Number(productId) &&
                    !comboProductIds.has(Number(product.product_id))
                  ).map(product => (
                    <option key={product.product_id} value={product.product_id}>{product.name}</option>
                  ))}
                </select>
                {slot.selection_type === "choose_one" && slot.options.length > 1 && (
                  <button type="button" style={btnDanger} onClick={() => updateSlot(slotIndex, { options: slot.options.filter((_, index) => index !== optionIndex) })}>×</button>
                )}
              </div>
            ))}
            {slot.selection_type === "choose_one" && (
              <button type="button" style={btnSecondary} onClick={() => updateSlot(slotIndex, { options: [...slot.options, ""] })}>{t("add_option")}</button>
            )}
          </div>
        ))}

        {productId && (
          <div className="combo-editor-actions">
            <button type="button" style={btnSecondary} onClick={() => setSlots(current => [...current, emptySlot("fixed")])}>+ {t("fixed_component")}</button>
            <button type="button" style={btnSecondary} onClick={() => setSlots(current => [...current, emptySlot("choose_one")])}>+ {t("choice_group")}</button>
            <button type="button" style={btnPrimary} disabled={saving || !slots.length} onClick={save}>{saving ? t("saving") : t("save_combo")}</button>
          </div>
        )}
        {error && <div className="combo-error">{String(error)}</div>}
      </div>

      <div className="combo-list">
        <h3>{t("existing_combos")}</h3>
        {!combos.length && <p>{t("no_combos")}</p>}
        {combos.map(combo => (
          <div className="combo-list-item" key={combo.combo_id}>
            <div><strong>{combo.product_name}</strong><small>{combo.slots.length} {t("components_groups")}</small></div>
            <div><button type="button" style={btnSecondary} onClick={() => editCombo(combo)}>{t("edit")}</button><button type="button" style={btnDanger} onClick={() => archive(combo)}>{t("archive")}</button></div>
          </div>
        ))}
      </div>
      <style>{`
        .combo-management { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr); gap:16px; }
        .combo-editor,.combo-list { border:1px solid ${COLORS.border}; border-radius:10px; padding:14px; background:${COLORS.panel}; }
        .combo-editor h3,.combo-list h3 { margin-top:0; } .combo-editor p,.combo-list p { color:${COLORS.textDim}; }
        .combo-editor label { display:grid; gap:5px; } .combo-slot-editor { margin-top:12px; padding:12px; border:1px solid ${COLORS.border}; border-radius:9px; background:${COLORS.panelAlt}; }
        .combo-slot-heading,.combo-option-row,.combo-editor-actions,.combo-list-item,.combo-list-item>div { display:flex; align-items:center; gap:8px; }
        .combo-slot-heading { justify-content:space-between; } .combo-slot-grid { display:grid; grid-template-columns:1fr 100px; gap:8px; margin:8px 0; }
        .combo-option-row { margin:7px 0; } .combo-option-row select { flex:1; } .combo-editor-actions { flex-wrap:wrap; margin-top:12px; }
        .combo-list-item { justify-content:space-between; padding:10px 0; border-bottom:1px solid ${COLORS.border}; } .combo-list-item>div:first-child { display:grid; }
        .combo-list-item small { color:${COLORS.textDim}; } .combo-error { color:${COLORS.danger}; margin-top:10px; }
        @media (max-width:720px) { .combo-management { grid-template-columns:1fr; } .combo-slot-grid { grid-template-columns:1fr 90px; } }
      `}</style>
    </div>
  );
}
