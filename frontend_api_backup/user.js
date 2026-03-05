import api from "./api.js";

export const getAllUsers = () => api.get("/api/v2/users/all-users");
export const logoutUser = () => api.post("/api/v2/users/logout");
