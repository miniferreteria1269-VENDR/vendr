import {
  useState
} from "react";

import {
  useLang
} from "../LanguageContext";

import {
  savePendingEvent,
  submitPendingEvent
} from "../offlineEvents";

import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  input
} from "../uiStyles";

const createClientEventId = prefix =>
  crypto.randomUUID?.() ||
  `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem(
    "vendr_device_id"
  );

  if (!deviceId) {
    deviceId =
      createClientEventId("device");

    localStorage.setItem(
      "vendr_device_id",
      deviceId
    );
  }

  return deviceId;
};

function CashMovementModal({
  storeId,
  mode,
  onClose,
  onSuccess
}) {
  const { t } = useLang();

  const isTransfer =
    mode === "transfer";

  const [
    direction,
    setDirection
  ] = useState("out");

  const [
    amount,
    setAmount
  ] = useState("");

  const [
    cashLocation,
    setCashLocation
  ] = useState("Strongbox");

  const [
    note,
    setNote
  ] = useState("");

  const [
    submitting,
    setSubmitting
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const submit = async () => {
    if (submitting) return;

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        t("amount_greater_than_zero")
      );
      return;
    }

    if (
      isTransfer &&
      !String(cashLocation).trim()
    ) {
      setError(
        t("select_cash_location")
      );
      return;
    }

    const eventType = isTransfer
      ? (
          direction === "in"
            ? "cash_transfer_in"
            : "cash_transfer_out"
        )
      : (
          direction === "in"
            ? "cash_adjustment_positive"
            : "cash_adjustment_negative"
        );

    const clientEventId =
      createClientEventId(eventType);

    const deviceId =
      getOrCreateDeviceId();

    const clientCreatedAt =
      new Date().toISOString();

    const payload = {
      store_id: storeId,
      type: eventType,
      amount: numericAmount,
      register_amount: numericAmount,
      external_amount: 0,
      external_source: isTransfer
        ? String(cashLocation).trim()
        : null,
      category: isTransfer
        ? "Internal Transfer"
        : "Cash Adjustment",
      note: note.trim() || null,
      client_event_id:
        clientEventId,
      device_id: deviceId,
      client_created_at:
        clientCreatedAt
    };

    const pendingEvent = {
      client_event_id:
        clientEventId,
      event_type: eventType,
      store_id: storeId,
      device_id: deviceId,
      client_created_at:
        clientCreatedAt,
      payload
    };

    setSubmitting(true);
    setError("");

    try {
      await savePendingEvent(
        pendingEvent
      );

      let synchronized = false;

      if (navigator.onLine) {
        try {
          await submitPendingEvent(
            pendingEvent
          );

          synchronized = true;
        } catch (syncError) {
          console.warn(
            "CASH MOVEMENT SAVED PENDING SYNC:",
            syncError
          );
        }
      }

      alert(
        synchronized
          ? t("cash_movement_recorded")
          : t("cash_movement_saved_pending")
      );

      if (onSuccess) {
        await onSuccess();
      }

      if (onClose) {
        onClose();
      }
    } catch (submitError) {
      console.error(
        "CASH MOVEMENT SAVE ERROR:",
        submitError
      );

      setError(
        t("cash_movement_failed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={event => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0, 0, 0, 0.7)"
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          ...card,
          width: "min(500px, 100%)",
          color: COLORS.text
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {isTransfer
            ? t("move_cash")
            : t("adjust_register")}
        </h3>

        <label
          style={{
            display: "block",
            marginBottom: 12
          }}
        >
          <span
            style={{
              display: "block",
              color: COLORS.textDim,
              marginBottom: 5
            }}
          >
            {isTransfer
              ? t("movement_direction")
              : t("adjustment_direction")}
          </span>

          <select
            value={direction}
            onChange={event =>
              setDirection(
                event.target.value
              )
            }
            disabled={submitting}
            style={{
              ...input,
              width: "100%"
            }}
          >
            <option value="out">
              {isTransfer
                ? t("out_of_register")
                : t("register_decrease")}
            </option>

            <option value="in">
              {isTransfer
                ? t("into_register")
                : t("register_increase")}
            </option>
          </select>
        </label>

        <label
          style={{
            display: "block",
            marginBottom: 12
          }}
        >
          <span
            style={{
              display: "block",
              color: COLORS.textDim,
              marginBottom: 5
            }}
          >
            {t("amount")}
          </span>

          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={event =>
              setAmount(
                event.target.value
              )
            }
            disabled={submitting}
            style={{
              ...input,
              width: "100%"
            }}
          />
        </label>

        {isTransfer && (
          <label
            style={{
              display: "block",
              marginBottom: 12
            }}
          >
            <span
              style={{
                display: "block",
                color: COLORS.textDim,
                marginBottom: 5
              }}
            >
              {direction === "in"
                ? t("cash_source")
                : t("cash_destination")}
            </span>

            <select
              value={cashLocation}
              onChange={event =>
                setCashLocation(
                  event.target.value
                )
              }
              disabled={submitting}
              style={{
                ...input,
                width: "100%"
              }}
            >
              <option value="Strongbox">
                {t("strongbox")}
              </option>

              <option value="Bank">
                {t("bank")}
              </option>

              <option value="Other Location">
                {t("other_location")}
              </option>
            </select>
          </label>
        )}

        <label
          style={{
            display: "block",
            marginBottom: 12
          }}
        >
          <span
            style={{
              display: "block",
              color: COLORS.textDim,
              marginBottom: 5
            }}
          >
            {t("note")}
          </span>

          <input
            value={note}
            onChange={event =>
              setNote(
                event.target.value
              )
            }
            placeholder={t("optional")}
            disabled={submitting}
            style={{
              ...input,
              width: "100%"
            }}
          />
        </label>

        {!isTransfer && (
          <div
            style={{
              color: COLORS.textDim,
              marginBottom: 12
            }}
          >
            {t(
              "adjustment_no_profit_effect"
            )}
          </div>
        )}

        {isTransfer && (
          <div
            style={{
              color: COLORS.textDim,
              marginBottom: 12
            }}
          >
            {t(
              "cash_transfer_no_profit_effect"
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              color: COLORS.danger,
              marginBottom: 12
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            flexWrap: "wrap"
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={btnSecondary}
          >
            {t("cancel")}
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            style={{
              ...btnPrimary,
              opacity:
                submitting ? 0.6 : 1
            }}
          >
            {submitting
              ? t("saving")
              : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CashMovementModal;
