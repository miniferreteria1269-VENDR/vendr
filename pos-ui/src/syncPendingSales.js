import { offlineDb } from "./offlineDb";
import { submitPendingSale } from "./offlineSales";

export const syncPendingSales = async () => {
  const pendingSales = await offlineDb.pendingSales
    .where("status")
    .equals("pending")
    .sortBy("created_at");

  const results = {
    attempted: 0,
    synced: 0,
    failed: 0
  };

  for (const sale of pendingSales) {
    results.attempted += 1;

    try {
      await submitPendingSale(sale);
      results.synced += 1;
    } catch (error) {
      results.failed += 1;

      console.error(
        "PENDING SALE SYNC ERROR:",
        sale.client_event_id,
        error
      );

      // Stop here if connectivity is still unavailable.
      // This avoids repeatedly attempting every remaining sale.
      if (!navigator.onLine) {
        break;
      }
    }
  }

  return results;
};
