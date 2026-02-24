import api from "./api.js";

export const createNOC = (payload) => api.post("/v9/fire-noc/create", payload);
export const getNOCsByClient = (clientId) => api.get(`/v9/fire-noc`, { params: { clientId } });

export const refillNOC = (payload) => api.post("/v9/fire-noc/refill", payload);
export const updateNOC = (id, payload) => api.put(`/v9/fire-noc/update/${id}`, payload);
export const downloadNOCReport = (params) => api.get("/v9/fire-noc/download", { params, responseType: 'blob' });
