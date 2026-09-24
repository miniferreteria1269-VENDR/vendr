import { useState } from "react";

import { useLang } from "../LanguageContext";
import {
  createCashCategory
} from "../cashCategories";


function CustomCashCategoryModal({
  storeId,
  type,
  onClose,
  onCreated
}) {
  const { t } = useLang();
  const isExpense = type === "expense";
  const [label, setLabel] = useState("");
  const [countsAsOperatingExpense,
    setCountsAsOperatingExpense] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async event => {
    event.preventDefault();

    const normalizedLabel = label.trim();

    if (!normalizedLabel) {
      setError(t("custom_category_name_required"));
      return;
    }

    if (normalizedLabel.length > 80) {
      setError(t("custom_category_name_too_long"));
      return;
    }

    if (
      typeof navigator !== "undefined" &&
      !navigator.onLine
    ) {
      setError(t("custom_category_requires_connection"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      const category = await createCashCategory({
        storeId,
        type,
        label: normalizedLabel,
        countsAsOperatingExpense
      });

      onCreated(category);
    } catch (saveError) {
      if (saveError?.response?.status === 409) {
        setError(t("custom_category_duplicate"));
      } else if (!saveError?.response) {
        setError(t("custom_category_requires_connection"));
      } else {
        setError(t("custom_category_save_failed"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={event => {
        event.stopPropagation();

        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={overlayStyle}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-cash-category-title"
        onSubmit={save}
        onMouseDown={event => event.stopPropagation()}
        style={modalStyle}
      >
        <h3
          id="custom-cash-category-title"
          style={{ margin: 0 }}
        >
          {t(
            isExpense
              ? "add_custom_expense_category"
              : "add_custom_revenue_category"
          )}
        </h3>

        <label style={fieldStyle}>
          <span style={labelStyle}>
            {t("category_name")}
          </span>
          <input
            autoFocus
            type="text"
            maxLength={80}
            value={label}
            onChange={event =>
              setLabel(event.target.value)
            }
            disabled={saving}
            style={inputStyle}
          />
        </label>

        {isExpense && (
          <label style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={countsAsOperatingExpense}
              onChange={event =>
                setCountsAsOperatingExpense(
                  event.target.checked
                )
              }
              disabled={saving}
            />
            <span>
              {t("counts_as_operating_expense")}
            </span>
          </label>
        )}

        {error && (
          <div role="alert" style={errorStyle}>
            {error}
          </div>
        )}

        <div style={buttonRowStyle}>
          <button
            type="submit"
            disabled={saving}
            style={primaryButtonStyle}
          >
            {saving ? t("loading") : t("save")}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={secondaryButtonStyle}
          >
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}


const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  boxSizing: "border-box",
  background: "rgba(0, 0, 0, 0.72)"
};

const modalStyle = {
  width: "100%",
  maxWidth: 360,
  maxHeight: "calc(100dvh - 32px)",
  overflowY: "auto",
  boxSizing: "border-box",
  padding: 18,
  border: "1px solid #3a4250",
  borderRadius: 12,
  background: "#222733",
  color: "#e6edf3",
  boxShadow: "0 18px 60px rgba(0, 0, 0, 0.55)",
  display: "flex",
  flexDirection: "column",
  gap: 14
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 5
};

const labelStyle = {
  color: "#9da7b3",
  fontSize: 12
};

const inputStyle = {
  width: "100%",
  minHeight: 42,
  boxSizing: "border-box",
  padding: 9,
  border: "1px solid #3a4250",
  borderRadius: 7,
  background: "#2a2f3a",
  color: "white"
};

const checkboxRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  minHeight: 40,
  fontSize: 14,
  cursor: "pointer"
};

const errorStyle = {
  padding: 9,
  border: "1px solid #80373d",
  borderRadius: 7,
  background: "#3b2024",
  color: "#ffb4ba",
  fontSize: 12
};

const buttonRowStyle = {
  display: "flex",
  gap: 10
};

const buttonBase = {
  flex: 1,
  minHeight: 40,
  border: "none",
  borderRadius: 8,
  color: "white",
  cursor: "pointer"
};

const primaryButtonStyle = {
  ...buttonBase,
  background: "#3aa0ff"
};

const secondaryButtonStyle = {
  ...buttonBase,
  background: "#3a4250"
};

export default CustomCashCategoryModal;
