import api from "./api.js";

export const createNOC = (payload) => api.post("/api/v9/fire-noc/create", payload);
export const getNOCsByClient = (clientId) => api.get(`/api/v9/fire-noc`, { params: { clientId } });
export const getAllNOCs = (params) => api.get(`/api/v9/fire-noc`, { params });

export const refillNOC = (payload) => api.post("/api/v9/fire-noc/refill", payload);
export const updateNOC = (id, payload) => api.put(`/api/v9/fire-noc/update/${id}`, payload);
export const downloadNOCReport = (params) => api.post("/api/v9/fire-noc/download", params, { responseType: 'blob' });
export const deleteFireNoc = (id) => api.delete(`/api/v9/fire-noc/${id}`);
