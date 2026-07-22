import axios from "axios";
import Dexie from "dexie";

import { offlineDb } from "./offlineDb";

const API = "https://vendr-onkr.onrender.com";

/**
 * Stores an event locally exactly once.
 *
 * Returns created: false when this client_event_id is
 * already in the queue. This prevents retries or double
 * clicks from applying the local stock movement twice.
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
      error instanceof Dexie.ConstraintError ||
      error?.name === "ConstraintError"
    ) {
      return {
        created: false
      };
    }

    throw error;
  }
};

const submitSaleEvent = async event => {
  const response = await axios.post(
    `${API}/sale-ticket`,
    event.payload
  );

  if (
    response.data.status !== "accepted" &&
    response.data.status !== "already_processed"
  ) {
    throw new Error(
      `Unexpected sale status: ${response.data.status}`
    );
  }

  return response.data;
};

/**
 * Routes a local event to the correct backend endpoint.
 *
 * At first, only sale is supported. Returns, intakes,
 * adjustments, and other event types will be added here.
 */
export const submitPendingEvent = async event => {
  let responseData;

  switch (event.event_type) {
    case "sale":
      responseData =
        await submitSaleEvent(event);
      break;

    default:
      throw new Error(
        `Unsupported pending event type: ${event.event_type}`
      );
  }

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
          event_type: "sale",
          store_id: sale.store_id,
          device_id: sale.device_id,
          client_created_at:
            sale.client_created_at ||
            created_at,
          payload: salePayload
        });

      // Whether newly created or already present,
      // the generic queue now owns this event.
      if (
        result.created ||
        await offlineDb.pendingEvents.get(
          sale.client_event_id
        )
      ) {
        await offlineDb.pendingSales.delete(
          sale.client_event_id
        );

        migrated += 1;
      }
    }

    return migrated;
  };
