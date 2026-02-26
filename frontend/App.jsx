
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatCard from './components/StatCard';
import ComplianceChart from './components/ComplianceChart';
import AssetsChart from './components/AssetsChart';
import RegionalDensityChart from './components/RegionalDensityChart';
import ManagementHub from './components/ManagementHub';
import StaffScreen from './components/StaffScreen';
import SettingsScreen from './components/SettingsScreen';
import ManagerConsole from './components/ManagerConsole';
import ReportsScreen from './components/ReportsScreen';
import RegisterFirmScreen from './components/RegisterFirmScreen';
import ClientsScreen from './components/ClientsScreen';
import LoginScreen from './components/LoginScreen';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundScreen from './components/NotFoundScreen';
import { Toaster } from 'react-hot-toast';

import { Users, AlertTriangle, Clock, Calendar, Flame, FileText, ShieldCheck, Sparkles, Wrench, ArrowRight } from 'lucide-react';
import { generateDashboardInsight } from './services/geminiService';
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
    const { data: dashboardData } = useSelector(state => state.dashboard);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Initial Data Fetch - Protected
    useEffect(() => {
        if (currentUser) {
            dispatch(fetchClients(''));
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
        dispatch(logout());
        navigate('/login', { replace: true });
    };

    const handleImportClients = (newClients) => {
        // This should ideally dispatch an action to import clients via Redux/API
    };

    const DashboardPage = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Executive Dashboard</h1>
                    <p className="text-gray-500 italic">Safety metrics for <span className="font-semibold text-gray-800">{dashboardData?.metrics?.totalClients || 0} registered firms.</span></p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                    label="Total Clients"
                    value={dashboardData.metrics.totalClients}
                    icon={Users}
                    colorTheme="blue"
                    onClick={() => navigate('/clients')}
                />
                <StatCard
                    label="Expired Records"
                    value={dashboardData.metrics.expiredRecords}
                    icon={AlertTriangle}
                    colorTheme="red"
                    onClick={() => navigate('/console')}
                />
                <StatCard
                    label="7-Day Critical"
                    value={dashboardData.metrics.critical7Day}
                    icon={Clock}
                    colorTheme="orange"
                    onClick={() => navigate('/console')}
                />
                <StatCard
                    label="30-Day Warning"
                    value={dashboardData.metrics.warning30Day}
                    icon={Calendar}
                    colorTheme="yellow"
                    onClick={() => navigate('/console')}
                />
            </div>

            <div className="mb-8">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Core Service Provisions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        label="Gas Cylinders"
                        value={dashboardData.provisions.cylinders}
                        icon={Flame}
                        colorTheme="yellow"
                        onClick={() => navigate('/reports')}
                    />
                    <StatCard
                        label="Fire NOC"
                        value={dashboardData.provisions.fireNoc}
                        icon={FileText}
                        colorTheme="blue"
                        onClick={() => navigate('/reports')}
                    />
                    <StatCard
                        label="AMC Contracts"
                        value={dashboardData.provisions.amcContracts}
                        icon={ShieldCheck}
                        colorTheme="purple"
                        onClick={() => navigate('/reports')}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div
                    onClick={() => navigate('/console')}
                    className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                >
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-800 tracking-wide uppercase">Compliance Health</h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Status Overview</span>
                    </div>
                    <ComplianceChart data={dashboardData.compliance} />
                </div>

                <div
                    onClick={() => navigate('/reports')}
                    className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                >
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-800 tracking-wide uppercase">Assets Volume</h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Service Split</span>
                    </div>
                    <div className="relative">
                        <AssetsChart data={dashboardData.assets} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                    <RegionalDensityChart data={dashboardData.regional} />
                </div>
                <div className="lg:col-span-1">
                    <ManagementHub onNavigate={(path) => navigate(path)} />
                </div>
            </div>

            {/* Recent Client List */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-10 py-8 flex items-center justify-between border-b border-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Recent Firm Registrations</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Live Feed of Latest Safety Intakes</p>
                    </div>
                    <button
                        onClick={() => navigate('/clients')}
                        className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 transition-colors uppercase tracking-widest"
                    >
                        View Full Directory <ArrowRight size={14} />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 text-left">
                                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Firm Name</th>
                                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact</th>
                                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</th>
                                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Provisions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {clients.slice(0, 5).map((client) => (
                                <tr key={client.id} className="hover:bg-red-50/10 transition-colors">
                                    <td className="px-10 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm">{client.initial}</div>
                                            <span className="text-sm font-bold text-gray-900">{client.firmName}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-5">
                                        <p className="text-sm font-medium text-gray-700">{client.contactPerson}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">{client.phone}</p>
                                    </td>
                                    <td className="px-10 py-5">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{client.city || 'N/A'}</span>
                                    </td>
                                    <td className="px-10 py-5 text-right">
                                        <div className="flex justify-end gap-1">
                                            {(client.services || []).map((s, i) => (
                                                <span key={`${s}-${i}`} className="px-2 py-0.5 rounded bg-gray-100 text-[9px] font-bold uppercase tracking-widest text-gray-400">{s}</span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-10 py-20 text-center text-gray-300 font-bold uppercase tracking-widest text-xs italic">No firms registered in the current cycle</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="h-8"></div>
        </div>
    );

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
            </main>
        </div>
    );
};


export default App;
