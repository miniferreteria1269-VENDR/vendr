import Dexie from "dexie";

export const offlineDb = new Dexie("vendr_offline");

offlineDb.version(1).stores({
  pendingSales: "client_event_id, store_id, status, created_at"
});
