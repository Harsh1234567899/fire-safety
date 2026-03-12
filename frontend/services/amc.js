import api from "./api.js";

export const createAMC = (payload) => api.post("/api/v4/amc/create", payload);
export const getAMCsByClient = (clientId) => api.get(`/api/v4/amc/all`, { params: { clientId } });
export const getAllAMCs = (params) => api.get(`/api/v4/amc/all`, { params });

export const refillAMC = (payload) => api.post("/api/v4/amc/refill", payload);
export const updateAMC = (id, payload) => api.put(`/api/v4/amc/update/${id}`, payload);
export const downloadAMCReport = (params) => api.post("/api/v4/amc/download", params, { responseType: 'blob' });
export const deleteAmc = (id) => api.delete(`/api/v4/amc/${id}`);
