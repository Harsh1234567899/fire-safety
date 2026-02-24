import api from "./api.js";

export const getAllUsers = () => api.get("/v2/users/all-users");
export const logoutUser = () => api.post("/v2/users/logout");
