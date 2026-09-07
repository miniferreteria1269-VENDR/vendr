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

export const cacheConfirmedStrongboxBalance = async (
  storeId,
  balance
) => {
  if (!storeId) {
    return;
  }

  const numericBalance = Number(balance);

  if (!Number.isFinite(numericBalance)) {
    throw new Error(
      "Strongbox balance must be a valid number"
    );
  }

  await offlineDb.strongboxBalances.put({
    store_id: storeId,
    confirmed_balance: numericBalance,
    updated_at: new Date().toISOString()
  });
};

export const getCachedConfirmedStrongboxBalance =
  async storeId => {
    if (!storeId) {
      return null;
    }

    const record =
      await offlineDb.strongboxBalances.get(storeId);

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

const isStrongboxSource = event => {
  const source = String(
    event?.payload?.external_source || ""
  ).trim().toLowerCase();

  return (
    source === "strongbox" ||
    source === "caja fuerte"
  );
};

const getExternalAmount = event => {
  const value =
    event?.payload?.external_amount ?? 0;

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

const getPendingStrongboxDelta = event => {
  const amount = Number(
    event?.payload?.amount || 0
  );

  const safeAmount = Number.isFinite(amount)
    ? amount
    : 0;

  switch (event.event_type) {
    case "cash_transfer_out":
      return isStrongboxSource(event)
        ? safeAmount
        : 0;

    case "cash_transfer_in":
      return isStrongboxSource(event)
        ? -safeAmount
        : 0;

    case "revenue":
      return isStrongboxSource(event)
        ? getExternalAmount(event)
        : 0;

    case "expense":
      return isStrongboxSource(event)
        ? -getExternalAmount(event)
        : 0;

    case "strongbox_adjustment_positive":
      return safeAmount;

    case "strongbox_adjustment_negative":
      return -safeAmount;

    default:
      return 0;
  }
};

export const getPendingStrongboxDeltaForStore =
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
        total + getPendingStrongboxDelta(event),
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

export const getDisplayedStrongboxBalance =
  async storeId => {
    const confirmedBalance =
      await getCachedConfirmedStrongboxBalance(
        storeId
      );

    if (confirmedBalance === null) {
      return null;
    }

    const pendingDelta =
      await getPendingStrongboxDeltaForStore(
        storeId
      );

    return confirmedBalance + pendingDelta;
  };
