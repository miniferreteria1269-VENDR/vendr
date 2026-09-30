import { useState } from "react";

import { useLang } from "../LanguageContext";
import {
  calculateChange
} from "../changeCalculator";


function ChangeCalculatorModal({
  total,
  onCancel,
  onConfirm
}) {
  const { t } = useLang();
  const [cashReceived, setCashReceived] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);

  const result = calculateChange(
    total,
    cashReceived
  );

  const canConfirm =
    result.isValid &&
    result.isEnough &&
    !submitting;

  const submit = async event => {
    event.preventDefault();

    if (!canConfirm) {
      return;
    }

    setSubmitting(true);

    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="change-calculator-overlay"
      role="presentation"
    >
      <form
        className="change-calculator-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-calculator-title"
        onSubmit={submit}
      >
        <h3
          id="change-calculator-title"
          className="change-calculator-title"
        >
          {t("change_calculator")}
        </h3>

        <div className="change-calculator-total-row">
          <span>{t("sale_total")}</span>
          <strong>
            ${Number(total || 0).toFixed(2)}
          </strong>
        </div>

        <label className="change-calculator-field">
          <span>{t("cash_received")}</span>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={cashReceived}
            onChange={event =>
              setCashReceived(event.target.value)
            }
            disabled={submitting}
            placeholder="0.00"
          />
        </label>

        <div
          className={
            result.isValid && !result.isEnough
              ? "change-calculator-result is-short"
              : "change-calculator-result"
          }
          aria-live="polite"
        >
          <span>
            {result.isValid && !result.isEnough
              ? t("amount_still_due")
              : t("change_due")}
          </span>
          <strong>
            ${(
              (result.isValid && !result.isEnough
                ? result.amountDueCents
                : result.changeCents) / 100
            ).toFixed(2)}
          </strong>
        </div>

        <div className="change-calculator-actions">
          <button
            type="submit"
            disabled={!canConfirm}
            className="change-calculator-confirm"
          >
            {submitting
              ? t("loading")
              : t("ok")}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="change-calculator-cancel"
          >
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChangeCalculatorModal;
