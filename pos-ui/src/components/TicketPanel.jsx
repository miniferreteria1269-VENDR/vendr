import { useLang } from "../LanguageContext";
import TicketRow from "./TicketRow";

const COLORS = {
  panel: "#1a1d24",
  panelAlt: "#222733",
  border: "#2f3542",
  text: "#e6edf3",
  textDim: "#9da7b3",
  primary: "#3aa0ff",
  danger: "#ff5c5c"
};

function TicketPanel({
  tickets,
  activeTicket,
  setActiveTicket,
  currentTicket,
  createTicket,
  removeItem,
  updateItemField,
  finalizeSale,
  finalizeIntake,
  finalizingIntake,
  cancelTicket,
  renameTicket,
  intakePaid,
  setIntakePaid,
  discountValue,
  setDiscountValue,
  discountType,
  setDiscountType
}) {
  const { t } = useLang();

  const subtotal =
    currentTicket?.items.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
          Number(item.quantity || 0),
      0
    ) || 0;

  const discountAmount =
    discountType === "percent"
      ? subtotal *
        (Number(discountValue || 0) / 100)
      : Number(discountValue || 0);

  const total =
    currentTicket?.type === "sale"
      ? Math.max(
          subtotal - discountAmount,
          0
        )
      : currentTicket?.items.reduce(
          (sum, item) =>
            sum +
            Number(item.cost || 0) *
              Number(item.quantity || 0),
          0
        ) || 0;

  const totalCost =
    currentTicket?.items.reduce(
      (sum, item) =>
        sum +
        Number(item.cost || 0) *
          Number(item.quantity || 0),
      0
    ) || 0;

  const profit = total - totalCost;

  const intakeIsFinalizing =
    currentTicket?.type === "intake" &&
    finalizingIntake;

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,

        background: COLORS.panel,
        borderRadius: 14,
        padding: 16,

        display: "flex",
        flexDirection: "column",

        overflow: "hidden",
        boxSizing: "border-box",

        color: COLORS.text
      }}
    >
      {/* CREATE BUTTONS */}
      <div
        style={{
          marginBottom: 10,
          display: "flex",
          gap: 8
        }}
      >
        <button
          type="button"
          onClick={() =>
            createTicket("sale")
          }
          disabled={finalizingIntake}
          style={{
            ...btnPrimary,
            opacity:
              finalizingIntake ? 0.6 : 1,
            cursor:
              finalizingIntake
                ? "default"
                : "pointer"
          }}
        >
          + {t("sale")}
        </button>

        <button
          type="button"
          onClick={() =>
            createTicket("intake")
          }
          disabled={finalizingIntake}
          style={{
            ...btnSecondary,
            opacity:
              finalizingIntake ? 0.6 : 1,
            cursor:
              finalizingIntake
                ? "default"
                : "pointer"
          }}
        >
          + {t("intake")}
        </button>
      </div>

      {/* TABS */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
          flexWrap: "wrap"
        }}
      >
        {tickets.map((ticket, index) => (
          <button
            key={ticket.id}
            type="button"
            onClick={() =>
              setActiveTicket(ticket.id)
            }
            onContextMenu={event => {
              event.preventDefault();

              if (!finalizingIntake) {
                renameTicket(ticket.id);
              }
            }}
            disabled={finalizingIntake}
            style={{
              ...tabStyle,
              background:
                ticket.id === activeTicket
                  ? COLORS.primary
                  : COLORS.panelAlt,
              opacity:
                finalizingIntake ? 0.6 : 1,
              cursor:
                finalizingIntake
                  ? "default"
                  : "pointer"
            }}
          >
            {ticket.label ||
              `${ticket.type} ${index + 1}`}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {currentTicket && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
              flexWrap: "wrap",
              flexShrink: 0
            }}
          >
            <h3
              style={{
                margin: 0
              }}
            >
              {currentTicket.label ||
                (currentTicket.type === "sale"
                  ? t("sale_ticket")
                  : t("intake_ticket"))}
            </h3>

            {currentTicket.type === "sale" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  minWidth: 0,
                  flexWrap: "wrap"
                }}
              >
                <select
                  value={discountType}
                  onChange={event =>
                    setDiscountType(
                      event.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    width: 58
                  }}
                >
                  <option value="percent">
                    %
                  </option>

                  <option value="amount">
                    $
                  </option>
                </select>

                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={event =>
                    setDiscountValue(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  style={{
                    ...inputStyle,
                    width: 120
                  }}
                />

                <span
                  style={{
                    fontSize: 12,
                    color: COLORS.textDim,
                    whiteSpace: "nowrap"
                  }}
                >
                  {t("discount")}: -$
                  {discountAmount.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* INTAKE PAID */}
          {currentTicket.type === "intake" && (
            <label
              style={{
                marginBottom: 10,
                opacity:
                  intakeIsFinalizing
                    ? 0.6
                    : 1
              }}
            >
              <input
                type="checkbox"
                checked={intakePaid}
                onChange={event =>
                  setIntakePaid(
                    event.target.checked
                  )
                }
                disabled={intakeIsFinalizing}
              />
              {" "}
              {t("paid")}
            </label>
          )}

          {/* ITEMS */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,

              overflowX: "auto",
              overflowY: "auto",

              WebkitOverflowScrolling:
                "touch",

              touchAction: "pan-x pan-y",
              overscrollBehavior: "contain",

              paddingBottom: 8
            }}
          >
            <div
              style={{
                width: "max-content",
                minWidth: "100%"
              }}
            >
              {currentTicket.items.map(
                (item, index) => (
                  <div
                    key={`${item.product_id}-${index}`}
                    style={{
                      ...rowWrapper,
                      width: 620,
                      minWidth: 620,
                      boxSizing: "border-box"
                    }}
                  >
                    <TicketRow
                      item={item}
                      index={index}
                      removeItem={removeItem}
                      updateItemField={
                        updateItemField
                      }
                      ticketType={
                        currentTicket.type
                      }
                      disabled={
                        intakeIsFinalizing
                      }
                    />
                  </div>
                )
              )}
            </div>
          </div>

          {/* WARNING */}
          {currentTicket.type === "sale" &&
            profit < 0 && (
              <div
                style={{
                  color: COLORS.danger,
                  marginTop: 6,
                  flexShrink: 0
                }}
              >
                ⚠ {t("loss_on_sale")}
              </div>
            )}

          {/* FOOTER: ACTIONS + TOTAL */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              flexShrink: 0
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap"
              }}
            >
              {currentTicket.type === "sale" && (
                <button
                  type="button"
                  onClick={finalizeSale}
                  style={btnPrimary}
                >
                  {t("finalize_sale")}
                </button>
              )}

              {currentTicket.type === "intake" && (
                <button
                  type="button"
                  onClick={finalizeIntake}
                  disabled={finalizingIntake}
                  style={{
                    ...btnPrimary,
                    opacity:
                      finalizingIntake
                        ? 0.6
                        : 1,
                    cursor:
                      finalizingIntake
                        ? "default"
                        : "pointer"
                  }}
                >
                  {finalizingIntake
                    ? t("loading")
                    : t("finalize_intake")}
                </button>
              )}

              <button
                type="button"
                onClick={cancelTicket}
                disabled={intakeIsFinalizing}
                style={{
                  ...btnDanger,
                  opacity:
                    intakeIsFinalizing
                      ? 0.6
                      : 1,
                  cursor:
                    intakeIsFinalizing
                      ? "default"
                      : "pointer"
                }}
              >
                {t("cancel")}
              </button>
            </div>

            <div
              style={{
                minWidth: 180,
                padding: "10px 16px",
                boxSizing: "border-box",
                borderRadius: 10,
                background: "#0b1220",
                border:
                  `1px solid ${COLORS.primary}`,
                color: COLORS.primary,
                fontSize: 22,
                fontWeight: "bold",
                textAlign: "right",
                whiteSpace: "nowrap"
              }}
            >
              ${total.toFixed(2)}
            </div>
          </div>
          </div>
      )}
    </div>
  );
}

const btnPrimary = {
  background: "#3aa0ff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer"
};

const btnSecondary = {
  background: "#2a2f3a",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer"
};

const btnDanger = {
  background: "#ff5c5c",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer"
};

const tabStyle = {
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  color: "white",
  cursor: "pointer"
};

const rowWrapper = {
  background: "#222733",
  borderRadius: 8,
  padding: 6,
  marginBottom: 6
};

const inputStyle = {
  background: "#2a2f3a",
  border: "1px solid #3a4250",
  borderRadius: 6,
  color: "white",
  padding: 6
};

export default TicketPanel;
