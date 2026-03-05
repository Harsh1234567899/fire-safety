import apiClient from './api';

// Get all reach requests (Admin)
export const getAllReach = async () => {
    return await apiClient.get('/api/v15/reach/all');
};

// Create a new reach (Public Website)
// Note: typically you might use a different axios instance or full path if the public site acts independently.
// Assuming both use the same base.
export const createReach = async (payload) => {
    return await apiClient.post('/api/v15/reach/create', payload);
};

// Delete a reach request (Admin)
export const deleteReach = async (id) => {
    return await apiClient.delete(`/api/v15/reach/delete/${id}`);
};
