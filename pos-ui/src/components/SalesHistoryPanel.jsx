import {
  useEffect,
  useState
} from "react";

import { useLang } from "../LanguageContext";
import apiClient from "../apiClient";
import ReceiptModal from "./ReceiptModal";

import {
  COLORS,
  card,
  input
} from "../uiStyles";

const getLocalDateValue = () => {
  const now = new Date();

  const localTime = new Date(
    now.getTime() -
    now.getTimezoneOffset() * 60000
  );

  return localTime
    .toISOString()
    .slice(0, 10);
};

const formatSaleDateTime = value => {
  if (!value) {
    return "—";
  }

  const normalizedValue =
    String(value).replace(
      /\.(\d{3})\d*(?=[+-]\d{2}:\d{2}$|Z$)/,
      ".$1"
    );

  const parsedDate =
    new Date(normalizedValue);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    console.warn(
      "INVALID SALES HISTORY DATETIME:",
      value
    );

    return "—";
  }

  return parsedDate.toLocaleString(
    "es-SV",
    {
      dateStyle: "short",
      timeStyle: "medium"
    }
  );
};

function SalesHistoryPanel({
  storeId,
  storeName
}) {
  const { t } = useLang();

  const [sales, setSales] =
    useState([]);

  const today =
    getLocalDateValue();

  const [startDate, setStartDate] =
    useState(today);

  const [endDate, setEndDate] =
    useState(today);

  const [
    selectedTicket,
    setSelectedTicket
  ] = useState(null);

  const [
    ticketDetails,
    setTicketDetails
  ] = useState([]);

  const [
    selectedSale,
    setSelectedSale
  ] = useState(null);

  const [
    ticketMetadata,
    setTicketMetadata
  ] = useState({});

  const [
    receiptPreview,
    setReceiptPreview
  ] = useState(null);

  const [
    detailsLoading,
    setDetailsLoading
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const invalidDateRange =
    !startDate ||
    !endDate ||
    startDate > endDate;

  const loadSales = async () => {
    if (
      !storeId ||
      invalidDateRange ||
      loading
    ) {
      return;
    }

    setLoading(true);

    try {
      const response =
        await apiClient.get(
          "/sales-history",
          {
            params: {
              store_id: storeId,
              start_date: startDate,
              end_date: endDate
            }
          }
        );

      setSales(
        response.data.sales || []
      );
    } catch (error) {
      console.error(
        "SALES HISTORY LOAD ERROR:",
        error
      );

      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      loadSales();
    }
  }, [storeId]);

  const openTicket = async sale => {
    if (detailsLoading) {
      return;
    }

    setDetailsLoading(true);

    try {
      const response =
        await apiClient.get(
          "/ticket-details",
          {
            params: {
              store_id: storeId,
              ticket_id:
                sale.ticket_id
            }
          }
        );

      setTicketDetails(
        response.data.items || []
      );

      setSelectedTicket(
        sale.ticket_id
      );

      setSelectedSale(sale);

      setTicketMetadata(
        response.data || {}
      );
    } catch (error) {
      console.error(
        "TICKET DETAILS LOAD ERROR:",
        error
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeTicket = () => {
    setSelectedTicket(null);
    setTicketDetails([]);
    setSelectedSale(null);
    setTicketMetadata({});
  };

  const getTicketNumber = sale =>
    sale?.store_ticket_number ??
    sale?.ticket_number ??
    sale?.ticket_id ??
    "—";

  const getFiniteNumber = (
    values,
    fallback = 0
  ) => {
    for (const value of values) {
      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        Number.isFinite(Number(value))
      ) {
        return Number(value);
      }
    }

    return fallback;
  };

  const openReceiptPreview = () => {
    if (!selectedSale) {
      return;
    }

    const receiptItems = ticketDetails.map(
      (item, index) => {
        const quantity = getFiniteNumber(
          [item.quantity],
          0
        );

        const lineTotal = getFiniteNumber(
          [
            item.line_total,
            item.total
          ],
          0
        );

        const price = getFiniteNumber(
          [
            item.price,
            item.unit_price,
            item.price_at_time
          ],
          quantity > 0
            ? lineTotal / quantity
            : 0
        );

        return {
          product_id:
            item.product_id ?? index,

          name:
            item.name ||
            item.product_name ||
            "—",

          quantity,
          price
        };
      }
    );

    const calculatedSubtotal =
      receiptItems.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity) *
            Number(item.price),
        0
      );

    const total = getFiniteNumber(
      [
        ticketMetadata.total,
        ticketMetadata.revenue,
        selectedSale.revenue
      ],
      calculatedSubtotal
    );

    const subtotal = getFiniteNumber(
      [
        ticketMetadata.subtotal,
        selectedSale.subtotal
      ],
      calculatedSubtotal || total
    );

    const discountAmount =
      getFiniteNumber(
        [
          ticketMetadata.discount_amount,
          ticketMetadata.discount,
          selectedSale.discount_amount
        ],
        Math.max(
          subtotal - total,
          0
        )
      );

    setReceiptPreview({
      storeName:
        ticketMetadata.store_name ||
        selectedSale.store_name ||
        storeName ||
        `Store ${storeId}`,

      createdAt:
        ticketMetadata.datetime ||
        selectedSale.datetime,

      ticketId:
        selectedSale.ticket_id,

      ticketNumber:
        ticketMetadata.store_ticket_number ??
        ticketMetadata.ticket_number ??
        getTicketNumber(selectedSale),

      clientName:
        ticketMetadata.client_name ||
        ticketMetadata.client_name_at_time ||
        selectedSale.client_name ||
        selectedSale.client_name_at_time ||
        null,

      isCredit:
        Boolean(
          ticketMetadata.is_credit ??
          selectedSale.is_credit
        ),

      dueDate:
        ticketMetadata.due_date ||
        selectedSale.due_date ||
        null,

      clientEventId:
        ticketMetadata.client_event_id ||
        selectedSale.client_event_id ||
        null,

      items: receiptItems,
      subtotal,
      discountAmount,
      total
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0
      }}
    >
      <div
        style={{
          ...card,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0
        }}
      >
        <h2
          style={{
            marginBottom: 12
          }}
        >
          {t("sales_history")}
        </h2>

        {/* FILTERS */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
            alignItems: "center"
          }}
        >
          <input
            type="date"
            value={startDate}
            onChange={event =>
              setStartDate(
                event.target.value
              )
            }
            style={{
              ...input,
              minHeight: 38
            }}
          />

          <input
            type="date"
            value={endDate}
            onChange={event =>
              setEndDate(
                event.target.value
              )
            }
            style={{
              ...input,
              minHeight: 38
            }}
          />

          <button
            type="button"
            onClick={loadSales}
            disabled={
              invalidDateRange ||
              loading
            }
            style={{
              background:
                COLORS.primary,
              border: "none",
              borderRadius: 8,
              minHeight: 38,
              padding: "8px 16px",
              color: "white",
              fontWeight: 600,
              opacity:
                invalidDateRange ||
                loading
                  ? 0.5
                  : 1,
              cursor:
                invalidDateRange ||
                loading
                  ? "default"
                  : "pointer"
            }}
          >
            {loading
              ? t("loading")
              : t("apply") ||
                "Apply"}
          </button>
        </div>

        {/* SALES LIST */}
        <div
          style={{
            height:
              "clamp(240px, calc(100dvh - 300px), 560px)",
            overflowY: "auto",
            overflowX: "hidden",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}
        >
          {Array.isArray(sales) &&
            sales.map(sale => (
              <div
                key={sale.ticket_id}
                style={{
                  background:
                    COLORS.panelAlt,
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 12
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 500
                    }}
                  >
                    {t("ticket")} #
                    {getTicketNumber(
                      sale
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color:
                        COLORS.textDim
                    }}
                  >
                    {formatSaleDateTime(
                      sale.datetime
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      color:
                        COLORS.primary
                    }}
                  >
                    $
                    {Number(
                      sale.revenue || 0
                    ).toFixed(2)}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openTicket(sale)
                    }
                    disabled={detailsLoading}
                    style={{
                      background:
                        COLORS.primary,
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 8px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: 12,
                      opacity:
                        detailsLoading
                          ? 0.6
                          : 1
                    }}
                  >
                    {t("details") ||
                      "Details"}
                  </button>
                </div>
              </div>
            ))}

          {!loading &&
            sales.length === 0 && (
              <div
                style={{
                  color:
                    COLORS.textDim,
                  textAlign: "center",
                  padding: 18
                }}
              >
                {t("no_data") ||
                  "No data"}
              </div>
            )}
        </div>
      </div>

      {/* TICKET DETAILS MODAL */}
      {selectedTicket !== null && (
        <div
          onClick={closeTicket}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent:
              "center",
            alignItems: "center",
            zIndex: 999
          }}
        >
          <div
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              background:
                COLORS.panel,
              padding: 20,
              borderRadius: 12,
              width: "90%",
              maxWidth: 400,
              color: COLORS.text
            }}
          >
            <h3
              style={{
                marginBottom: 10
              }}
            >
              {t("ticket")} #
              {getTicketNumber(
                selectedSale
              )}
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 6,
                maxHeight: 300,
                overflowY: "auto",
                marginBottom: 10
              }}
            >
              {ticketDetails.map(
                (item, index) => (
                  <div
                    key={
                      item.product_id ??
                      index
                    }
                    style={{
                      background:
                        COLORS.panelAlt,
                      padding: 8,
                      borderRadius: 6
                    }}
                  >
                    {item.name} x
                    {item.quantity} — $
                    {Number(
                      item.line_total ||
                        0
                    ).toFixed(2)}
                  </div>
                )
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: 8
              }}
            >
              <button
                type="button"
                onClick={openReceiptPreview}
                style={{
                  background:
                    COLORS.primary,
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: "white",
                  cursor: "pointer",
                  flex: 1,
                  fontWeight: 600
                }}
              >
                {t("print_receipt") ||
                  "Print Receipt"}
              </button>

              <button
                type="button"
                onClick={closeTicket}
                style={{
                  background:
                    COLORS.panelAlt,
                  border:
                    `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: "white",
                  cursor: "pointer",
                  flex: 1,
                  fontWeight: 600
                }}
              >
                {t("back") ||
                  "Back"}
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptPreview && (
        <ReceiptModal
          receipt={receiptPreview}
          onClose={() =>
            setReceiptPreview(null)
          }
        />
      )}
    </div>
  );
}

export default SalesHistoryPanel;
