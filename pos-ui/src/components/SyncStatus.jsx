import { useEffect, useState } from "react";
import { liveQuery } from "dexie";

import { offlineDb } from "../offlineDb";

function SyncStatus({ storeId }) {
  const [online, setOnline] =
    useState(navigator.onLine);

  const [pending, setPending] =
    useState(0);

  const [failed, setFailed] =
    useState(0);

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
      setPending(0);
      setFailed(0);
      return;
    }

    const subscription = liveQuery(
      async () => {
        const events =
          await offlineDb.pendingEvents
            .where("store_id")
            .equals(storeId)
            .toArray();

        return {
          pending: events.filter(
            event =>
              event.status === "pending"
          ).length,

          failed: events.filter(
            event =>
              Number(
                event.retry_count || 0
              ) > 0
          ).length
        };
      }
    ).subscribe({
      next: result => {
        setPending(result.pending);
        setFailed(result.failed);
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

  let color = "#22c55e";
  let text = "Online · Synced";

  if (failed > 0 && online) {
    color = "#ef4444";
    text =
      `Online · ${failed} failed`;
  } else if (pending > 0) {
    color = "#facc15";
    text = online
      ? `Online · ${pending} pending`
      : `Offline · ${pending} pending`;
  } else if (!online) {
    color = "#facc15";
    text = "Offline · No pending events";
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: 3,
        fontSize: 12,
        color: "#9da7b3"
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: color,
          boxShadow:
            `0 0 7px ${color}`,
          flexShrink: 0
        }}
      />

      <span>{text}</span>
    </div>
  );
}

export default SyncStatus;
