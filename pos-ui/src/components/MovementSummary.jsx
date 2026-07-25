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

const formatDateTime = value => {
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
      "INVALID CASH MOVEMENT DATETIME:",
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

function MovementSummary({
  storeId
}) {
  const { t } = useLang();

  const today =
    getLocalDateValue();

  const [
    startDate,
    setStartDate
  ] = useState(today);

  const [
    endDate,
    setEndDate
  ] = useState(today);

  const [
    movements,
    setMovements
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage
  ] = useState("");

  const invalidDateRange =
    !startDate ||
    !endDate ||
    startDate > endDate;

  const load = async () => {
    if (
      !storeId ||
      invalidDateRange ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response =
        await axios.get(
          `${API}/cash-movements`,
          {
            params: {
              store_id:
                storeId,

              start_date:
                startDate,

              end_date:
                endDate
            }
          }
        );

      setMovements(
        response.data.movements || []
      );
    } catch (error) {
      console.error(
        "CASH MOVEMENT LOAD ERROR:",
        error
      );

      const detail =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        error.message ||
        "Could not load cash movements.";

      setErrorMessage(
        String(detail)
      );

      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      load();
    }
  }, [storeId]);

  return (
    <div
      style={{
        ...card,
        marginTop: 16,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0
      }}
    >
      <h3
        style={{
          marginBottom: 12
        }}
      >
        {t("movement_summary")}
      </h3>

      {/* DATE FILTER */}
      <div
        style={{
          display: "flex",
          gap: 10,
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
          onClick={load}
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
                ? 0.6
                : 1,
            cursor:
              invalidDateRange ||
              loading
                ? "not-allowed"
                : "pointer"
          }}
        >
          {loading
            ? t("loading") ||
              "Loading..."
            : t("apply") ||
              "Apply"}
        </button>
      </div>

      {errorMessage && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 6,
            background:
              "rgba(255, 92, 92, 0.12)",
            color:
              COLORS.danger ||
              "#ff5c5c"
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* SCROLLABLE LIST */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flex: 1,
          overflowY: "auto",
          minHeight: 0
        }}
      >
        {movements.map(
          (movement, index) => {
            const amount =
              Number(
                movement.amount || 0
              );

            const direction =
              Number(
                movement.direction || 1
              );

            const realAmount =
              amount * direction;

            const isPositive =
              realAmount >= 0;

            const noteValue =
              movement.note;

            const note =
              noteValue &&
              String(
                noteValue
              ).toLowerCase() !==
                "null" &&
              String(
                noteValue
              ).trim() !== ""
                ? noteValue
                : "—";

            return (
              <div
                key={
                  movement.event_id ??
                  `${movement.datetime}-${index}`
                }
                style={{
                  background:
                    COLORS.panelAlt,
                  padding: 10,
                  borderRadius: 8,
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 12
                }}
              >
                {/* LEFT */}
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color:
                        COLORS.textDim
                    }}
                  >
                    {formatDateTime(
                      movement.datetime
                    )}
                  </div>

                  <div
                    style={{
                      fontWeight: 500
                    }}
                  >
                    {movement.type ||
                      "—"}
                  </div>

                  {movement.category && (
                    <div
                      style={{
                        fontSize: 12,
                        color:
                          COLORS.primary
                      }}
                    >
                      {
                        movement.category
                      }
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: 12,
                      color:
                        COLORS.textDim
                    }}
                  >
                    {note}
                  </div>
                </div>

                {/* RIGHT */}
                <div
                  style={{
                    fontWeight: "bold",
                    color: isPositive
                      ? "#4caf50"
                      : "#ff5252"
                  }}
                >
                  {isPositive
                    ? "+"
                    : "-"}
                  $
                  {Math.abs(
                    realAmount
                  ).toFixed(2)}
                </div>
              </div>
            );
          }
        )}

        {!loading &&
          movements.length === 0 &&
          !errorMessage && (
            <div
              style={{
                color:
                  COLORS.textDim,
                padding: 10
              }}
            >
              {t("no_movements") ||
                "No movements"}
            </div>
          )}
      </div>
    </div>
  );
}

export default MovementSummary;
