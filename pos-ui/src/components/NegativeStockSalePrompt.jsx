import { useMemo, useState } from "react";

import { useLang } from "../LanguageContext";
import {
  savePendingEvent,
  submitPendingEvent
} from "../offlineEvents";
import {
  applyLocalStockCountToCatalog
} from "../offlineCatalog";
import { offlineDb } from "../offlineDb";
import {
  COLORS,
  btnPrimary,
  btnSecondary,
  input
} from "../uiStyles";

const createAdjustmentClientEventId = () =>
  crypto.randomUUID?.() ||
  `adjustment-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

const getOrCreateDeviceId = () => {
  const storageKey = "vendr_device_id";
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    deviceId =
      crypto.randomUUID?.() ||
      `device-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
};

function NegativeStockSalePrompt({
  storeId,
  batch,
  onClose,
  onAdjusted
}) {
  const { t } = useLang();
  const [reviewing, setReviewing] = useState(false);
  const [items, setItems] = useState(
    batch.items || []
  );
  const [counts, setCounts] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const preparedAdjustments = useMemo(
    () => items
      .filter(item =>
        String(counts[item.product_id] ?? "").trim() !== ""
      )
      .map(item => ({
        item,
        countedTotal: Number(counts[item.product_id])
      })),
    [counts, items]
  );

  const submitAdjustments = async () => {
    if (submitting) return;

    if (preparedAdjustments.length === 0) {
      setError(t("negative_stock_enter_count"));
      return;
    }

    const invalid = preparedAdjustments.some(
      entry =>
        !Number.isInteger(entry.countedTotal) ||
        entry.countedTotal < 0
    );

    if (invalid) {
      setError(t("invalid_counted_stock"));
      return;
    }

    setSubmitting(true);
    setError("");

    const unresolved = [];
    const completed = [];
    const deviceId = getOrCreateDeviceId();

    for (const { item, countedTotal } of preparedAdjustments) {
      const clientEventId =
        createAdjustmentClientEventId();
      const clientCreatedAt = new Date().toISOString();
      const expectedStock = Number(item.new_stock || 0);
      const payload = {
        store_id: storeId,
        product_id: item.product_id,
        counted_total: countedTotal,
        expected_stock: expectedStock,
        reason: "negative_stock_review",
        note: batch.ticket_number
          ? `Negative-stock review after sale #${batch.ticket_number}`
          : "Negative-stock review after sale",
        client_event_id: clientEventId,
        device_id: deviceId,
        client_created_at: clientCreatedAt
      };
      const pendingEvent = {
        client_event_id: clientEventId,
        event_type: "stock_adjustment",
        store_id: storeId,
        device_id: deviceId,
        client_created_at: clientCreatedAt,
        payload
      };

      try {
        const saveResult = await savePendingEvent(
          pendingEvent
        );

        if (saveResult.created) {
          await applyLocalStockCountToCatalog(
            storeId,
            item.product_id,
            countedTotal
          );
        }

        let synchronized = false;

        if (navigator.onLine) {
          try {
            await submitPendingEvent(pendingEvent);
            synchronized = true;
          } catch (syncError) {
            const detail = syncError.response?.data?.detail;

            if (
              syncError.response?.status === 409 &&
              detail?.code === "STOCK_CHANGED"
            ) {
              await offlineDb.pendingEvents.delete(
                clientEventId
              );

              const serverStock = Number(
                detail.current_stock || 0
              );

              await applyLocalStockCountToCatalog(
                storeId,
                item.product_id,
                serverStock
              );

              unresolved.push({
                ...item,
                new_stock: serverStock,
                row_error: t("stock_changed_recount")
              });
              continue;
            }

            // The locally durable event remains pending and
            // will synchronize through the normal queue.
            console.warn(
              "NEGATIVE STOCK REVIEW SAVED PENDING SYNC:",
              syncError
            );
          }
        }

        completed.push({
          product_id: item.product_id,
          new_stock: countedTotal,
          synchronized
        });
      } catch (adjustmentError) {
        console.error(
          "NEGATIVE STOCK REVIEW SAVE ERROR:",
          adjustmentError
        );
        unresolved.push({
          ...item,
          row_error: t("stock_adjustment_failed")
        });
      }
    }

    setSubmitting(false);

    if (completed.length > 0) {
      try {
        await onAdjusted?.(completed);
      } catch (refreshError) {
        console.warn(
          "NEGATIVE STOCK REVIEW REFRESH ERROR:",
          refreshError
        );
      }
    }

    if (unresolved.length > 0) {
      setItems(unresolved);
      setCounts({});
      setError(t("negative_stock_some_not_queued"));
      return;
    }

    onClose();
  };

  return (
    <div style={backdrop} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("negative_stock_sale_alert")}
        style={{
          ...panel,
          width: reviewing
            ? "min(860px, 100%)"
            : "min(480px, 100%)"
        }}
      >
        {!reviewing ? (
          <>
            <h3 style={titleStyle}>
              {t("negative_stock_sale_alert")}
            </h3>
            <p style={descriptionStyle}>
              {t("negative_stock_sale_help")}
            </p>
            <div style={alertList}>
              {items.map(item => (
                <div key={item.product_id} style={alertRow}>
                  <span>{item.product_name}</span>
                  <strong style={{ color: COLORS.danger }}>
                    {item.new_stock}
                  </strong>
                </div>
              ))}
            </div>
            <div style={footer}>
              <button
                type="button"
                onClick={onClose}
                style={btnSecondary}
              >
                {t("close")}
              </button>
              <button
                type="button"
                onClick={() => setReviewing(true)}
                style={btnPrimary}
              >
                {t("review")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={headerStyle}>
              <div>
                <h3 style={titleStyle}>
                  {t("negative_stock_review_title")}
                </h3>
                <p style={descriptionStyle}>
                  {t("negative_stock_review_help")}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label={t("close")}
                style={closeButton}
              >
                ×
              </button>
            </div>

            {error && <div style={errorStyle}>{error}</div>}

            <div style={tableShell}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={leftHeader}>{t("product")}</th>
                    <th style={rightHeader}>{t("current_stock")}</th>
                    <th style={rightHeader}>{t("counted_total")}</th>
                    <th style={rightHeader}>{t("difference")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const rawCount = counts[item.product_id] ?? "";
                    const numericCount = Number(rawCount);
                    const hasCount = rawCount !== "";
                    const difference = hasCount &&
                      Number.isFinite(numericCount)
                      ? numericCount - Number(item.new_stock || 0)
                      : null;

                    return (
                      <tr key={item.product_id} style={tableRow}>
                        <td style={productCell}>
                          <strong>{item.product_name}</strong>
                          {item.location_code && (
                            <span style={locationStyle}>
                              {item.location_code}
                            </span>
                          )}
                          {item.row_error && (
                            <span style={rowErrorStyle}>
                              {item.row_error}
                            </span>
                          )}
                        </td>
                        <td style={numericCell}>
                          <strong style={{ color: COLORS.danger }}>
                            {item.new_stock}
                          </strong>
                        </td>
                        <td style={numericCell}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={rawCount}
                            onChange={event => {
                              setCounts(previous => ({
                                ...previous,
                                [item.product_id]: event.target.value
                              }));
                              setError("");
                            }}
                            disabled={submitting}
                            aria-label={`${t("counted_total")} — ${item.product_name}`}
                            style={countInput}
                          />
                        </td>
                        <td style={numericCell}>
                          <strong
                            style={{
                              color: difference > 0
                                ? "#3ddc84"
                                : difference < 0
                                  ? COLORS.danger
                                  : COLORS.textDim
                            }}
                          >
                            {difference == null
                              ? "—"
                              : `${difference > 0 ? "+" : ""}${difference}`}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={footer}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={btnSecondary}
              >
                {t("close")}
              </button>
              <button
                type="button"
                onClick={submitAdjustments}
                disabled={submitting}
                style={{
                  ...btnPrimary,
                  opacity: submitting ? 0.6 : 1
                }}
              >
                {submitting
                  ? t("loading")
                  : t("queue_adjustments")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const backdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  background: "rgba(0, 0, 0, 0.72)"
};

const panel = {
  maxHeight: "calc(100dvh - 32px)",
  overflow: "auto",
  boxSizing: "border-box",
  padding: 16,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  background: COLORS.panel,
  color: COLORS.text,
  boxShadow: "0 18px 50px rgba(0, 0, 0, 0.48)"
};

const titleStyle = { margin: 0 };
const descriptionStyle = {
  margin: "7px 0 14px",
  color: COLORS.textDim,
  lineHeight: 1.45
};
const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12
};
const closeButton = {
  ...btnSecondary,
  padding: "3px 9px",
  fontSize: 20,
  lineHeight: 1
};
const alertList = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 10,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  background: COLORS.panelAlt
};
const alertRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12
};
const footer = {
  display: "flex",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 16
};
const tableShell = {
  overflow: "auto",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8
};
const tableStyle = {
  width: "100%",
  minWidth: 620,
  borderCollapse: "collapse"
};
const leftHeader = {
  padding: 9,
  textAlign: "left",
  background: COLORS.panelAlt
};
const rightHeader = {
  ...leftHeader,
  textAlign: "right"
};
const tableRow = {
  borderTop: `1px solid ${COLORS.border}`
};
const productCell = {
  padding: 9,
  minWidth: 240
};
const locationStyle = {
  display: "block",
  marginTop: 3,
  color: COLORS.textDim,
  fontSize: 12
};
const rowErrorStyle = {
  display: "block",
  marginTop: 5,
  color: COLORS.danger,
  fontSize: 12
};
const numericCell = {
  padding: 9,
  textAlign: "right"
};
const countInput = {
  ...input,
  width: 105,
  boxSizing: "border-box",
  border: `2px solid ${COLORS.primary}`,
  textAlign: "right"
};
const errorStyle = {
  marginBottom: 12,
  padding: 10,
  borderRadius: 7,
  background: "rgba(255, 92, 92, 0.12)",
  color: COLORS.danger
};

export default NegativeStockSalePrompt;
