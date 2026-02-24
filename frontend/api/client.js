import api from "./api.js";

export const createClient = (payload) => api.post("/v3/client/create", payload);
export const getAllClients = (params) => api.get("/v3/client/all-clients", { params }); // Supports q, page, limit
export const updateClient = (id, payload) => api.patch(`/v3/client/update/${id}`, payload);
export const searchClients = (query) => api.get("/v3/client/all-clients", { params: { q: query, limit: 100 } });
