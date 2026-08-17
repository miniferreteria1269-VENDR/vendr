import {
  useLang
} from "../LanguageContext";

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

const TICKET_ROW_WIDTH = 620;

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
  intakeSuppliers,
  intakeSupplierId,
  setIntakeSupplierId,

  saleClients,
  saleClientId,
  saleIsCredit,
  saleDueDate,
  updateSaleCreditField,

  discountValue,
  setDiscountValue,
  discountType,
  setDiscountType,
  mobile = false
}) {
  const { t } = useLang();

  const ticketItems =
    Array.isArray(
      currentTicket?.items
    )
      ? currentTicket.items
      : [];

  const subtotal =
    ticketItems.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
          Number(item.quantity || 0),
      0
    );

  const discountAmount =
    discountType === "percent"
      ? subtotal *
        (
          Number(
            discountValue || 0
          ) / 100
        )
      : Number(
          discountValue || 0
        );

  const intakeTotal =
    ticketItems.reduce(
      (sum, item) =>
        sum +
        Number(item.cost || 0) *
          Number(item.quantity || 0),
      0
    );

  const total =
    currentTicket?.type === "sale"
      ? Math.max(
          subtotal - discountAmount,
          0
        )
      : intakeTotal;

  const totalCost =
    ticketItems.reduce(
      (sum, item) =>
        sum +
        Number(item.cost || 0) *
          Number(item.quantity || 0),
      0
    );

  const profit =
    total - totalCost;

  const intakeIsFinalizing =
    currentTicket?.type === "intake" &&
    finalizingIntake;

  const selectedSaleClient =
    (saleClients || []).find(
      client =>
        Number(client.client_id) ===
        Number(saleClientId)
    ) || null;

  const toggleFiado = () => {
    if (!saleIsCredit) {
      if (!selectedSaleClient) {
        alert(
          t("fiado_client_required")
        );

        return;
      }

      const confirmationMessage =
        t("confirm_enable_fiado")
          .replaceAll(
            "{client}",
            selectedSaleClient
              .client_name
          );

      if (
        !window.confirm(
          confirmationMessage
        )
      ) {
        return;
      }

      updateSaleCreditField(
        "is_credit",
        true
      );

      return;
    }

    if (
      !window.confirm(
        t("confirm_disable_fiado")
      )
    ) {
      return;
    }

    updateSaleCreditField(
      "is_credit",
      false
    );

    updateSaleCreditField(
      "due_date",
      ""
    );
  };

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,

        background: COLORS.panel,
        borderRadius: 14,
        padding: mobile ? 12 : 16,

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
              finalizingIntake
                ? 0.6
                : 1,

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
              finalizingIntake
                ? 0.6
                : 1,

            cursor:
              finalizingIntake
                ? "default"
                : "pointer"
          }}
        >
          + {t("intake")}
        </button>
      </div>

      {/* TICKET TABS */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
          flexWrap: "wrap"
        }}
      >
        {tickets.map(
          (ticket, index) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() =>
                setActiveTicket(
                  ticket.id
                )
              }
              onContextMenu={event => {
                event.preventDefault();

                if (
                  !finalizingIntake
                ) {
                  renameTicket(
                    ticket.id
                  );
                }
              }}
              disabled={
                finalizingIntake
              }
              style={{
                ...tabStyle,

                background:
                  ticket.id ===
                  activeTicket
                    ? COLORS.primary
                    : COLORS.panelAlt,

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
              {ticket.label ||
                `${ticket.type} ${
                  index + 1
                }`}
            </button>
          )
        )}
      </div>

      {/* ACTIVE TICKET */}
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
          {/* TICKET HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-start",
              alignItems: "center",
              gap: 10,
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
                (
                  currentTicket.type ===
                  "sale"
                    ? t("sale_ticket")
                    : t(
                        "intake_ticket"
                      )
                )}
            </h3>

            {/* SALE OPTIONS */}
            {currentTicket.type ===
              "sale" && (
              <>
                <select
                  aria-label={
                    t("select_client")
                  }
                  value={
                    saleClientId ?? ""
                  }
                  onChange={event => {
                    const clientId =
                      event.target
                        .value === ""
                        ? null
                        : Number(
                            event.target
                              .value
                          );

                    updateSaleCreditField(
                      "client_id",
                      clientId
                    );

                    if (
                      clientId ===
                        null &&
                      saleIsCredit
                    ) {
                      updateSaleCreditField(
                        "is_credit",
                        false
                      );

                      updateSaleCreditField(
                        "due_date",
                        ""
                      );
                    }
                  }}
                  style={{
                    ...inputStyle,
                    width: 240,
                    maxWidth: "100%"
                  }}
                >
                  <option value="">
                    {t(
                      "walk_in_no_client"
                    )}
                  </option>

                  {(saleClients || [])
                    .map(client => (
                      <option
                        key={
                          client.client_id
                        }
                        value={
                          client.client_id
                        }
                      >
                        {
                          client.client_name
                        }
                      </option>
                    ))}
                </select>

                {selectedSaleClient && (
                  <span
                    style={{
                      color:
                        selectedSaleClient
                          .has_overdue_balance
                          ? COLORS.danger
                          : COLORS.textDim,

                      fontSize: 11,
                      fontWeight: "bold",
                      whiteSpace:
                        "nowrap"
                    }}
                  >
                    {t("balance")}: $
                    {Number(
                      selectedSaleClient
                        .outstanding_balance ||
                        0
                    ).toFixed(2)}
                  </span>
                )}

                {/* DISCOUNT */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                    flexWrap: "wrap",
                    marginLeft: "auto"
                  }}
                >
                  <select
                    value={
                      discountType
                    }
                    onChange={event =>
                      setDiscountType(
                        event.target.value
                      )
                    }
                    style={{
                      ...inputStyle,
                      width: 52
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
                    value={
                      discountValue
                    }
                    onChange={event =>
                      setDiscountValue(
                        Number(
                          event.target
                            .value
                        )
                      )
                    }
                    style={{
                      ...inputStyle,
                      width: 72
                    }}
                  />

                  <span
                    style={{
                      fontSize: 12,
                      color:
                        COLORS.textDim,
                      whiteSpace:
                        "nowrap"
                    }}
                  >
                    {t("discount")}: -$
                    {discountAmount
                      .toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* INTAKE OPTIONS */}
          {currentTicket.type ===
            "intake" && (
            <div
              style={{
                display: "flex",
                alignItems: "end",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 10,

                opacity:
                  intakeIsFinalizing
                    ? 0.6
                    : 1
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: 5,
                  minWidth: 240
                }}
              >
                <span>
                  {t("supplier")}
                </span>

                <select
                  value={
                    intakeSupplierId ??
                    ""
                  }
                  onChange={event =>
                    setIntakeSupplierId(
                      event.target.value
                    )
                  }
                  disabled={
                    intakeIsFinalizing
                  }
                  style={{
                    ...inputStyle,
                    width: "100%"
                  }}
                >
                  <option value="">
                    {t(
                      "unassigned_supplier"
                    )}
                  </option>

                  {(intakeSuppliers || [])
                    .map(supplier => (
                      <option
                        key={
                          supplier.supplier_id
                        }
                        value={
                          supplier.supplier_id
                        }
                      >
                        {
                          supplier.supplier_name
                        }
                      </option>
                    ))}
                </select>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  minHeight: 34
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    intakePaid
                  }
                  onChange={event =>
                    setIntakePaid(
                      event.target
                        .checked
                    )
                  }
                  disabled={
                    intakeIsFinalizing
                  }
                />

                {t("paid")}
              </label>
            </div>
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

              touchAction:
                "pan-x pan-y",

              overscrollBehavior:
                "contain",

              paddingBottom: 8
            }}
          >
            <div
              style={{
                width: "max-content",
                minWidth: "100%"
              }}
            >
              {/* COLUMN HEADERS */}
              {ticketItems.length > 0 && (
                <div
                  style={{
                    display: "grid",

                    gridTemplateColumns:
                      "minmax(145px, 1fr) " +
                      "170px " +
                      "86px " +
                      "110px " +
                      "42px",

                    gap: 7,
                    alignItems: "end",

                    width:
                      TICKET_ROW_WIDTH,

                    minWidth:
                      TICKET_ROW_WIDTH,

                    boxSizing:
                      "border-box",

                    padding:
                      "0 6px 5px",

                    marginBottom: 2,

                    position: "sticky",
                    top: 0,
                    zIndex: 2,

                    background:
                      COLORS.panel,

                    color:
                      COLORS.textDim,

                    fontSize: 11,
                    fontWeight: 600
                  }}
                >
                  <div>
                    {t("product")}
                  </div>

                  <div
                    style={{
                      textAlign:
                        "center"
                    }}
                  >
                    {t("quantity")}
                  </div>

                  <div
                    style={{
                      textAlign:
                        "center"
                    }}
                  >
                    {currentTicket.type ===
                    "intake"
                      ? t("unit_cost")
                      : t(
                          "sales_price_per_unit"
                        )}
                  </div>

                  <div
                    style={{
                      textAlign:
                        "center"
                    }}
                  >
                    {currentTicket.type ===
                    "intake"
                      ? t(
                          "sales_price_per_unit"
                        )
                      : t(
                          "line_total"
                        )}
                  </div>

                  <div />
                </div>
              )}

              {/* ITEM ROWS */}
              {ticketItems.map(
                (item, index) => (
                  <div
                    key={
                      `${item.product_id}-${index}`
                    }
                    style={{
                      ...rowWrapper,

                      width:
                        TICKET_ROW_WIDTH,

                      minWidth:
                        TICKET_ROW_WIDTH,

                      boxSizing:
                        "border-box"
                    }}
                  >
                    <TicketRow
                      item={item}
                      index={index}
                      removeItem={
                        removeItem
                      }
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

          {/* SALE LOSS WARNING */}
          {currentTicket.type ===
            "sale" &&
            profit < 0 && (
              <div
                style={{
                  color:
                    COLORS.danger,
                  marginTop: 6,
                  flexShrink: 0
                }}
              >
                ⚠ {t("loss_on_sale")}
              </div>
            )}

          {/* FOOTER */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
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
              {/* SALE ACTIONS */}
              {currentTicket.type ===
                "sale" && (
                <>
                  <button
                    type="button"
                    onClick={
                      finalizeSale
                    }
                    style={
                      btnPrimary
                    }
                  >
                    {t(
                      "finalize_sale"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={
                      toggleFiado
                    }
                    aria-pressed={
                      saleIsCredit
                    }
                    style={{
                      ...btnSecondary,

                      background:
                        saleIsCredit
                          ? "#b7791f"
                          : btnSecondary
                              .background,

                      fontWeight:
                        saleIsCredit
                          ? "bold"
                          : "normal"
                    }}
                  >
                    {t("fiado")}
                    {saleIsCredit
                      ? " ✓"
                      : ""}
                  </button>

                  {saleIsCredit && (
                    <input
                      type="date"
                      aria-label={
                        t("due_date")
                      }
                      title={
                        t("due_date")
                      }
                      value={
                        saleDueDate ||
                        ""
                      }
                      onChange={event =>
                        updateSaleCreditField(
                          "due_date",
                          event.target
                            .value
                        )
                      }
                      style={{
                        ...inputStyle,
                        width: 148
                      }}
                    />
                  )}
                </>
              )}

              {/* INTAKE ACTION */}
              {currentTicket.type ===
                "intake" && (
                <button
                  type="button"
                  onClick={
                    finalizeIntake
                  }
                  disabled={
                    finalizingIntake
                  }
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
                    : t(
                        "finalize_intake"
                      )}
                </button>
              )}

              <button
                type="button"
                onClick={
                  cancelTicket
                }
                disabled={
                  intakeIsFinalizing
                }
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

            {/* TICKET TOTAL */}
            <div
              style={{
                minWidth: 180,
                padding: "10px 16px",
                boxSizing:
                  "border-box",
                borderRadius: 10,
                background: "#0b1220",

                border:
                  `1px solid ${
                    COLORS.primary
                  }`,

                color:
                  COLORS.primary,

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
