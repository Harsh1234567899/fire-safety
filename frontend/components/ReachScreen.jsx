import React, { useState, useEffect } from 'react';
import { Search, Loader2, Copy, Trash2, Mail, Phone, Calendar, RefreshCw } from 'lucide-react';
import { getAllReach, deleteReach } from '../services/reach';
import toast from 'react-hot-toast';
import { dataCache } from '../utils/dataCache';

const ReachScreen = () => {
    const [reaches, setReaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchReaches = async (forceRefresh = false) => {
        if (!forceRefresh && dataCache.has('reaches')) {
            setReaches(dataCache.get('reaches'));
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await getAllReach();
            let result = [];
            if (data?.data?.data) {
                result = data.data.data;
            } else if (data?.data) {
                result = data.data;
            } else if (Array.isArray(data)) {
                result = data;
            }
            setReaches(result);
            dataCache.set('reaches', result);
        } catch (error) {
            console.error("Failed to fetch reach data:", error);
            toast.error("Failed to load contact requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReaches();
    }, []);

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete the request from ${name}?`)) {
            try {
                await deleteReach(id);
                toast.success("Contact request deleted");
                setReaches(reaches.filter(r => r._id !== id));
            } catch (error) {
                console.error("Failed to delete reach request:", error);
                toast.error("Failed to delete request");
            }
        }
    };

    const handleCopy = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            toast.success(`${label} copied!`, { icon: '📋' });
        });
    };

    const sortedReaches = Array.isArray(reaches) ? reaches : [];
    const filteredReaches = sortedReaches.filter(r =>
        (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.firmName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.contactEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.contactNumber || '').includes(searchTerm)
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-full flex flex-col">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Contact Requests</h1>
                    <p className="text-gray-500 italic text-sm">Review inquiries submitted from the website.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => fetchReaches(true)}
                        className="flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all uppercase tracking-widest shadow-sm flex-1 sm:flex-none"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin text-red-600" : ""} /> Refresh
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col mb-12 overflow-hidden w-full max-w-[100vw] flex-1">
                {/* Search Bar */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-1.5 flex items-center group focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all hover:border-blue-500/50">
                            <Search className="text-gray-400 ml-3 shrink-0 transition-colors pointer-events-none group-focus-within:text-blue-500" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name, firm, email, or phone..."
                                className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-medium text-gray-700 h-10 w-full placeholder:text-gray-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto custom-scrollbar flex-1 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 backdrop-blur-[2px]">
                            <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest animate-pulse">Loading Requests...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">Contact Info</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">Firm Name</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 min-w-[300px]">Requirements</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredReaches.length > 0 ? filteredReaches.map((reach) => (
                                    <tr key={reach._id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-gray-400" />
                                                <span className="text-xs font-bold text-gray-700">
                                                    {new Date(reach.createdAt).toLocaleDateString("en-GB", {
                                                        day: "numeric", month: "short", year: "numeric",
                                                    })}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-medium ml-6">
                                                {new Date(reach.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col gap-2">
                                                <div className="font-bold text-gray-900 text-sm">{reach.name}</div>
                                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600 group/copy cursor-pointer w-fit" onClick={() => handleCopy(reach.contactEmail, "Email")}>
                                                    <Mail size={12} className="text-gray-400 group-hover/copy:text-blue-500 transition-colors" />
                                                    <span className="group-hover/copy:text-blue-600 transition-colors">{reach.contactEmail}</span>
                                                    <Copy size={10} className="opacity-0 group-hover/copy:opacity-100 text-blue-500 transition-opacity" />
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-mono font-medium text-gray-600 group/copy cursor-pointer w-fit" onClick={() => handleCopy(reach.contactNumber, "Phone")}>
                                                    <Phone size={12} className="text-gray-400 group-hover/copy:text-blue-500 transition-colors" />
                                                    <span className="group-hover/copy:text-blue-600 transition-colors">{reach.contactNumber}</span>
                                                    <Copy size={10} className="opacity-0 group-hover/copy:opacity-100 text-blue-500 transition-opacity" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 inline-block">
                                                {reach.firmName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                                                {reach.requirements}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right align-top">
                                            <button
                                                onClick={() => handleDelete(reach._id, reach.name)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                title="Delete Request"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                    <Mail className="text-gray-300" size={24} />
                                                </div>
                                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Contact Requests</h3>
                                                <p className="text-xs text-gray-400 mt-1">There are no matching inquiries based on your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReachScreen;
