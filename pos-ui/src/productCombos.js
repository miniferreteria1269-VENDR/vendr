import { offlineDb } from "./offlineDb";

export const cacheProductCombos = async (storeId, combos) => {
  if (!storeId || !Array.isArray(combos)) return;

  const records = combos.map(combo => ({
    ...combo,
    store_id: storeId
  }));

  await offlineDb.transaction(
    "rw",
    offlineDb.productCombos,
    async () => {
      await offlineDb.productCombos
        .where("store_id")
        .equals(storeId)
        .delete();
      await offlineDb.productCombos.bulkPut(records);
    }
  );
};

export const getCachedProductCombos = async storeId => {
  if (!storeId) return [];

  return offlineDb.productCombos
    .where("store_id")
    .equals(storeId)
    .filter(combo => combo.active !== false)
    .toArray();
};
