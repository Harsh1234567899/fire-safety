import api from "./api.js";

// Uses multipart/form-data; standard axios instance handles it if payload is FormData
export const uploadDocument = (formData) => api.post("/v8/document/upload", formData);
export const getDocument = (id) => api.get(`/v8/document/get/${id}`);
export const deleteDocument = (id) => api.delete(`/v8/document/${id}`);
