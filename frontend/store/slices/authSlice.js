import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { login } from '../../api/auth';

export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await login(credentials);
            return response.data; // { statusCode, data: { user, accessToken, refreshToken }, message }
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Login failed');
        }
    }
);

const savedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

const initialState = {
    user: savedUser, // Restore user if exists
    isAuthenticated: !!savedUser,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginSuccess: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            localStorage.removeItem('adminToken');
            localStorage.removeItem('user');
        },
        // We'll hydrate from localStorage in App.jsx or here if we added thunks, 
        // but simple sync action is enough if App handles the initialization check
        setUser: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                // Backend returns { statusCode, data: { user, accessToken... }, message }
                // So action.payload.data.user is the user object
                state.user = action.payload?.data?.user;
                state.isAuthenticated = true;
                localStorage.setItem('adminToken', action.payload?.data?.accessToken); // Store token if needed for non-cookie auth
                localStorage.setItem('user', JSON.stringify(action.payload?.data?.user));
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.isAuthenticated = false;
            });
    }
});

export const { loginSuccess, logout, setUser, clearError } = authSlice.actions;
export default authSlice.reducer;
