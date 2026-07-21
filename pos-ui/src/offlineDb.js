import Dexie from "dexie";

export const offlineDb = new Dexie("vendr_offline");

offlineDb.version(1).stores({
  pendingSales:
    "client_event_id, store_id, status, created_at"
});

offlineDb.version(2).stores({
  pendingSales:
    "client_event_id, store_id, status, created_at",

  products:
    "[store_id+product_id], store_id, product_id, name, is_active"
});
