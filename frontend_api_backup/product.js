import apiClient from './api';

// Get all products
export const getAllProducts = async () => {
    return await apiClient.get('/api/v14/product');
};

// Create a new product (Admin)
export const createProduct = async (formData) => {
    return await apiClient.post('/api/v14/product', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// Update an existing product (Admin)
export const updateProduct = async (id, formData) => {
    return await apiClient.patch(`/api/v14/product/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// Delete a product (Admin)
export const deleteProduct = async (id) => {
    return await apiClient.delete(`/api/v14/product/${id}`);
};
