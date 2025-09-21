// src/services/axiosInstance.ts
import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (!(config.data instanceof FormData)) {
      config.headers.set("Content-Type", "application/json");
    } else {
      config.headers.delete("Content-Type");
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || "").toLowerCase();

    if (status === 401) {
      // If server tells us token is invalid/expired — force logout client-side.
      if (
        message.includes("token") ||
        message.includes("expired") ||
        message.includes("unauthorized")
      ) {
        try {
          // clear any stored auth data
          localStorage.clear();
        } catch (e) {
          // ignore
        }

        // redirect to login if not already there
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          // use replace to avoid leaving a back entry to the protected page
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
