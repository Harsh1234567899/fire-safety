import api from "./api.js";

export const createClient = (payload) => api.post("/api/v3/client/create", payload);
export const getAllClients = (params) => api.get("/api/v3/client/all-clients", { params }); // Supports q, page, limit
export const updateClient = (id, payload) => api.patch(`/api/v3/client/update/${id}`, payload);
export const searchClients = (query, page = 1, limit = 25) => api.get("/api/v3/client/all-clients", { params: { q: query, page, limit } });
export const downloadClientDirectory = (params) => api.get('/api/v3/client/download-directory', { params, responseType: 'blob' });
