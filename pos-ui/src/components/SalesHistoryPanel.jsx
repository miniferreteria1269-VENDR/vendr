import {
  useEffect,
  useState
} from "react";

import { useLang } from "../LanguageContext";
import axios from "axios";

import {
  COLORS,
  card,
  input
} from "../uiStyles";

const API =
  "https://vendr-onkr.onrender.com";

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
  storeId
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
        await axios.get(
          `${API}/sales-history`,
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

  const openTicket = async ticketId => {
    try {
      const response =
        await axios.get(
          `${API}/ticket-details`,
          {
            params: {
              store_id: storeId,
              ticket_id: ticketId
            }
          }
        );

      setTicketDetails(
        response.data.items || []
      );

      setSelectedTicket(
        ticketId
      );
    } catch (error) {
      console.error(
        "TICKET DETAILS LOAD ERROR:",
        error
      );
    }
  };

  const closeTicket = () => {
    setSelectedTicket(null);
    setTicketDetails([]);
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
            flex: 1,
            overflowY: "auto",
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
                    {sale.ticket_id ??
                      "—"}
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
                      openTicket(
                        sale.ticket_id
                      )
                    }
                    style={{
                      background:
                        COLORS.primary,
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 8px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: 12
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
              {selectedTicket}
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

            <button
              type="button"
              onClick={closeTicket}
              style={{
                background:
                  COLORS.primary,
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                color: "white",
                cursor: "pointer",
                width: "100%",
                fontWeight: 600
              }}
            >
              {t("back") ||
                "Back"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesHistoryPanel;
