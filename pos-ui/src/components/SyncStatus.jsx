import {
  useEffect,
  useState
} from "react";

import {
  liveQuery
} from "dexie";

import {
  offlineDb
} from "../offlineDb";

import {
  syncPendingEvents
} from "../syncPendingEvents";

const EVENT_LABELS = {
  sale: "Sale",
  return: "Return / Refund",
  revenue: "Revenue",
  expense: "Expense",
  intake: "Intake",
  stock_adjustment: "Stock Adjustment"
};

const formatEventType = eventType =>
  EVENT_LABELS[eventType] ||
  String(eventType || "Unknown event")
    .replaceAll("_", " ");

const formatDateTime = value => {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString();
};

function SyncStatus({
  storeId
}) {
  const [online, setOnline] =
    useState(navigator.onLine);

  const [events, setEvents] =
    useState([]);

  const [panelOpen, setPanelOpen] =
    useState(false);

  const [syncing, setSyncing] =
    useState(false);

  const [lastSyncMessage, setLastSyncMessage] =
    useState("");

  useEffect(() => {
    const handleOnlineStatus = () => {
      setOnline(navigator.onLine);
    };

    window.addEventListener(
      "online",
      handleOnlineStatus
    );

    window.addEventListener(
      "offline",
      handleOnlineStatus
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnlineStatus
      );

      window.removeEventListener(
        "offline",
        handleOnlineStatus
      );
    };
  }, []);

  useEffect(() => {
    if (!storeId) {
      setEvents([]);
      return;
    }

    const subscription = liveQuery(
      async () => {
        return offlineDb.pendingEvents
          .where("store_id")
          .equals(storeId)
          .sortBy("created_at");
      }
    ).subscribe({
      next: pendingEvents => {
        setEvents(pendingEvents);
      },

      error: error => {
        console.error(
          "SYNC STATUS ERROR:",
          error
        );
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [storeId]);

  const pendingCount =
    events.length;

  const failedCount =
    events.filter(
      event =>
        Number(
          event.retry_count || 0
        ) > 0
    ).length;

  const handleSyncNow = async () => {
    if (
      syncing ||
      !navigator.onLine
    ) {
      return;
    }

    setSyncing(true);
    setLastSyncMessage("");

    try {
      const result =
        await syncPendingEvents();

      if (result.alreadyRunning) {
        setLastSyncMessage(
          "Synchronization is already running."
        );
      } else if (result.failed > 0) {
        setLastSyncMessage(
          `${result.synced} synchronized, ` +
          `${result.failed} failed.`
        );
      } else if (result.synced > 0) {
        setLastSyncMessage(
          `${result.synced} event${
            result.synced === 1 ? "" : "s"
          } synchronized.`
        );
      } else {
        setLastSyncMessage(
          "Everything is already synchronized."
        );
      }
    } catch (error) {
      console.error(
        "MANUAL SYNC ERROR:",
        error
      );

      setLastSyncMessage(
        "Synchronization could not be completed."
      );
    } finally {
      setSyncing(false);
    }
  };

  let statusColor = "#22c55e";
  let statusText = "Online · Synced";

  if (
    failedCount > 0 &&
    online
  ) {
    statusColor = "#ef4444";
    statusText =
      `Online · ${failedCount} failed`;
  } else if (pendingCount > 0) {
    statusColor = "#facc15";
    statusText = online
      ? `Online · ${pendingCount} queued`
      : `Offline · ${pendingCount} queued`;
  } else if (!online) {
    statusColor = "#facc15";
    statusText = "Offline · Queue empty";
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setPanelOpen(true)
        }
        title="Open synchronization details"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 3,
          padding: 0,
          border: "none",
          background: "transparent",
          color: "#9da7b3",
          fontSize: 12,
          cursor: "pointer"
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: statusColor,
            boxShadow:
              `0 0 7px ${statusColor}`,
            flexShrink: 0
          }}
        />

        <span>
          {statusText}
        </span>
      </button>

      {panelOpen && (
        <div
          role="presentation"
          onMouseDown={event => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setPanelOpen(false);
            }
          }}
          style={overlayStyle}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Synchronization details"
            style={panelStyle}
          >
            <div style={headerStyle}>
              <div>
                <div style={titleStyle}>
                  Synchronization
                </div>

                <div style={connectionRowStyle}>
                  <span
                    style={{
                      ...largeStatusDotStyle,
                      background:
                        online
                          ? "#22c55e"
                          : "#facc15",
                      boxShadow:
                        `0 0 8px ${
                          online
                            ? "#22c55e"
                            : "#facc15"
                        }`
                    }}
                  />

                  <span>
                    {online
                      ? "Connected"
                      : "Offline"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPanelOpen(false)
                }
                style={closeButtonStyle}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={summaryStyle}>
              <div>
                <div style={summaryLabelStyle}>
                  Queued
                </div>

                <div style={summaryValueStyle}>
                  {pendingCount}
                </div>
              </div>

              <div>
                <div style={summaryLabelStyle}>
                  Retried
                </div>

                <div style={summaryValueStyle}>
                  {failedCount}
                </div>
              </div>

              <div>
                <div style={summaryLabelStyle}>
                  Status
                </div>

                <div
                  style={{
                    ...summaryStatusStyle,
                    color: statusColor
                  }}
                >
                  {pendingCount === 0
                    ? "Synced"
                    : online
                    ? "Waiting"
                    : "Stored locally"}
                </div>
              </div>
            </div>

            <div style={sectionTitleStyle}>
              Pending events
            </div>

            <div style={eventListStyle}>
              {events.length === 0 ? (
                <div style={emptyStateStyle}>
                  <div style={emptyIconStyle}>
                    ✓
                  </div>

                  <div>
                    All events are synchronized.
                  </div>
                </div>
              ) : (
                events.map(event => (
                  <div
                    key={event.client_event_id}
                    style={eventCardStyle}
                  >
                    <div style={eventTopRowStyle}>
                      <strong>
                        {formatEventType(
                          event.event_type
                        )}
                      </strong>

                      <span
                        style={{
                          ...eventBadgeStyle,
                          color:
                            Number(
                              event.retry_count || 0
                            ) > 0
                              ? "#ef4444"
                              : "#facc15"
                        }}
                      >
                        {Number(
                          event.retry_count || 0
                        ) > 0
                          ? "Retry needed"
                          : "Queued"}
                      </span>
                    </div>

                    <div style={eventMetaStyle}>
                      {formatDateTime(
                        event.client_created_at ||
                        event.created_at
                      )}
                    </div>

                    {Number(
                      event.retry_count || 0
                    ) > 0 && (
                      <div style={retryStyle}>
                        Attempts:{" "}
                        {event.retry_count}

                        {event.last_error && (
                          <>
                            <br />
                            {event.last_error}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {lastSyncMessage && (
              <div style={messageStyle}>
                {lastSyncMessage}
              </div>
            )}

            <div style={footerStyle}>
              <button
                type="button"
                onClick={() =>
                  setPanelOpen(false)
                }
                style={secondaryButtonStyle}
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleSyncNow}
                disabled={
                  syncing ||
                  !online ||
                  pendingCount === 0
                }
                style={{
                  ...primaryButtonStyle,
                  opacity:
                    syncing ||
                    !online ||
                    pendingCount === 0
                      ? 0.5
                      : 1,
                  cursor:
                    syncing ||
                    !online ||
                    pendingCount === 0
                      ? "default"
                      : "pointer"
                }}
              >
                {syncing
                  ? "Synchronizing..."
                  : "Sync now"}
              </button>
            </div>

            {!online && (
              <div style={offlineNoteStyle}>
                Events are safely stored on this
                device and will synchronize
                automatically when the connection
                returns.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 3000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  background: "rgba(0, 0, 0, 0.7)",
  boxSizing: "border-box"
};

const panelStyle = {
  width: "100%",
  maxWidth: 460,
  maxHeight: "85vh",
  display: "flex",
  flexDirection: "column",
  padding: 18,
  borderRadius: 14,
  border: "1px solid #2f3542",
  background: "#1a1d24",
  color: "#e6edf3",
  boxShadow:
    "0 18px 50px rgba(0, 0, 0, 0.45)",
  boxSizing: "border-box"
};

const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12
};

const titleStyle = {
  fontSize: 20,
  fontWeight: 700
};

const connectionRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  marginTop: 7,
  fontSize: 13,
  color: "#9da7b3"
};

const largeStatusDotStyle = {
  width: 10,
  height: 10,
  borderRadius: "50%"
};

const closeButtonStyle = {
  width: 32,
  height: 32,
  border: "none",
  borderRadius: 8,
  background: "#2a2f3a",
  color: "#e6edf3",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer"
};

const summaryStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 10,
  marginTop: 18,
  padding: 12,
  borderRadius: 10,
  background: "#11151c"
};

const summaryLabelStyle = {
  fontSize: 11,
  color: "#9da7b3"
};

const summaryValueStyle = {
  marginTop: 4,
  fontSize: 20,
  fontWeight: 700
};

const summaryStatusStyle = {
  marginTop: 7,
  fontSize: 13,
  fontWeight: 700
};

const sectionTitleStyle = {
  marginTop: 18,
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 700,
  color: "#9da7b3",
  textTransform: "uppercase",
  letterSpacing: "0.05em"
};

const eventListStyle = {
  minHeight: 80,
  maxHeight: 300,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 8
};

const eventCardStyle = {
  padding: 11,
  borderRadius: 9,
  border: "1px solid #2f3542",
  background: "#222733"
};

const eventTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 13
};

const eventBadgeStyle = {
  fontSize: 11,
  fontWeight: 700
};

const eventMetaStyle = {
  marginTop: 5,
  fontSize: 11,
  color: "#9da7b3"
};

const retryStyle = {
  marginTop: 7,
  fontSize: 11,
  color: "#ff8a8a",
  overflowWrap: "anywhere"
};

const emptyStateStyle = {
  minHeight: 100,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  color: "#9da7b3",
  textAlign: "center"
};

const emptyIconStyle = {
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background: "rgba(34, 197, 94, 0.14)",
  color: "#22c55e",
  fontWeight: 800
};

const messageStyle = {
  marginTop: 12,
  padding: 9,
  borderRadius: 8,
  background: "#11151c",
  color: "#9da7b3",
  fontSize: 12
};

const footerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 16
};

const primaryButtonStyle = {
  border: "none",
  borderRadius: 8,
  padding: "9px 14px",
  background: "#3aa0ff",
  color: "white",
  cursor: "pointer"
};

const secondaryButtonStyle = {
  border: "none",
  borderRadius: 8,
  padding: "9px 14px",
  background: "#2a2f3a",
  color: "white",
  cursor: "pointer"
};

const offlineNoteStyle = {
  marginTop: 12,
  fontSize: 11,
  lineHeight: 1.45,
  color: "#9da7b3"
};

export default SyncStatus;
