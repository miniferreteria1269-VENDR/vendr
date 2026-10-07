import { useMemo, useState } from "react";
import { useLang } from "../LanguageContext";
import { buildComboLine } from "../comboSales";

const COLORS = {
  panel: "#1a1d24",
  panelAlt: "#222733",
  border: "#2f3542",
  text: "#e6edf3",
  textDim: "#9da7b3",
  primary: "#3aa0ff"
};

export default function ComboSelectionModal({
  combo,
  initialSelections = [],
  editing = false,
  onConfirm,
  onCancel
}) {
  const { t } = useLang();
  const [choices, setChoices] = useState(() =>
    Object.fromEntries(
      [
        ...(combo?.slots || [])
          .filter(slot => slot.selection_type === "fixed")
          .map(slot => [slot.slot_id, slot.options?.[0]?.product_id]),
        ...(initialSelections || []).map(selection => [
          selection.slot_id,
          selection.product_id
        ])
      ]
    )
  );

  const complete = useMemo(
    () => (combo?.slots || []).every(slot => Boolean(choices[slot.slot_id])),
    [combo, choices]
  );

  const confirm = () => {
    if (!complete) return;
    const selections = Object.entries(choices).map(([slot_id, product_id]) => ({
      slot_id: Number(slot_id),
      product_id: Number(product_id)
    }));
    onConfirm(buildComboLine(combo, selections));
  };

  return (
    <div className="combo-modal-overlay" role="dialog" aria-modal="true">
      <div className="combo-modal-card">
        <h3>{t(editing ? "edit_combo_configuration" : "configure_combo")}</h3>
        <div className="combo-modal-product">{combo.product_name}</div>

        <div className="combo-slot-list">
          {(combo.slots || []).map(slot => (
            <label key={slot.slot_id} className="combo-slot-field">
              <span>{slot.label} × {slot.quantity}</span>
              {slot.selection_type === "fixed" ? (
                <div className="combo-fixed-value">
                  {slot.options?.[0]?.product_name}
                </div>
              ) : (
                <select
                  value={choices[slot.slot_id] || ""}
                  onChange={event => setChoices(current => ({
                    ...current,
                    [slot.slot_id]: Number(event.target.value)
                  }))}
                >
                  <option value="">{t("choose_option")}</option>
                  {(slot.options || []).map(option => (
                    <option key={option.product_id} value={option.product_id}>
                      {option.product_name}
                      {option.tracks_stock ? ` (${t("stock")}: ${option.stock})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ))}
        </div>

        <div className="combo-modal-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button type="button" className="primary" disabled={!complete} onClick={confirm}>
            {t(editing ? "save_changes" : "add_to_ticket")}
          </button>
        </div>
      </div>
      <style>{`
        .combo-modal-overlay { position: fixed; inset: 0; z-index: 1300; display: grid; place-items: center; padding: 14px; background: rgba(0,0,0,.72); }
        .combo-modal-card { width: min(460px, 100%); max-height: min(680px, calc(100dvh - 28px)); overflow-y: auto; box-sizing: border-box; padding: 18px; border: 1px solid ${COLORS.border}; border-radius: 12px; background: ${COLORS.panel}; color: ${COLORS.text}; }
        .combo-modal-card h3 { margin: 0 0 4px; }
        .combo-modal-product { margin-bottom: 16px; color: ${COLORS.textDim}; }
        .combo-slot-list { display: grid; gap: 12px; }
        .combo-slot-field { display: grid; gap: 6px; font-weight: 700; }
        .combo-slot-field select, .combo-fixed-value { width: 100%; box-sizing: border-box; padding: 11px; border: 1px solid ${COLORS.border}; border-radius: 8px; background: ${COLORS.panelAlt}; color: ${COLORS.text}; }
        .combo-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
        .combo-modal-actions button { padding: 10px 14px; border: 0; border-radius: 8px; color: white; font-weight: 700; }
        .combo-modal-actions .primary { background: ${COLORS.primary}; }
        .combo-modal-actions .secondary { background: ${COLORS.panelAlt}; }
        .combo-modal-actions button:disabled { opacity: .5; }
      `}</style>
    </div>
  );
}
