
import { SIDEBAR_ITEMS } from '../constants';
import { LogOut, ShieldCheck, X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { Link, useLocation, useNavigate } from 'react-router-dom';


const Sidebar = ({ isOpen, onClose, onSignOut }) => {
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useSelector(state => state.auth);

    const rawRole = user?.role || 'GUEST';
    const userRole = rawRole.toLowerCase();
    const userName = user?.name || 'Guest';

    const handleSignOut = () => {
        if (onSignOut) {
            onSignOut();
        } else {
            dispatch(logout());
            navigate('/login', { replace: true });
        }
    };

    // Role-based filtering using roles array from constants
    const filteredNavItems = SIDEBAR_ITEMS.filter(item => {
        if (!item.roles) return true;
        return item.roles.includes(userRole);
    });

    const dashboardItem = SIDEBAR_ITEMS.find(i => i.label === 'Dashboard');
    const DashboardIcon = dashboardItem?.icon;
    const showDashboard = dashboardItem?.roles?.includes(userRole);

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed left-0 top-0 h-full w-64 bg-[#0f172a] text-gray-300 flex flex-col z-50 transition-transform duration-300 ease-spring ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-2xl md:shadow-none`}>
                <div className="absolute top-0 left-0 w-full h-96 bg-red-600/5 blur-[120px] pointer-events-none -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-full h-96 bg-blue-600/5 blur-[120px] pointer-events-none translate-y-1/2"></div>

                <div className="h-20 flex items-center px-8 border-b border-slate-800/50 relative z-10 bg-slate-900/20 backdrop-blur-sm">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 text-white font-bold text-xl tracking-tight">
                            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/40 transform rotate-3">
                                <ShieldCheck size={20} className="text-white transform -rotate-3" />
                            </div>
                            <span className="bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">Sahaj Group</span>
                        </div>
                        {/* Mobile Close Button */}
                        <button
                            onClick={onClose}
                            className="md:hidden w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white bg-slate-800/50 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-1 relative z-10 custom-scrollbar">
                    {showDashboard && (
                        <div className="mb-8">
                            <p className="px-4 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Principal Views</p>
                            <Link
                                to="/dashboard"
                                onClick={onClose}
                                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center gap-3 transition-all group ${location.pathname === '/dashboard'
                                    ? 'bg-red-600/10 text-white shadow-xl shadow-red-900/10'
                                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${location.pathname === '/dashboard' ? 'bg-red-600 text-white shadow-lg shadow-red-500/40' : 'bg-slate-800 text-slate-500 group-hover:text-white'
                                    }`}>
                                    {DashboardIcon && <DashboardIcon size={18} />}
                                </div>
                                Dashboard
                            </Link>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <p className="px-4 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Operations</p>
                        {filteredNavItems.filter(item => item.label !== 'Dashboard').map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.label}
                                    to={item.path}
                                    onClick={onClose}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group ${isActive
                                        ? 'bg-slate-800/60 text-white shadow-lg border border-slate-700/50'
                                        : 'text-slate-500 hover:bg-slate-800/30 hover:text-slate-300 hover:translate-x-1'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-slate-800/40 text-slate-600 group-hover:text-slate-400'
                                        }`}>
                                        <item.icon size={16} />
                                    </div>
                                    {item.label}
                                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>}
                                </Link>
                            );
                        })}
                    </div>

                </nav>

                <div className="p-6 border-t border-slate-800/50 space-y-4 relative z-10 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-slate-800/30 rounded-2xl p-3 flex items-center gap-3 border border-slate-700/30">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold border border-red-500/30 shadow-lg">
                            {userName.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">{userName}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{userRole.replace('-', ' ')}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-xs font-bold text-slate-500 hover:text-white hover:bg-red-600/10 border border-transparent hover:border-red-600/20 transition-all uppercase tracking-widest"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
