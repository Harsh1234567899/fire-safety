import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { login } from '../../services/auth';

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

// Check if this is a fresh tab (sessionStorage clears on tab close)
const isSessionAlive = sessionStorage.getItem('sessionAlive');
let savedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

// If user data exists but session is not alive → tab was closed, force re-login
if (savedUser && !isSessionAlive) {
    savedUser = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
}

if (savedUser && savedUser.role) {
    const r = savedUser.role.toLowerCase().replace(/[-\s_]+/g, '');
    if (r === 'godownmanager') savedUser.role = 'godown-manager';
    else if (r === 'manager') savedUser.role = 'manager';
    else if (r === 'admin') savedUser.role = 'admin';
}

const initialState = {
    user: savedUser,
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
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            sessionStorage.removeItem('sessionAlive');
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
                if (state.user && state.user.role) {
                    const r = state.user.role.toLowerCase().replace(/[-\s_]+/g, '');
                    if (r === 'godownmanager') state.user.role = 'godown-manager';
                    else if (r === 'manager') state.user.role = 'manager';
                    else if (r === 'admin') state.user.role = 'admin';
                }
                state.isAuthenticated = true;
                localStorage.setItem('adminToken', action.payload?.data?.accessToken);
                localStorage.setItem('refreshToken', action.payload?.data?.refreshToken);
                localStorage.setItem('user', JSON.stringify(state.user));
                sessionStorage.setItem('sessionAlive', 'true');
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
