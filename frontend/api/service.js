import api from "./api.js";

// Fetches grouped services (AMCs, NOCs, Extinguishers) for a specific client
export const getClientServices = (clientId) => api.get(`/v13/service/get-client-services/${clientId}`);

export const getAllServices = () => api.get("/v13/service/get-all");
export const getServiceById = (id) => api.get(`/v13/service/${id}`);
