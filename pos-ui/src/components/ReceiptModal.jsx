import {
  useLang
} from "../LanguageContext";

const COLORS = {
  overlay:
    "rgba(0, 0, 0, 0.72)",
  panel: "#1a1d24",
  panelAlt: "#222733",
  border: "#2f3542",
  text: "#e6edf3",
  textDim: "#9da7b3",
  primary: "#3aa0ff"
};

/*
 * Currency totals always display
 * exactly two decimal places.
 */
const formatMoney = value =>
  Number(
    value || 0
  ).toFixed(2);

/*
 * Unit prices display a third decimal
 * only when it is actually needed.
 *
 * 0.33  -> 0.33
 * 0.333 -> 0.333
 * 1.5   -> 1.50
 */
const formatUnitPrice = value => {
  const numericValue =
    Number(value || 0);

  const threeDecimals =
    numericValue.toFixed(3);

  if (
    threeDecimals.endsWith("0")
  ) {
    return numericValue.toFixed(2);
  }

  return threeDecimals;
};

const getShortReference =
  eventId => {
    const compact = String(
      eventId || ""
    )
      .replaceAll("-", "")
      .toUpperCase();

    const short =
      compact.slice(-8);

    return short.length === 8
      ? `${
          short.slice(0, 4)
        }-${
          short.slice(4)
        }`
      : short || "—";
  };

function ReceiptModal({
  receipt,
  onClose
}) {
  const { t } = useLang();

  if (!receipt) {
    return null;
  }

  const createdAt =
    new Date(
      receipt.createdAt
    );

  const formattedDate =
    Number.isNaN(
      createdAt.getTime()
    )
      ? receipt.createdAt
      : createdAt
          .toLocaleString();

  const reference =
    getShortReference(
      receipt.clientEventId
    );

  const printReceipt = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        t("receipt_preview")
      }
      style={overlayStyle}
    >
      <style>{`
        @media print {
          @page {
            size: 58mm auto;
            margin: 0;
          }

          body * {
            visibility:
              hidden !important;
          }

          #vendr-print-receipt,
          #vendr-print-receipt * {
            visibility:
              visible !important;
          }

          #vendr-print-receipt {
            position:
              absolute !important;

            top: 0 !important;
            left: 0 !important;

            width:
              48mm !important;

            margin: 0 !important;

            padding:
              2mm 0 3mm 0 !important;

            border:
              0 !important;

            box-shadow:
              none !important;

            background:
              white !important;

            color:
              black !important;

            opacity:
              1 !important;

            font-family:
              Arial,
              Helvetica,
              sans-serif !important;

            font-size:
              11px !important;

            font-weight:
              700 !important;

            line-height:
              1.3 !important;

            -webkit-print-color-adjust:
              exact !important;

            print-color-adjust:
              exact !important;

            -webkit-text-stroke:
              0.12px black;

            text-rendering:
              geometricPrecision;
          }

          #vendr-print-receipt * {
            color:
              black !important;

            opacity:
              1 !important;
          }
        }
      `}</style>

      <div style={modalStyle}>
        <div
          style={
            modalHeaderStyle
          }
        >
          <h3
            style={{
              margin: 0
            }}
          >
            {t(
              "receipt_preview"
            )}
          </h3>

          <button
            type="button"
            onClick={onClose}
            aria-label={
              t("close")
            }
            style={
              closeButtonStyle
            }
          >
            ×
          </button>
        </div>

        <div
          style={
            previewAreaStyle
          }
        >
          <div
            id={
              "vendr-print-receipt"
            }
            style={receiptStyle}
          >
            <div
              style={
                centerBoldStyle
              }
            >
              {String(
                receipt.storeName ||
                  "VENDR"
              ).toUpperCase()}
            </div>

            <div
              style={
                centerStyle
              }
            >
              {formattedDate}
            </div>

            <div
              style={
                separatorStyle
              }
            />

            {(receipt.ticketNumber ??
              receipt.ticketId) !=
            null ? (
              <div>
                {t("ticket")}: #
                {receipt.ticketNumber ??
                  receipt.ticketId}
              </div>
            ) : (
              <>
                <div>
                  {t(
                    "receipt_reference"
                  )}
                  : {reference}
                </div>

                <div
                  style={
                    pendingStyle
                  }
                >
                  {t(
                    "pending_synchronization"
                  )}
                </div>
              </>
            )}

            {receipt.clientName && (
              <div>
                {t("client")}:{" "}
                {
                  receipt.clientName
                }
              </div>
            )}

            <div
              style={
                separatorStyle
              }
            />

            {(receipt.items || [])
              .map(
                (item, index) => {
                  const quantity =
                    Number(
                      item.quantity ||
                        0
                    );

                  const unitPrice =
                    Number(
                      item.price ||
                        0
                    );

                  const lineTotal =
                    quantity *
                    unitPrice;

                  return (
                    <div
                      key={
                        `${item.product_id}-${index}`
                      }
                      style={{
                        marginBottom:
                          "2mm"
                      }}
                    >
                      <div
                        style={{
                          fontWeight:
                            700
                        }}
                      >
                        {item.name}
                      </div>

                      <div
                        style={
                          lineStyle
                        }
                      >
                        <span>
                          {quantity} × $
                          {formatUnitPrice(
                            unitPrice
                          )}
                        </span>

                        <span>
                          $
                          {formatMoney(
                            lineTotal
                          )}
                        </span>
                      </div>
                    </div>
                  );
                }
              )}

            <div
              style={
                separatorStyle
              }
            />

            <div
              style={
                lineStyle
              }
            >
              <span>
                {t("subtotal")}
              </span>

              <span>
                $
                {formatMoney(
                  receipt.subtotal
                )}
              </span>
            </div>

            {Number(
              receipt.discountAmount
            ) > 0 && (
              <div
                style={
                  lineStyle
                }
              >
                <span>
                  {t("discount")}
                </span>

                <span>
                  -$
                  {formatMoney(
                    receipt
                      .discountAmount
                  )}
                </span>
              </div>
            )}

            <div
              style={
                totalStyle
              }
            >
              <span>
                {t("total")}
              </span>

              <span>
                $
                {formatMoney(
                  receipt.total
                )}
              </span>
            </div>

            {receipt.isCredit && (
              <>
                <div
                  style={
                    separatorStyle
                  }
                />

                <div
                  style={
                    centerBoldStyle
                  }
                >
                  {t("fiado")}
                </div>

                {receipt.dueDate && (
                  <div
                    style={
                      centerStyle
                    }
                  >
                    {t(
                      "due_date"
                    )}
                    :{" "}
                    {
                      receipt.dueDate
                    }
                  </div>
                )}
              </>
            )}

            <div
              style={
                separatorStyle
              }
            />

            <div
              style={
                centerStyle
              }
            >
              {t(
                "receipt_thank_you"
              )}
            </div>

            <div
              style={
                centerStyle
              }
            >
              {t(
                "receipt_come_again"
              )}
            </div>
          </div>
        </div>

        <div
          style={actionStyle}
        >
          <button
            type="button"
            onClick={
              printReceipt
            }
            style={
              printButtonStyle
            }
          >
            {t(
              "print_receipt"
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={
              secondaryButtonStyle
            }
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 5000,
  background: COLORS.overlay,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  boxSizing: "border-box"
};

const modalStyle = {
  width:
    "min(420px, 100%)",
  maxHeight: "92vh",
  background: COLORS.panel,

  border:
    `1px solid ${
      COLORS.border
    }`,

  borderRadius: 12,
  color: COLORS.text,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden"
};

const modalHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "space-between",
  gap: 12,
  padding: "12px 14px",

  borderBottom:
    `1px solid ${
      COLORS.border
    }`
};

