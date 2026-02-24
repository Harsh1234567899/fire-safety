
import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Filter, MessageCircle, AlertCircle, Clock, CheckSquare, Square, X, Loader2 } from 'lucide-react';
import api from '../api/api.js';
import CustomDropdown from './CustomDropdown.jsx';

const ManagerConsole = () => {
    const [followUpItems, setFollowUpItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('All Cities');
    const [urgencyFilter, setUrgencyFilter] = useState('All Urgency');
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Fetch all cylinders, NOCs, and AMCs on mount
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const [cylindersRes, nocsRes, amcsRes] = await Promise.allSettled([
                    api.get('/v11/fire-extinguisher/all-silinder', { params: { limit: 200 } }),
                    api.get('/v9/fire-noc', { params: { limit: 200 } }),
                    api.get('/v4/amc/all', { params: { limit: 200 } }),
                ]);

                const now = new Date();
                const items = [];

                // Helper to extract array from various response shapes
                const extractArray = (res) => {
                    if (res.status !== 'fulfilled') return [];
                    const d = res.value?.data?.data;
                    if (Array.isArray(d)) return d;
                    if (d?.docs && Array.isArray(d.docs)) return d.docs;
                    if (d?.data && Array.isArray(d.data)) return d.data;
                    return [];
                };

                // Process Cylinders
                const cylinders = extractArray(cylindersRes);
                cylinders.forEach(cyl => {
                    if (!cyl.endDate) return;
                    const days = Math.floor((new Date(cyl.endDate) - now) / (1000 * 60 * 60 * 24));
                    if (days <= 30) {
                        const client = cyl.clientId || {};
                        items.push({
                            id: cyl._id,
                            firmName: client.firmName || 'Unknown Firm',
                            contactName: client.contactPerson || '',
                            phone: client.contactNumber || '',
                            location: client.city || '',
                            type: 'CYLINDER',
                            status: days < 0 ? 'Overdue' : days <= 7 ? 'Critical' : 'Upcoming',
                            daysLate: days,
                            targetDate: new Date(cyl.endDate).toLocaleDateString(),
                            initial: (client.firmName || 'U').charAt(0),
                        });
                    }
                });

                // Process NOCs
                const nocs = extractArray(nocsRes);
                nocs.forEach(noc => {
                    if (!noc.endDate) return;
                    const days = Math.floor((new Date(noc.endDate) - now) / (1000 * 60 * 60 * 24));
                    if (days <= 30) {
                        const client = noc.clientId || {};
                        items.push({
                            id: noc._id,
                            firmName: client.firmName || 'Unknown Firm',
                            contactName: client.contactPerson || '',
                            phone: client.contactNumber || '',
                            location: client.city || '',
                            type: 'NOC',
                            status: days < 0 ? 'Overdue' : days <= 7 ? 'Critical' : 'Upcoming',
                            daysLate: days,
                            targetDate: new Date(noc.endDate).toLocaleDateString(),
                            initial: (client.firmName || 'U').charAt(0),
                        });
                    }
                });

                // Process AMCs
                const amcs = extractArray(amcsRes);
                amcs.forEach(amc => {
                    if (!amc.endDate) return;
                    const days = Math.floor((new Date(amc.endDate) - now) / (1000 * 60 * 60 * 24));
                    if (days <= 30) {
                        const client = amc.clientId || {};
                        items.push({
                            id: amc._id,
                            firmName: client.firmName || 'Unknown Firm',
                            contactName: client.contactPerson || '',
                            phone: client.contactNumber || '',
                            location: client.city || '',
                            type: 'AMC',
                            status: days < 0 ? 'Overdue' : days <= 7 ? 'Critical' : 'Upcoming',
                            daysLate: days,
                            targetDate: new Date(amc.endDate).toLocaleDateString(),
                            initial: (client.firmName || 'U').charAt(0),
                        });
                    }
                });

                // Sort: Overdue first, then Critical, then Upcoming
                items.sort((a, b) => a.daysLate - b.daysLate);
                setFollowUpItems(items);
            } catch (err) {
                console.error('ManagerConsole fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    // Derive unique options from data
    const locations = useMemo(() => ['All Cities', ...Array.from(new Set(followUpItems.map(i => i.location).filter(Boolean)))], [followUpItems]);
    const urgencies = useMemo(() => ['All Urgency', ...Array.from(new Set(followUpItems.map(i => i.status)))], [followUpItems]);

    const filteredItems = useMemo(() => {
        return followUpItems.filter(item => {
            const lower = searchTerm.toLowerCase();
            const matchesSearch =
                (item.firmName || '').toLowerCase().includes(lower) ||
                (item.contactName || '').toLowerCase().includes(lower) ||
                (item.location || '').toLowerCase().includes(lower);

            const matchesLocation = locationFilter === 'All Cities' || item.location === locationFilter;
            const matchesUrgency = urgencyFilter === 'All Urgency' || item.status === urgencyFilter;

            return matchesSearch && matchesLocation && matchesUrgency;
        });
    }, [searchTerm, locationFilter, urgencyFilter, followUpItems]);

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredItems.map(item => item.id)));
        }
    };

    const toggleSelectItem = (id) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkWhatsApp = () => {
        const count = selectedIds.size;
        alert(`Initiating bulk WhatsApp reminders to ${count} contacts...`);
        setSelectedIds(new Set());
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Overdue': return { bg: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-100 text-red-700', stripe: 'bg-red-500' };
            case 'Critical': return { bg: 'bg-orange-50', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700', stripe: 'bg-orange-500' };
            case 'Upcoming': return { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', stripe: 'bg-amber-400' };
            default: return { bg: 'bg-gray-50', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-700', stripe: 'bg-gray-400' };
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'CYLINDER': return 'bg-blue-100 text-blue-700';
            case 'NOC': return 'bg-purple-100 text-purple-700';
            case 'AMC': return 'bg-emerald-100 text-emerald-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col relative">
            {/* Header Section */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-sm bg-red-100 flex items-center justify-center">
                        <div className="w-2 h-2 bg-red-500 rounded-sm transform rotate-45"></div>
                    </div>
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Urgency Ledger</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Manager Follow-up Console</h1>
                <p className="text-gray-500 text-sm">Prioritize critical renewals across your client base.</p>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 bg-white rounded-xl border border-gray-200 px-4 py-2.5 flex items-center gap-3">
                    <Search className="text-gray-400 flex-shrink-0" size={16} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search Firm, Contact or Location..."
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"
                    />
                </div>

                {/* Location Dropdown */}
                <div className="flex-shrink-0 min-w-[160px]">
                    <CustomDropdown
                        value={locationFilter}
                        onChange={setLocationFilter}
                        options={locations}
                        icon={MapPin}
                        className="text-xs font-semibold uppercase tracking-wide"
                    />
                </div>

                {/* Urgency Dropdown */}
                <div className="flex-shrink-0 min-w-[160px]">
                    <CustomDropdown
                        value={urgencyFilter}
                        onChange={setUrgencyFilter}
                        options={urgencies}
                        icon={Filter}
                        className="text-xs font-semibold uppercase tracking-wide"
                    />
                </div>
            </div>

            <div className="flex flex-1 min-h-0">
                {/* Main List Area */}
                <div className="flex-1 overflow-y-auto pr-2">
                    {/* List Controls */}
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center flex-wrap gap-4">
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                            >
                                {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                                    <CheckSquare size={16} className="text-red-500" />
                                ) : (
                                    <Square size={16} />
                                )}
                                {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? 'Deselect All' : 'Select All Visible'}
                            </button>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-4 border-l border-gray-200">
                                Target Queue ({filteredItems.length})
                            </span>

                            {selectedIds.size > 0 && (
                                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                                    <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
                                        {selectedIds.size} Selected
                                    </span>
                                    <button
                                        onClick={handleBulkWhatsApp}
                                        className="bg-[#22c55e] hover:bg-[#16a34a] text-white px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-[10px] tracking-wide shadow-sm transition-all"
                                    >
                                        <MessageCircle size={12} fill="white" />
                                        Bulk WhatsApp
                                    </button>
                                    <button
                                        onClick={() => setSelectedIds(new Set())}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                        title="Clear Selection"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block">
                            Earliest First
                        </span>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center py-16 text-gray-400">
                            <Loader2 size={32} className="mx-auto mb-3 animate-spin" />
                            <p className="font-medium">Loading follow-up items...</p>
                        </div>
                    )}

                    {/* List Items */}
                    {!loading && (
                        <div className="space-y-3 pb-20">
                            {filteredItems.map((item) => {
                                const statusColor = getStatusColor(item.status);
                                return (
                                    <div
                                        key={item.id}
                                        className={`bg-white p-5 rounded-2xl border transition-all group relative overflow-hidden ${selectedIds.has(item.id) ? 'border-red-200 shadow-md bg-red-50/10' : 'border-gray-100 shadow-sm hover:shadow-md'}`}
                                    >
                                        {/* Status Stripe */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor.stripe}`}></div>

                                        <div className="flex items-start gap-4">
                                            <button
                                                onClick={() => toggleSelectItem(item.id)}
                                                className={`mt-2 transition-colors flex-shrink-0 ${selectedIds.has(item.id) ? 'text-red-500' : 'text-gray-200 hover:text-gray-400'}`}
                                            >
                                                {selectedIds.has(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>

                                            <div className={`w-10 h-10 rounded-full ${statusColor.stripe} text-white flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0`}>
                                                {item.initial}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1 gap-2">
                                                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                        <h3 className="text-base font-bold text-gray-900 truncate">{item.firmName}</h3>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusColor.badge}`}>
                                                            {item.status}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getTypeColor(item.type)}`}>
                                                            {item.type}
                                                        </span>
                                                    </div>
                                                    <button
                                                        className="bg-[#22c55e] hover:bg-[#16a34a] text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold text-[11px] tracking-wide shadow-sm transition-all active:scale-95 flex-shrink-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (item.phone) {
                                                                window.open(`https://wa.me/91${item.phone}`, '_blank');
                                                            } else {
                                                                alert(`No phone number for ${item.contactName}`);
                                                            }
                                                        }}
                                                    >
                                                        <MessageCircle size={14} fill="white" />
                                                        WhatsApp
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3 flex-wrap">
                                                    {item.contactName && <span>{item.contactName}</span>}
                                                    {item.contactName && item.location && <span className="w-1 h-1 rounded-full bg-gray-300"></span>}
                                                    {item.location && <span>{item.location}</span>}
                                                    {item.phone && (
                                                        <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-[10px]">
                                                            {item.phone}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className={`${statusColor.bg} rounded-xl p-3 border border-opacity-50 flex items-center justify-between max-w-sm`}>
                                                    <div>
                                                        <div className={`flex items-center gap-1.5 ${statusColor.text}`}>
                                                            {item.daysLate < 0 ? (
                                                                <span className="text-sm font-bold">{Math.abs(item.daysLate)} Days Overdue</span>
                                                            ) : item.daysLate === 0 ? (
                                                                <span className="text-sm font-bold">Expires Today</span>
                                                            ) : (
                                                                <span className="text-sm font-bold">{item.daysLate} Days Left</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-medium text-gray-400 mt-0.5 block">
                                                            EXPIRES: {item.targetDate}
                                                        </span>
                                                    </div>
                                                    {item.status === 'Overdue' ? (
                                                        <AlertCircle className={statusColor.text} size={18} />
                                                    ) : (
                                                        <Clock className={statusColor.text} size={18} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {!loading && filteredItems.length === 0 && (
                                <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                    <Search size={28} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-medium text-sm">
                                        {followUpItems.length === 0
                                            ? 'No items expiring in the next 30 days.'
                                            : 'No items found matching your filters.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Removed Bulk Actions Floating Bar */}
        </div>
    );
};

export default ManagerConsole;
