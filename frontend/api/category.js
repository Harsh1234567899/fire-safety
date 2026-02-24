import api from "./api.js";

export const getGasCategories = () => api.get("/v6/category");
export const getNocTypes = () => api.get("/v10/noc-types/all");

export const createGasSubCategory = (payload) => api.post("/v12/extinguisher-category/add-category", payload);
export const deleteGasSubCategory = (id) => api.post(`/v12/extinguisher-category/delete/${id}`);
export const updateGasSubCategory = (id, payload) => api.post(`/v12/extinguisher-category/update/${id}`, payload);

export const createNocType = (payload) => api.post("/v10/noc-types/create", payload);
export const updateNocType = (id, payload) => api.put(`/v10/noc-types/${id}`, payload);
export const deleteNocType = (id) => api.delete(`/v10/noc-types/${id}`);

