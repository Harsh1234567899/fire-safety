
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser, clearError } from '../store/slices/authSlice';
import { ShieldCheck, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const LoginScreen = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error: authError } = useSelector(state => state.auth);

    const [systemId, setSystemId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (authError) {
            setLocalError(authError);
            toast.error(authError);
            const timer = setTimeout(() => dispatch(clearError()), 3000);
            return () => clearTimeout(timer);
        }
    }, [authError, dispatch]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        if (!systemId || !password) {
            setLocalError('Please enter both System ID and Password');
            toast.error('Please enter both System ID and Password');
            return;
        }

        const result = await dispatch(loginUser({ systemId, password }));
        if (loginUser.fulfilled.match(result)) {
            const user = result.payload?.data?.user;
            const role = user?.role?.toLowerCase().replace(/[-\s_]+/g, '');
            if (role === 'godownmanager') {
                navigate('/register', { replace: true });
            } else if (role === 'manager') {
                navigate('/console', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-white/10 transition-all">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center shadow-xl shadow-red-900/20 mb-6 transform rotate-3 hover:rotate-0 transition-transform">
                            <ShieldCheck size={40} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tighter">{import.meta.env.VITE_APP_COMPANY_SHORT_NAME || 'Control Panel'}</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Liaison Management System</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {(localError || authError) && (
                            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={18} className="text-red-500 shrink-0" />
                                <p className="text-xs font-bold text-red-600 leading-tight">{localError || authError}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">System Identifier</label>
                            <div className="group flex items-center bg-gray-50 border border-transparent focus-within:bg-white focus-within:border-red-100 rounded-2xl px-4 py-4 transition-all">
                                <div className="shrink-0 mr-4 text-gray-300 group-focus-within:text-red-500 transition-colors pointer-events-none">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={systemId}
                                    onChange={(e) => setSystemId(e.target.value)}
                                    className="w-full bg-transparent border-none outline-none text-sm font-bold placeholder:text-gray-300"
                                    placeholder="ID: admin01"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Secure Password</label>
                            <div className="group flex items-center bg-gray-50 border border-transparent focus-within:bg-white focus-within:border-red-100 rounded-2xl px-4 py-4 transition-all">
                                <div className="shrink-0 mr-4 text-gray-300 group-focus-within:text-red-500 transition-colors pointer-events-none">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-transparent border-none outline-none text-sm font-bold placeholder:text-gray-300"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="shrink-0 ml-2 text-gray-300 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#ef4444] hover:bg-red-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-red-500/20 transition-all active:scale-[0.98] uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Login
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.1em]">
                            Authorized Internal Access Only<br />
                            {import.meta.env.VITE_APP_COMPANY_NAME || 'Company Name'} © {new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
