import Dexie from "dexie";

import apiClient from "./apiClient";
import { offlineDb } from "./offlineDb";

/**
 * Stores an event locally exactly once.
 *
 * Returns created: false when this client_event_id is
 * already in the queue. This prevents retries or double
 * clicks from applying local inventory changes twice.
 */
export const savePendingEvent = async ({
  client_event_id,
  event_type,
  store_id,
  device_id,
  client_created_at,
  payload
}) => {
  if (!client_event_id) {
    throw new Error(
      "A pending event requires client_event_id"
    );
  }

  if (!event_type) {
    throw new Error(
      "A pending event requires event_type"
    );
  }

  try {
    await offlineDb.pendingEvents.add({
      client_event_id,
      event_type,
      store_id,
      device_id,
      client_created_at,
      payload,
      status: "pending",
      created_at:
        client_created_at ||
        new Date().toISOString(),
      retry_count: 0,
      last_error: null
    });

    return {
      created: true
    };
  } catch (error) {
    if (
      error instanceof
        Dexie.ConstraintError ||
      error?.name ===
        "ConstraintError"
    ) {
      return {
        created: false
      };
    }

    throw error;
  }
};

const validateAcceptedStatus = (
  responseData,
  eventLabel
) => {
  if (
    responseData.status !== "accepted" &&
    responseData.status !==
      "already_processed"
  ) {
    throw new Error(
      `Unexpected ${eventLabel} status: ${responseData.status}`
    );
  }

  return responseData;
};

const submitSaleEvent = async event => {
  const response = await apiClient.post(
    "/sale-ticket",
    event.payload
  );

  return validateAcceptedStatus(
    response.data,
    "sale"
  );
};

const submitReturnEvent = async event => {
  const response = await apiClient.post(
    "/returns",
    event.payload
  );

  return validateAcceptedStatus(
    response.data,
    "return/refund"
  );
};

const submitCashEvent = async event => {
  const response = await apiClient.post(
    "/cash-event",
    event.payload
  );

  return validateAcceptedStatus(
    response.data,
    "cash event"
  );
};

const submitIntakeEvent = async event => {
  const response = await apiClient.post(
    "/intake-ticket",
    event.payload
  );

  return validateAcceptedStatus(
    response.data,
    "intake"
  );
};

const submitStockAdjustmentEvent =
  async event => {
    const response = await apiClient.post(
      "/stock-adjustment",
      event.payload
    );

    return validateAcceptedStatus(
      response.data,
      "stock adjustment"
    );
  };

/**
 * Routes a local event to the correct backend endpoint.
 */
export const submitPendingEvent =
  async event => {
    let responseData;

    switch (event.event_type) {
      case "sale":
        responseData =
          await submitSaleEvent(event);
        break;

      case "return":
        responseData =
          await submitReturnEvent(event);
        break;

      case "revenue":
      case "expense":
        responseData =
          await submitCashEvent(event);
        break;

      case "intake":
        responseData =
          await submitIntakeEvent(event);
        break;

      case "stock_adjustment":
        responseData =
          await submitStockAdjustmentEvent(
            event
          );
        break;

      default:
        throw new Error(
          `Unsupported pending event type: ${event.event_type}`
        );
    }

    /*
     * Delete the local queue entry only after the backend
     * accepts the event or confirms it was already processed.
     */
    await offlineDb.pendingEvents.delete(
      event.client_event_id
    );

    return responseData;
  };

/**
 * Moves records from the original pendingSales table
 * into the new generic pendingEvents table.
 *
 * The original row is deleted only after the generic
 * event has been saved safely.
 */
export const migratePendingSalesToEvents =
  async () => {
    const oldSales =
      await offlineDb.pendingSales.toArray();

    let migrated = 0;

    for (const sale of oldSales) {
      const {
        status,
        created_at,
        synced_at,
        ...salePayload
      } = sale;

      const result =
        await savePendingEvent({
          client_event_id:
            sale.client_event_id,

          event_type:
            "sale",

          store_id:
            sale.store_id,

          device_id:
            sale.device_id,

          client_created_at:
            sale.client_created_at ||
            created_at,

          payload:
            salePayload
        });

      /*
       * Whether newly created or already present,
       * the generic queue now owns this event.
       */
      const genericEventExists =
        result.created ||
        Boolean(
          await offlineDb.pendingEvents.get(
            sale.client_event_id
          )
        );

      if (genericEventExists) {
        await offlineDb.pendingSales.delete(
          sale.client_event_id
        );

        migrated += 1;
      }
    }

    return migrated;
  };

/**
 * Returns the number of events currently waiting
 * to synchronize.
 */
export const getPendingEventCount =
  async () => {
    return offlineDb.pendingEvents.count();
  };

/**
 * Returns true when at least one event is waiting
 * to synchronize.
 */
export const hasPendingEvents =
  async () => {
    const count =
      await getPendingEventCount();

    return count > 0;
  };
