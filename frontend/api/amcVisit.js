import api from "./api.js";

export const createAmcVisit = (payload) => api.post("/v5/amc-visit/create", payload);
export const updateAmcVisit = (id, payload) => api.put(`/v5/amc-visit/update/${id}`, payload);
