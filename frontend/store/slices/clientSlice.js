import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { searchClients, updateClient as apiUpdateClient } from '../../api/client';

export const fetchClients = createAsyncThunk(
    'clients/fetchClients',
    async ({ query = '', page = 1, limit = 25 } = {}, { rejectWithValue }) => {
        try {
            const response = await searchClients(query, page, limit);
            // Assuming response.data contains { data: [...clients], total, page, limit }
            return {
                data: response.data?.data || [],
                total: response.data?.total || 0,
                page: response.data?.page || page,
                limit: response.data?.limit || limit
            };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateClient = createAsyncThunk(
    'clients/updateClient',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await apiUpdateClient(id, data);
            return response.data?.data; // Assuming backend returns updated client
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

const initialState = {
    items: [],
    loading: false,
    error: null,
    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        limit: 25
    }
};

const clientSlice = createSlice({
    name: 'clients',
    initialState,
    reducers: {
        // Optimistic update or manual set if needed
        setClients: (state, action) => {
            state.items = action.payload;
        },
        addClient: (state, action) => {
            state.items.unshift(action.payload);
        },
        deleteClientLocal: (state, action) => {
            state.items = state.items.filter(c => c._id !== action.payload);
        },
        updateClientLocal: (state, action) => {
            const index = state.items.findIndex(c => c._id === (action.payload._id || action.payload.id));
            if (index !== -1) {
                state.items[index] = { ...state.items[index], ...action.payload };
            }
        },
        importClientsLocal: (state, action) => {
            state.items = [...action.payload, ...state.items];
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchClients.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchClients.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.data;
                state.pagination = {
                    currentPage: action.payload.page,
                    totalItems: action.payload.total,
                    limit: action.payload.limit,
                    totalPages: Math.ceil(action.payload.total / action.payload.limit) || 1
                };
            })
            .addCase(fetchClients.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Update Client
            .addCase(updateClient.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateClient.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.items.findIndex(c => c._id === action.payload._id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(updateClient.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { setClients, addClient, deleteClientLocal, updateClientLocal, importClientsLocal } = clientSlice.actions;
export default clientSlice.reducer;
