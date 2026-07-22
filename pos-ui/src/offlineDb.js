import Dexie from "dexie";

export const offlineDb =
  new Dexie("vendr_offline");

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

offlineDb.version(3).stores({
  // Keep the old queue temporarily for safe migration.
  pendingSales:
    "client_event_id, store_id, status, created_at",

  pendingEvents:
    "client_event_id, event_type, store_id, status, created_at",

  products:
    "[store_id+product_id], store_id, product_id, name, is_active"
});

offlineDb.version(4).stores({
  pendingSales:
    "client_event_id, store_id, status, created_at",

  pendingEvents:
    "client_event_id, event_type, store_id, status, created_at",

  products:
    "[store_id+product_id], store_id, product_id, name, is_active",

  cashBalances:
    "store_id, updated_at"
});
