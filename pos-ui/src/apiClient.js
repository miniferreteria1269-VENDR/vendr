import axios from "axios";

const API =
  "https://vendr-onkr.onrender.com";

const apiClient = axios.create({
  baseURL: API
});

apiClient.interceptors.request.use(
  config => {
    const token =
      localStorage.getItem(
        "vendr_access_token"
      );

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  error =>
    Promise.reject(error)
);

export default apiClient;
