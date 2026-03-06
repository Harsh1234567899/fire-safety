import axios from "axios";
import { store } from "../store";
import { logout } from "../store/slices/authSlice";
import { dataCache } from "../utils/dataCache";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshTokenPayload = localStorage.getItem('refreshToken');
        const response = await apiClient.post("/api/v1/auth/refresh-token", {
          refreshToken: refreshTokenPayload,
        });
        const { accessToken, refreshToken } = response.data.data;

        if (accessToken) localStorage.setItem('adminToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

        // Notify all queued requests that the refresh succeeded
        processQueue(null, accessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
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
