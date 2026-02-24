import api from "./api.js";

export const createAMC = (payload) => api.post("/v4/amc/create", payload);
export const getAMCsByClient = (clientId) => api.get(`/v4/amc/all`, { params: { clientId } });

export const refillAMC = (payload) => api.post("/v4/amc/refill", payload);
export const updateAMC = (id, payload) => api.put(`/v4/amc/update/${id}`, payload);
export const downloadAMCReport = (params) => api.post("/v4/amc/download", params, { responseType: 'blob' });
