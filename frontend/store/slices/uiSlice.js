import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentView: 'Dashboard', // Default view
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setCurrentView: (state, action) => {
            state.currentView = action.payload;
        },
    },
});

export const { setCurrentView } = uiSlice.actions;
export default uiSlice.reducer;
