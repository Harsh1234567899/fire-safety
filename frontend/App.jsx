
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './components/DashboardPage';
import StaffScreen from './components/StaffScreen';
import SettingsScreen from './components/SettingsScreen';
import ManagerConsole from './components/ManagerConsole';
import ReportsScreen from './components/ReportsScreen';
import RegisterFirmScreen from './components/RegisterFirmScreen';
import ClientsScreen from './components/ClientsScreen';
import ReachScreen from './components/ReachScreen';
import LoginScreen from './components/LoginScreen';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundScreen from './components/NotFoundScreen';
import ExcelImportModal from './components/ExcelImportModal';
import { Toaster } from 'react-hot-toast';
import { dataCache } from './utils/dataCache';

import { useDispatch, useSelector } from 'react-redux';
import { setUser, logout } from './store/slices/authSlice';
import { fetchClients } from './store/slices/clientSlice';
import { fetchDashboardData } from './store/slices/dashboardSlice';


const App = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Redux State
    const { user: currentUser } = useSelector(state => state.auth);
    const { items: clients = [] } = useSelector(state => state.clients);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

    // Initial Data Fetch - Protected (fetch once on login with full data)
    useEffect(() => {
        if (currentUser) {
            dispatch(fetchClients({ limit: 200, lite: false }));
            dispatch(fetchDashboardData());
        }
    }, [dispatch, currentUser]);

    // Helper: get default route based on role
    const getDefaultRoute = () => {
        const role = currentUser?.role?.toLowerCase();
        if (role === 'godown-manager') return '/register';
        if (role === 'manager') return '/console';
        return '/dashboard';
    };

    const handleSignOut = () => {
        dataCache.clearAll();
        dispatch(logout());
        navigate('/login', { replace: true });
    };

    const handleImportClients = (newClients) => {
        // This should ideally dispatch an action to import clients via Redux/API
    };

    // If not logged in, show login or redirect
    if (!currentUser) {
        return (
            <>
                <Toaster position="top-right" />
                <Routes>
                    <Route path="/login" element={<LoginScreen />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Toaster position="top-right" />
            <Sidebar
                onSignOut={handleSignOut}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onImportExcel={() => setIsExcelImportOpen(true)}
            />

            <main className="flex-1 ml-0 md:ml-64 flex flex-col h-screen overflow-hidden relative transition-all duration-300">
                <Header
                    clients={clients}
                    onNavigateToClient={(client) => {
                        if (client.id === 'all') {
                            navigate('/clients');
                        } else {
                            navigate('/clients', { state: { selectedClient: client } });
                        }
                    }}
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    currentUser={currentUser}
                />

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="max-w-screen-2xl mx-auto">
                        <Routes>
                            <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
                            <Route path="/login" element={<Navigate to={getDefaultRoute()} replace />} />
                            <Route path="/dashboard" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <DashboardPage />
                                </ProtectedRoute>
                            } />
                            <Route path="/register" element={
                                <ProtectedRoute allowedRoles={['admin', 'manager', 'godown-manager']}>
                                    <RegisterFirmScreen />
                                </ProtectedRoute>
                            } />
                            <Route path="/clients" element={
                                <ProtectedRoute allowedRoles={['admin', 'manager', 'godown-manager']}>
                                    <ClientsScreen
                                        clients={clients}
                                        userRole={currentUser.role?.toLowerCase() || 'manager'}
                                        onRegisterNew={() => navigate('/register')}
                                        onImportClients={handleImportClients}
                                    />
                                </ProtectedRoute>
                            } />
                            <Route path="/reports" element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                    <ReportsScreen />
                                </ProtectedRoute>
                            } />
                            <Route path="/console" element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                    <ManagerConsole />
                                </ProtectedRoute>
                            } />
                            <Route path="/reach" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <ReachScreen />
                                </ProtectedRoute>
                            } />
                            <Route path="/settings" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <SettingsScreen />
                                </ProtectedRoute>
                            } />
                            <Route path="/staff" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <StaffScreen />
                                </ProtectedRoute>
                            } />
                            <Route path="*" element={<NotFoundScreen />} />
                        </Routes>
                    </div>
                </div>
            </main>

            <ExcelImportModal
                isOpen={isExcelImportOpen}
                onClose={() => setIsExcelImportOpen(false)}
            />
        </div>
    );
};


export default App;
