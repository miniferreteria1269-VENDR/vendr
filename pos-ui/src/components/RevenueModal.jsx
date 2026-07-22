import { useState } from "react";

import { useLang } from "../LanguageContext";

import {
  savePendingEvent,
  submitPendingEvent
} from "../offlineEvents";

const categories = [
  "Aporte Dueño",
  "Inversion Socio",
  "Prestamo Recibido",
  "Transferencia Interna",
  "Ajuste Caja",
  "Otros"
];

const getDeviceId = () => {
  const storageKey = "vendr_device_id";

  let deviceId =
    localStorage.getItem(storageKey);

  if (!deviceId) {
    deviceId =
      crypto.randomUUID?.() ||
      `device-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    localStorage.setItem(
      storageKey,
      deviceId
    );
  }

  return deviceId;
};

const createClientEventId = () =>
  crypto.randomUUID?.() ||
  `revenue-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

function RevenueModal({
  storeId,
  onClose,
  onSuccess
}) {
  const { t } = useLang();

  const [amount, setAmount] =
    useState("");

  const [category, setCategory] =
    useState(categories[0]);

  const [note, setNote] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const refreshCashPanel = async () => {
    try {
      await onSuccess?.();
    } catch (refreshError) {
      console.warn(
        "REVENUE BALANCE REFRESH ERROR:",
        refreshError
      );
    }
  };

  const submit = async () => {
    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      alert(t("enter_valid_amount"));
      return;
    }

    if (!storeId) {
      alert(t("failed_add_revenue"));
      return;
    }

    const clientEventId =
      createClientEventId();

    const deviceId =
      getDeviceId();

    const clientCreatedAt =
      new Date().toISOString();

    const payload = {
      store_id: storeId,
      amount: numericAmount,
      type: "revenue",
      category,
      note: note.trim(),
      client_event_id: clientEventId,
      device_id: deviceId,
      client_created_at: clientCreatedAt
    };

    const pendingEvent = {
      client_event_id: clientEventId,
      event_type: "revenue",
      store_id: storeId,
      device_id: deviceId,
      client_created_at: clientCreatedAt,
      payload
    };

    setSubmitting(true);

    try {
      /*
       * Save the event locally before making any
       * network request.
       */
      await savePendingEvent(
        pendingEvent
      );

      try {
        /*
         * Online path:
         *
         * The backend accepts the revenue and
         * submitPendingEvent removes it from the queue.
         */
        await submitPendingEvent(
          pendingEvent
        );

        /*
         * Refresh after synchronization so the backend
         * balance already includes this revenue.
         */
        await refreshCashPanel();

        alert(
          t("revenue_completed")
        );
      } catch (syncError) {
        /*
         * Offline path:
         *
         * The event remains in pendingEvents.
         * CashPanel will calculate:
         *
         * cached confirmed balance
         * + pending revenue
         */
        console.warn(
          "REVENUE SAVED PENDING SYNC:",
          syncError
        );

        await refreshCashPanel();

        alert(
          t("revenue_saved_pending")
        );
      }

      onClose();
    } catch (saveError) {
      console.error(
        "REVENUE LOCAL SAVE ERROR:",
        saveError
      );

      alert(
        t("failed_add_revenue")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={titleStyle}>
          {t("add_revenue")}
        </h3>

        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder={t("amount")}
          value={amount}
          onChange={event =>
            setAmount(
              event.target.value
            )
          }
          disabled={submitting}
          style={inputStyle}
        />

        <select
          value={category}
          onChange={event =>
            setCategory(
              event.target.value
            )
          }
          disabled={submitting}
          style={inputStyle}
        >
          {categories.map(item => (
            <option
              key={item}
              value={item}
            >
              {t(item)}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder={t("note_optional")}
          value={note}
          onChange={event =>
            setNote(
              event.target.value
            )
          }
          disabled={submitting}
          style={inputStyle}
        />

        <div style={buttonRow}>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            style={{
              ...btnPrimary,
              opacity:
                submitting ? 0.6 : 1,
              cursor:
                submitting
                  ? "default"
                  : "pointer"
            }}
          >
            {submitting
              ? t("loading")
              : t("confirm")}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              ...btnDanger,
              opacity:
                submitting ? 0.6 : 1,
              cursor:
                submitting
                  ? "default"
                  : "pointer"
            }}
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0, 0, 0, 0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  boxSizing: "border-box",
  zIndex: 1000
};

const modalStyle = {
  background: "#1a1d24",
  padding: 20,
  borderRadius: 12,
  border: "1px solid #2f3542",
  color: "#e6edf3",
  width: "100%",
  maxWidth: 320,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  boxSizing: "border-box"
};

const titleStyle = {
  margin: 0,
  marginBottom: 12
};

const inputStyle = {
  width: "100%",
  minHeight: 40,
  background: "#2a2f3a",
  border: "1px solid #3a4250",
  borderRadius: 6,
  color: "white",
  padding: 8,
  boxSizing: "border-box"
};

const buttonRow = {
  display: "flex",
  gap: 10,
  marginTop: 10
};

const btnPrimary = {
  background: "#3aa0ff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer",
  flex: 1
};

const btnDanger = {
  background: "#ff5c5c",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer",
  flex: 1
};

export default RevenueModal;
