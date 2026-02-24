
import React from 'react';
import { Plus, Users } from 'lucide-react';

const ManagementHub = ({ onNavigate }) => {
    return (
        <div className="bg-[#0f172a] p-8 rounded-3xl border border-gray-800 shadow-xl h-full flex flex-col justify-between relative overflow-hidden">
            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div>
                <h3 className="text-lg font-bold text-white tracking-wide uppercase mb-8">Management Hub</h3>

                <div className="space-y-4">
                    <button
                        onClick={() => onNavigate('/register')}
                        className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-4 group transition-all cursor-pointer active:scale-95"
                    >
                        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform">
                            <Plus size={20} strokeWidth={3} />
                        </div>
                        <span className="text-sm font-bold text-white tracking-wide">NEW FIRM INTAKE</span>
                    </button>

                    <button
                        onClick={() => onNavigate('/clients')}
                        className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-4 group transition-all cursor-pointer active:scale-95"
                    >
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-900/20 group-hover:scale-105 transition-transform">
                            <Users size={20} />
                        </div>
                        <span className="text-sm font-bold text-white tracking-wide">FULL DIRECTORY</span>
                    </button>
                </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Live Performance</p>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">Database Engine</span>
                        <span className="text-xs font-bold text-green-500">OPTIMIZED</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">PDF Generator</span>
                        <span className="text-xs font-bold text-green-500">READY</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagementHub;
