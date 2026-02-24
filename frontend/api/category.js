import api from "./api.js";

export const getGasCategories = () => api.get("/api/v6/category");
export const getNocTypes = () => api.get("/api/v10/noc-types/all");

export const createGasSubCategory = (payload) => api.post("/api/v12/extinguisher-category/add-category", payload);
export const deleteGasSubCategory = (id) => api.post(`/api/v12/extinguisher-category/delete/${id}`);
export const updateGasSubCategory = (id, payload) => api.post(`/api/v12/extinguisher-category/update/${id}`, payload);

export const createNocType = (payload) => api.post("/api/v10/noc-types/create", payload);
export const updateNocType = (id, payload) => api.put(`/api/v10/noc-types/${id}`, payload);
export const deleteNocType = (id) => api.delete(`/api/v10/noc-types/${id}`);

