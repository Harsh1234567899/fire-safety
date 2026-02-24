import api from "./api.js";

export const login = (credentials) => api.post("/v1/auth/login", credentials);
export const registerUser = (payload) => api.post("/v1/auth/register", payload);
export const updateUser = (id, payload) => api.put(`/v1/auth/${id}`, payload);
export const deleteUser = (id) => api.delete(`/v1/auth/${id}`);
export const updatePassword = (id, payload) => api.patch(`/v1/auth/${id}`, payload);

