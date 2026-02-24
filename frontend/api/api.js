import axios from "axios";
import { store } from "../store";
import { logout } from "../store/slices/authSlice";


const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // send cookies
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // specific check for 401 and avoid infinite loop if refresh itself fails
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await apiClient.post("/api/v1/auth/refresh-token");
        const { accessToken } = response.data.data;

        // If your app uses localStorage for something, update it here.
        // But since we use cookies, just retrying is often enough if cookie is set.

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

