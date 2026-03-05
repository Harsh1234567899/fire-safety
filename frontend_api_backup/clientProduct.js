import apiClient from './api';

// Create or update products for a client
export const createClientProducts = async (payload) => {
    return await apiClient.post('/api/v17/client-product/create', payload);
};

// Get all products for a specific client
export const getClientProducts = async (clientId) => {
    return await apiClient.get(`/api/v17/client-product/client/${clientId}`);
};
