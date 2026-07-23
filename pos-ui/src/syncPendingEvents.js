import { offlineDb } from "./offlineDb";

import {
  submitPendingEvent
} from "./offlineEvents";

let syncInProgress = false;

const getSyncErrorMessage = error => {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    "Unknown synchronization error"
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
            retry_count:
              Number(
                event.retry_count || 0
              ) + 1,
            last_error: errorMessage
          }
        );

        if (!navigator.onLine) {
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
