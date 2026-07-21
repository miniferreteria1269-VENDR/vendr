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

export const submitPendingSale = async (salePayload) => {
  const response = await axios.post(
    `${API}/sale-ticket`,
    salePayload
  );

  if (
    response.data.status !== "accepted" &&
    response.data.status !== "already_processed"
  ) {
    throw new Error(
      `Unexpected sale status: ${response.data.status}`
    );
  }

  await offlineDb.pendingSales.delete(
    salePayload.client_event_id
  );

  return response.data;
};
