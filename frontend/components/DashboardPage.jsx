import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Users, AlertTriangle, Clock, Calendar, Flame, FileText, ShieldCheck, ArrowRight } from 'lucide-react';
import StatCard from './StatCard';
import ComplianceChart from './ComplianceChart';
import AssetsChart from './AssetsChart';
import RegionalDensityChart from './RegionalDensityChart';
import ManagementHub from './ManagementHub';

const DashboardPage = () => {
    const navigate = useNavigate();
    const { items: clients = [] } = useSelector(state => state.clients);
    const { data: dashboardData } = useSelector(state => state.dashboard);

    return (
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
                                <tr key={client._id || client.id} className="hover:bg-red-50/10 transition-colors">
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
};

export default DashboardPage;
