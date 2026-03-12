import api from "./api.js";

export const createAmcVisit = (payload) => api.post("/api/v5/amc-visit/create", payload);
export const updateAmcVisit = (id, payload) => api.put(`/api/v5/amc-visit/update/${id}`, payload);
export const deleteAmcVisit = (id) => api.delete(`/api/v5/amc-visit/${id}`);
