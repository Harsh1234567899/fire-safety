import api from "./api.js";

export const downloadAllServicesReport = (params) => api.post("/api/v18/all-service/download-all-report", params, { responseType: 'blob' });
