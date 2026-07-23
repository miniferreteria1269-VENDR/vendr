import { offlineDb } from "./offlineDb";

/**
 * Saves the latest balance confirmed by the backend.
 */
export const cacheConfirmedCashBalance = async (
  storeId,
  balance
) => {
  if (!storeId) {
    return;
  }

  const numericBalance = Number(balance);

  if (!Number.isFinite(numericBalance)) {
    throw new Error(
      "Cash balance must be a valid number"
    );
  }

  await offlineDb.cashBalances.put({
    store_id: storeId,
    confirmed_balance: numericBalance,
    updated_at: new Date().toISOString()
  });
};

/**
 * Returns the last balance received from the backend.
 */
export const getCachedConfirmedCashBalance =
  async storeId => {
    if (!storeId) {
      return null;
    }

    const record =
      await offlineDb.cashBalances.get(storeId);

    if (!record) {
      return null;
    }

    return Number(
      record.confirmed_balance || 0
    );
  };

/**
 * Calculates the total cost of an intake ticket.
 */
const getIntakeTotalCost = event => {
  const items = event?.payload?.items;

  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce(
    (total, item) =>
      total +
      Number(item.cost || 0) *
        Number(item.quantity || 0),
    0
  );
};

/**
 * Determines how a pending event affects cash.
 */
const getPendingCashDelta = event => {
  const amount = Number(
    event?.payload?.amount || 0
  );

  switch (event.event_type) {
    case "revenue":
      return Number.isFinite(amount)
        ? amount
        : 0;

    case "expense":
    case "return":
      return Number.isFinite(amount)
        ? -amount
        : 0;

    case "sale":
      return Array.isArray(
        event?.payload?.items
      )
        ? event.payload.items.reduce(
            (total, item) =>
              total +
              Number(item.price || 0) *
                Number(item.quantity || 0),
            0
          )
        : 0;

    case "intake":
      return event?.payload?.paid === true
        ? -getIntakeTotalCost(event)
        : 0;

    default:
      return 0;
  }
};

/**
 * Adds all still-pending cash effects for one store.
 */
export const getPendingCashDeltaForStore =
  async storeId => {
    if (!storeId) {
      return 0;
    }

    const pendingEvents =
      await offlineDb.pendingEvents
        .where("store_id")
        .equals(storeId)
        .toArray();

    return pendingEvents.reduce(
      (total, event) =>
        total + getPendingCashDelta(event),
      0
    );
  };

/**
 * Returns the balance that should currently be shown.
 *
 * Displayed balance =
 * last confirmed backend balance
 * + still-pending local cash movements
 */
export const getDisplayedCashBalance =
  async storeId => {
    const confirmedBalance =
      await getCachedConfirmedCashBalance(
        storeId
      );

    if (confirmedBalance === null) {
      return null;
    }

    const pendingDelta =
      await getPendingCashDeltaForStore(
        storeId
      );

    return confirmedBalance + pendingDelta;
  };
