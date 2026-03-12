import axios from "axios";
import { store } from "../store";
import { logout } from "../store/slices/authSlice";
import { dataCache } from "../utils/dataCache";

const apiClient = axios.create({
  baseURL:  "",
  // baseURL: import.meta.env.VITE_API_BASE_URL || "",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  // Let the browser send the HttpOnly cookies automatically
  // (withCredentials is set to true above)
  return config;
});

// ── Refresh Lock ──
// When multiple requests fail with 401 simultaneously, only ONE refresh
// call is made. All others wait for it to complete, then retry with the new token.
let isRefreshing = false;
let failedQueue = []; // requests waiting for the refresh to finish

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint =
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/refresh-token');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          // Browser will automatically attach the new HttpOnly cookies
          return apiClient(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // The refresh endpoint reads the refreshToken from the HttpOnly cookie
        // and sets the new accessToken and refreshToken via Set-Cookie headers automatically.
        await apiClient.post("/api/v1/auth/refresh-token");

        // Notify all queued requests that the refresh succeeded
        processQueue(null, true);

        // Retry the original request (browser will automatically send the new cookies)
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Notify all queued requests that refresh failed
        processQueue(refreshError, null);

        // Clear everything and redirect to login
        dataCache.clearAll();
        store.dispatch(logout());
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
