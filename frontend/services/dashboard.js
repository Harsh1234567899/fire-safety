import api from "./api.js";

export const getDashboardStats = () => api.get("/api/v7/dashboard/count");
export const getMonthlyServiceStatus = () => api.get("/api/v7/dashboard/monthly-service-status");
