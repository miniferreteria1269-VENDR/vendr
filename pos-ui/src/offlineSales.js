import axios from "axios";
import { offlineDb } from "./offlineDb";

const API = "https://vendr-onkr.onrender.com";

export const savePendingSale = async (salePayload) => {
  await offlineDb.pendingSales.put({
    ...salePayload,
    status: "pending",
    created_at: salePayload.client_created_at
  });
};

export const markSaleSynced = async (clientEventId) => {
  await offlineDb.pendingSales.update(clientEventId, {
    status: "synced",
    synced_at: new Date().toISOString()
  });
};

export const submitPendingSale = async (salePayload) => {
  const response = await axios.post(`${API}/sale-ticket`, salePayload);

  if (
    response.data.status !== "accepted" &&
    response.data.status !== "already_processed"
  ) {
    throw new Error(
      `Unexpected sale status: ${response.data.status}`
    );
  }

  await markSaleSynced(salePayload.client_event_id);

  return response.data;
};
