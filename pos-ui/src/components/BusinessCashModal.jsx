import {
  useEffect,
  useState
} from "react";
import { useLang } from "../LanguageContext";
import {
  savePendingEvent,
  submitPendingEvent
} from "../offlineEvents";
import {
  getCachedCashCategories,
  loadCashCategories
} from "../cashCategories";
import CustomCashCategoryModal from
  "./CustomCashCategoryModal";

const ADD_CUSTOM_CATEGORY =
  "__add_custom_cash_category__";

const builtInKey = value =>
  `builtin:${value}`;

const customKey = id =>
  `custom:${id}`;

const sources = [
  ["Strongbox", "strongbox"],
  ["Bank", "bank"],
  ["Other Location", "other_location"]
];

const roundMoney = value =>
  Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;

const getDeviceId = () => {
  const key = "vendr_device_id";
  let value = localStorage.getItem(key);

  if (!value) {
    value =
      crypto.randomUUID?.() ||
      "device-" + Date.now() + "-" +
      Math.random().toString(36).slice(2);
    localStorage.setItem(key, value);
  }

  return value;
};

function BusinessCashModal({
  storeId,
  type,
  categories,
  registerLocked = false,
  initialExternalSource = "Strongbox",
  sourceLocked = false,
  titleKey = null,
  onClose,
  onSuccess
}) {
  const { t } = useLang();
  const isExpense = type === "expense";

  const [amount, setAmount] = useState("");
  const [registerAmount, setRegisterAmount] =
    useState(registerLocked ? "0" : "");
  const [registerEdited, setRegisterEdited] =
    useState(registerLocked);
  const [externalSource, setExternalSource] =
    useState(initialExternalSource);
  const [customCategories, setCustomCategories] =
    useState(() =>
      getCachedCashCategories(storeId, type)
    );
  const [categoryKey, setCategoryKey] =
    useState(
      builtInKey(categories[0].value)
    );
  const [showCustomCategory, setShowCustomCategory] =
    useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] =
    useState(false);

  const builtInCategories = categories.map(
    item => ({
      key: builtInKey(item.value),
      value: item.value,
      label: item.label,
      customCategoryId: null,
      isCustom: false
    })
  );

  const customCategoryOptions =
    customCategories.map(item => ({
      key: customKey(item.id),
      value: item.label,
      label: item.label,
      customCategoryId: item.id,
      isCustom: true
    }));

  const categoryOptions = [
    ...builtInCategories,
    ...customCategoryOptions
  ];

  const selectedCategory =
    categoryOptions.find(
      item => item.key === categoryKey
    ) || builtInCategories[0];

  useEffect(() => {
    let cancelled = false;

    if (!storeId) {
      return () => {
        cancelled = true;
      };
    }

    loadCashCategories(storeId, type)
      .then(loadedCategories => {
        if (!cancelled) {
          setCustomCategories(
            loadedCategories
          );
        }
      })
      .catch(error => {
        console.warn(
          "CUSTOM CASH CATEGORY LOAD ERROR:",
          error
        );
      });

    return () => {
      cancelled = true;
    };
  }, [storeId, type]);

  const total = Number(amount);
  const register = Number(registerAmount);
  const external = (
    Number.isFinite(total) &&
    Number.isFinite(register)
  )
    ? roundMoney(total - register)
    : 0;

  const changeTotal = value => {
    setAmount(value);
    if (!registerEdited && !registerLocked) {
      setRegisterAmount(value);
    }
  };

  const refresh = async () => {
    try {
      await onSuccess?.();
    } catch (error) {
      console.warn(
        "CASH BALANCE REFRESH ERROR:",
        error
      );
    }
  };

  const submit = async () => {
    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {
      alert(t("enter_valid_amount"));
      return;
    }

    if (
      !Number.isFinite(register) ||
      register < 0 ||
      register > total
    ) {
      alert(t("invalid_register_amount"));
      return;
    }

    if (!storeId) {
      alert(
        t(
          isExpense
            ? "failed_add_expense"
            : "failed_add_revenue"
        )
      );
      return;
    }

    if (!selectedCategory) {
      alert(t("select_category"));
      return;
    }

    const clientEventId =
      crypto.randomUUID?.() ||
      type + "-" + Date.now() + "-" +
      Math.random().toString(36).slice(2);
    const deviceId = getDeviceId();
    const clientCreatedAt =
      new Date().toISOString();

    const payload = {
      store_id: storeId,
      amount: roundMoney(total),
      register_amount:
        roundMoney(register),
      external_amount:
        external > 0 ? external : 0,
      external_source:
        external > 0
          ? externalSource
          : null,
      type,
      category: selectedCategory.value,
      custom_category_id:
        selectedCategory.customCategoryId,
      note: note.trim(),
      client_event_id: clientEventId,
      device_id: deviceId,
      client_created_at: clientCreatedAt
    };

    const pendingEvent = {
      client_event_id: clientEventId,
      event_type: type,
      store_id: storeId,
      device_id: deviceId,
      client_created_at: clientCreatedAt,
      payload
    };

    setSubmitting(true);

    try {
      await savePendingEvent(pendingEvent);

      try {
        await submitPendingEvent(
          pendingEvent
        );
        await refresh();
        alert(
          t(
            isExpense
              ? "expense_completed"
              : "revenue_completed"
          )
        );
      } catch (syncError) {
        console.warn(
          "BUSINESS CASH EVENT PENDING:",
          syncError
        );
        await refresh();
        alert(
          t(
            isExpense
              ? "expense_saved_pending"
              : "revenue_saved_pending"
          )
        );
      }

      onClose();
    } catch (error) {
      console.error(
        "BUSINESS CASH EVENT ERROR:",
        error
      );
      alert(
        t(
          isExpense
            ? "failed_add_expense"
            : "failed_add_revenue"
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ margin: 0 }}>
          {t(
            titleKey || (
              isExpense
                ? "add_expense"
                : "add_revenue"
            )
          )}
        </h3>

        <Field
          label={t(
            isExpense
              ? "total_expense"
              : "total_revenue"
          )}
        >
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={event =>
              changeTotal(event.target.value)
            }
            disabled={submitting}
            style={inputStyle}
          />
        </Field>

        <select
          value={categoryKey}
          onChange={event => {
            if (
              event.target.value ===
              ADD_CUSTOM_CATEGORY
            ) {
              setShowCustomCategory(true);
              return;
            }

            setCategoryKey(event.target.value);
          }}
          disabled={submitting}
          style={inputStyle}
        >
          {categoryOptions.map(item => (
            <option
              key={item.key}
              value={item.key}
            >
              {item.isCustom
                ? item.label
                : t(item.label)}
            </option>
          ))}
          <option
            value={ADD_CUSTOM_CATEGORY}
          >
            {t("add_custom_category")}
          </option>
        </select>

        <Field
          label={t(
            isExpense
              ? "paid_from_register"
              : "received_in_register"
          )}
        >
          <input
            type="number"
            min="0"
            max={
              Number.isFinite(total)
                ? total
                : undefined
            }
            step="0.01"
            inputMode="decimal"
            value={registerAmount}
            onChange={event => {
              setRegisterEdited(true);
              setRegisterAmount(
                event.target.value
              );
            }}
            disabled={
              submitting || registerLocked
            }
            style={inputStyle}
          />
        </Field>

        {external > 0 && (
          <div style={allocationStyle}>
            <div>
              <span style={labelStyle}>
                {t("remaining_amount")}
              </span>
              <strong>
                {"$" + external.toFixed(2)}
              </strong>
            </div>

            <Field
              label={t(
                isExpense
                  ? "paid_from"
                  : "received_at"
              )}
            >
              <select
                value={externalSource}
                onChange={event =>
                  setExternalSource(
                    event.target.value
                  )
                }
                disabled={
                  submitting || sourceLocked
                }
                style={inputStyle}
              >
                {sources.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {t(label)}
                    </option>
                  )
                )}
              </select>
            </Field>
          </div>
        )}

        <input
          type="text"
          placeholder={t("note_optional")}
          value={note}
          onChange={event =>
            setNote(event.target.value)
          }
          disabled={submitting}
          style={inputStyle}
        />

        <div style={buttonRow}>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            style={btnPrimary}
          >
            {submitting
              ? t("loading")
              : t("confirm")}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={btnDanger}
          >
            {t("cancel")}
          </button>
        </div>
      </div>

      {showCustomCategory && (
        <CustomCashCategoryModal
          storeId={storeId}
          type={type}
          onClose={() =>
            setShowCustomCategory(false)
          }
          onCreated={createdCategory => {
            setCustomCategories(current =>
              [
                ...current.filter(
                  item =>
                    item.id !==
                    createdCategory.id
                ),
                createdCategory
              ].sort((left, right) =>
                left.label.localeCompare(
                  right.label,
                  undefined,
                  { sensitivity: "base" }
                )
              )
            );
            setCategoryKey(
              customKey(createdCategory.id)
            );
            setShowCustomCategory(false);
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>
        {label}
      </span>
      {children}
    </label>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
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
  maxWidth: 380,
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 5
};

const labelStyle = {
  color: "#9da7b3",
  fontSize: 12,
  display: "block",
  marginBottom: 4
};

const allocationStyle = {
  padding: 10,
  background: "#222733",
  border: "1px solid #2f3542",
  borderRadius: 8
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

const buttonBase = {
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer",
  flex: 1
};

const btnPrimary = {
  ...buttonBase,
  background: "#3aa0ff"
};

const btnDanger = {
  ...buttonBase,
  background: "#ff5c5c"
};

export default BusinessCashModal;
