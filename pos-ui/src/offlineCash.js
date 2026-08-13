import { offlineDb } from "./offlineDb";

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

const getRegisterAmount = event => {
  const payload = event?.payload || {};

  const value =
    payload.register_amount ??
    payload.amount ??
    0;

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
};

const getPendingCashDelta = event => {
  const registerAmount =
    getRegisterAmount(event);

  switch (event.event_type) {
    case "revenue":
    case "cash_adjustment_positive":
    case "cash_transfer_in":
      return registerAmount;

    case "expense":
    case "return":
    case "cash_adjustment_negative":
    case "cash_transfer_out":
      return -registerAmount;

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
