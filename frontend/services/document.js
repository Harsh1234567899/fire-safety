import api from "./api.js";

// Uses multipart/form-data; standard axios instance handles it if payload is FormData
export const uploadDocument = (formData) => api.post("/api/v8/document/upload", formData);
export const getDocument = (id) => api.get(`/api/v8/document/get/${id}`);
export const deleteDocument = (id) => api.delete(`/api/v8/document/${id}`);
