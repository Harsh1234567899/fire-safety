import api from "./api.js";

export const createCylinder = (payload) => api.post("/v11/fire-extinguisher/create", payload);
export const getCylindersByClient = (clientId) => api.get(`/v11/fire-extinguisher/all-silinder`, { params: { clientId } });

export const refillCylinder = (payload) => api.post("/v11/fire-extinguisher/refill", payload);
export const updateCylinder = (id, payload) => api.put(`/v11/fire-extinguisher/update/${id}`, payload);
export const downloadCylinderReport = (params) => api.post("/v11/fire-extinguisher/download-report", params, { responseType: 'blob' });
