import { offlineDb } from "./offlineDb";

import {
  submitPendingEvent
} from "./offlineEvents";

let syncInProgress = false;

const getSyncErrorMessage = error => {
  const detail =
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    "Unknown synchronization error";

  if (
    detail &&
    typeof detail === "object"
  ) {
    return (
      detail.message ||
      JSON.stringify(detail)
    );
  }

  return String(detail);
};

const getStockConflict = error => {
  const detail =
    error?.response?.data?.detail;

  if (
    error?.response?.status === 409 &&
    detail?.code === "STOCK_CHANGED"
  ) {
    return detail;
  }

  return null;
};

const isConnectionError = error => {
  return (
    !navigator.onLine ||
    error?.code === "ECONNABORTED" ||
    error?.code === "ERR_NETWORK"
  );
};

export const syncPendingEvents = async () => {
  if (syncInProgress) {
    return {
      attempted: 0,
      synced: 0,
      failed: 0,
      syncedClientEventIds: [],
      alreadyRunning: true,
      offline: !navigator.onLine
    };
  }

  if (!navigator.onLine) {
    return {
      attempted: 0,
      synced: 0,
      failed: 0,
      syncedClientEventIds: [],
      alreadyRunning: false,
      offline: true
    };
  }

  syncInProgress = true;

  const results = {
    attempted: 0,
    synced: 0,
    failed: 0,
    syncedClientEventIds: [],
    alreadyRunning: false,
    offline: false
  };

  try {
    const pendingEvents =
      await offlineDb.pendingEvents
        .where("status")
        .equals("pending")
        .sortBy("created_at");

    for (const event of pendingEvents) {
      if (!navigator.onLine) {
        results.offline = true;
        break;
      }

      results.attempted += 1;

      try {
        await submitPendingEvent(event);

        results.synced += 1;

        results.syncedClientEventIds.push(
          event.client_event_id
        );
      } catch (error) {
        results.failed += 1;

        const stockConflict =
          getStockConflict(error);

        const errorMessage =
          getSyncErrorMessage(error);

        console.error(
          "PENDING EVENT SYNC ERROR:",
          event.event_type,
          event.client_event_id,
          errorMessage,
          error
        );

        await offlineDb.pendingEvents.update(
          event.client_event_id,
          {
            status: stockConflict
              ? "conflict"
              : "pending",
            retry_count:
              Number(
                event.retry_count || 0
              ) + 1,
            last_error: errorMessage,
            conflict_current_stock:
              stockConflict
                ? Number(
                    stockConflict.current_stock || 0
                  )
                : null
          }
        );

        if (
          stockConflict &&
          event.store_id &&
          event.payload?.product_id
        ) {
          await offlineDb.products.update(
            [
              event.store_id,
              event.payload.product_id
            ],
            {
              stock: Number(
                stockConflict.current_stock || 0
              )
            }
          );
        }

        if (isConnectionError(error)) {
          results.offline = true;
          break;
        }
      }
    }

    return results;
  } finally {
    syncInProgress = false;
  }
};
