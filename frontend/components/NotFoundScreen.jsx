
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

const NotFoundScreen = () => {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-center h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-lg">
                {/* Glowing Icon */}
                <div className="relative inline-flex mb-8">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl scale-150 animate-pulse"></div>
                    <div className="relative w-28 h-28 bg-gradient-to-br from-red-600 to-red-800 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-900/30 transform rotate-3">
                        <ShieldAlert size={52} className="text-white transform -rotate-3" />
                    </div>
                </div>

                {/* Error Code */}
                <h1 className="text-[120px] font-black text-gray-100 leading-none -mb-4 tracking-tighter select-none">
                    404
                </h1>

                {/* Message */}
                <h2 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight">
                    Sector Not Found
                </h2>
                <p className="text-sm text-gray-400 mb-10 leading-relaxed max-w-sm mx-auto">
                    The route you requested does not exist within the {import.meta.env.VITE_APP_COMPANY_SHORT_NAME || 'Company'} Management System. Please verify the URL or navigate using the sidebar.
                </p>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="group flex items-center gap-2 px-6 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:border-gray-300 hover:shadow-md transition-all active:scale-[0.97]"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Go Back
                    </button>
                    <button
                        onClick={() => navigate('/', { replace: true })}
                        className="group flex items-center gap-2 px-6 py-3.5 bg-[#0f172a] rounded-2xl text-sm font-bold text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all active:scale-[0.97]"
                    >
                        <Home size={16} />
                        Dashboard
                    </button>
                </div>

                {/* Footer */}
                <p className="mt-12 text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">
                    {import.meta.env.VITE_APP_COMPANY_NAME || 'Liaison Management System'}
                </p>
            </div>
        </div>
    );
};

export default NotFoundScreen;
