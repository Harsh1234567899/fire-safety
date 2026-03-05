import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDashboardStats, getMonthlyServiceStatus } from '../../services/dashboard';

export const fetchDashboardData = createAsyncThunk(
    'dashboard/fetchData',
    async (_, { rejectWithValue }) => {
        try {
            const [statsRes, monthlyRes] = await Promise.all([
                getDashboardStats(),
                getMonthlyServiceStatus()
            ]);
            return { ...statsRes.data?.data, monthlyStatus: monthlyRes.data?.data };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const initialState = {
    data: {
        metrics: { totalClients: 0, expiredRecords: 0, critical7Day: 0, warning30Day: 0 },
        provisions: { cylinders: 0, fireNoc: 0, amcContracts: 0 },
        compliance: [],
        assets: [],
        regional: []
    },
    loading: false,
    error: null,
};

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardData.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchDashboardData.fulfilled, (state, action) => {
                state.loading = false;
                const s = action.payload;
                state.data = {
                    metrics: {
                        totalClients: s?.clientsCount || 0,
                        expiredRecords: (s?.amc?.expired || 0) + (s?.fireExtinguishers?.expired || 0) + (s?.fireNOCs?.expired || 0),
                        critical7Day: (s?.amc?.critical || 0) + (s?.fireExtinguishers?.critical || 0) + (s?.fireNOCs?.critical || 0),
                        warning30Day: (s?.amc?.warning || 0) + (s?.fireExtinguishers?.warning || 0) + (s?.fireNOCs?.warning || 0)
                    },
                    provisions: {
                        cylinders: s?.fireExtinguishers?.total || 0,
                        fireNoc: s?.fireNOCs?.total || 0,
                        amcContracts: s?.amc?.total || 0
                    },
                    compliance: [
                        { name: 'Expired', value: (s?.amc?.expired || 0) + (s?.fireExtinguishers?.expired || 0) + (s?.fireNOCs?.expired || 0), fill: '#ef4444' },
                        { name: 'Active', value: (s?.amc?.ongoing || 0) + (s?.fireExtinguishers?.ongoing || 0) + (s?.fireNOCs?.ongoing || 0), fill: '#22c55e' },
                    ],
                    assets: [
                        { name: 'NOCS', value: s?.fireNOCs?.total || 0, fill: '#6366f1' },
                        { name: 'AMCS', value: s?.amc?.total || 0, fill: '#a855f7' },
                        { name: 'CYLINDERS', value: s?.fireExtinguishers?.total || 0, fill: '#f59e0b' },
                    ],
                    regional: (s?.regional || []).map((r, i) => ({
                        ...r,
                        city: r.name,
                        fill: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#a855f7', '#06b6d4'][i % 7]
                    })),
                    monthlyStatus: s?.monthlyStatus || []
                };
            })
            .addCase(fetchDashboardData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export default dashboardSlice.reducer;
