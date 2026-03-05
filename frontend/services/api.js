import axios from "axios";
import { store } from "../store";
import { logout } from "../store/slices/authSlice";


const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // send cookies
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // specific check for 401 and avoid infinite loop if refresh itself fails
    // DO NOT intercept 401s from the login endpoint or the refresh token endpoint itself
    const isAuthEndpoint = originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh-token');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshTokenPayload = localStorage.getItem('refreshToken');
        const response = await apiClient.post("/api/v1/auth/refresh-token", { refreshToken: refreshTokenPayload });
        const { accessToken, refreshToken } = response.data.data;

        // Update tokens for iOS fallback
        if (accessToken) localStorage.setItem('adminToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

        // Update original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear Redux state + localStorage and redirect to login
        store.dispatch(logout());
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