const closeButtonStyle = {
  border: 0,
  background:
    "transparent",
  color: COLORS.text,
  fontSize: 24,
  cursor: "pointer",
  lineHeight: 1
};

const previewAreaStyle = {
  overflowY: "auto",
  padding: 16,
  background: COLORS.panelAlt
};

const receiptStyle = {
  width: "48mm",
  maxWidth: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
  padding: "3mm 2mm",
  background: "white",
  color: "black",

  fontFamily:
    "Arial, Helvetica, sans-serif",

  fontSize: "11px",
  fontWeight: 700,
  lineHeight: 1.3,
  overflowWrap: "anywhere"
};

const centerStyle = {
  textAlign: "center"
};

const centerBoldStyle = {
  textAlign: "center",
  fontWeight: 700
};

const separatorStyle = {
  borderTop:
    "2px dashed black",

  margin: "2mm 0"
};

const lineStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: "2mm"
};

const totalStyle = {
  ...lineStyle,
  fontWeight: 700,
  fontSize: "14px",
  marginTop: "1mm"
};

const pendingStyle = {
  textAlign: "center",
  fontWeight: 700,
  marginTop: "1mm"
};

const actionStyle = {
  display: "flex",
  gap: 8,
  padding: 12,

  borderTop:
    `1px solid ${
      COLORS.border
    }`
};

const printButtonStyle = {
  flex: 1,
  border: 0,
  borderRadius: 8,
  padding: "10px 12px",
  background: COLORS.primary,
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};

const secondaryButtonStyle = {
  border:
    `1px solid ${
      COLORS.border
    }`,

  borderRadius: 8,
  padding: "10px 12px",
  background: COLORS.panelAlt,
  color: COLORS.text,
  cursor: "pointer"
};

export default ReceiptModal;
