import apiClient from './api';

// Get latest notifications
export const getNotifications = async () => {
    return await apiClient.get('/api/v16/notifications');
};

// Mark all as read
export const markAllRead = async () => {
    return await apiClient.patch('/api/v16/notifications/mark-read');
};
