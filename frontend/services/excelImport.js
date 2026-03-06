import api from './api';

export const uploadExcelFile = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/v19/excel-import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 min timeout for large files
    });
};
