import api from "./api.js";

export const login = (credentials) => api.post("/api/v1/auth/login", credentials);
export const registerUser = (payload) => api.post("/api/v1/auth/register", payload);
export const updateUser = (id, payload) => api.put(`/api/v1/auth/${id}`, payload);
export const deleteUser = (id) => api.delete(`/api/v1/auth/${id}`);
export const updatePassword = (id, payload) => api.patch(`/api/v1/auth/${id}`, payload);

