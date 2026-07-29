import axios from "axios";

const apiClient = axios.create({
  baseURL:
    "https://vendr-onkr.onrender.com",

  // Prevent requests from remaining pending forever.
  timeout: 10000
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
