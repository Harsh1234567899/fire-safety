import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { searchClients, updateClient as apiUpdateClient } from '../../api/client';

export const fetchClients = createAsyncThunk(
    'clients/fetchClients',
    async (query = '', { rejectWithValue }) => {
        try {
            const response = await searchClients(query);
            return response.data?.data || [];
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
                state.items = action.payload || [];
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
