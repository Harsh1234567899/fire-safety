import React, { useState, useMemo, useRef } from 'react';
import { BarChart3, Download, FileText, Search, Calendar, Box, ExternalLink, X, RefreshCw, ShieldCheck, AlertCircle, Filter } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchClients } from '../store/slices/clientSlice';
import apiClient from '../api/api';
import CustomDropdown from './CustomDropdown.jsx';
import ServiceDetailsModal from './ServiceDetailsModal.jsx';

const ReportsScreen = () => {
    const dispatch = useDispatch();
    const { items: clients, loading, pagination } = useSelector(state => state.clients);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageLimit, setPageLimit] = useState(25);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Auto-refresh clients when screen mounts or pagination changes
    React.useEffect(() => {
        dispatch(fetchClients({ query: searchTerm, page: currentPage, limit: pageLimit }));
    }, [dispatch, currentPage, pageLimit]);

    // Handle initial search trigger (debounce)
    React.useEffect(() => {
        setCurrentPage(1);
        const delayDebounceFn = setTimeout(() => {
            dispatch(fetchClients({ query: searchTerm, page: 1, limit: pageLimit }));
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, dispatch, pageLimit]);

    // Transform clients data into flat report items
    const reportItems = useMemo(() => {
        if (!clients || !Array.isArray(clients)) return [];
        const items = [];
        clients.forEach(client => {
            if (!client) return;
            const firmName = client.firmName || 'Unknown Firm';
            const contactName = client.contactPerson || client.firmName || 'Unknown Contact';
            const city = client.city || 'Unknown';

            // Add Cylinders
            const cylinders = client.ledger?.filter(item => item && item.type === 'CYLINDERS') || [];
            cylinders.forEach(cyl => {
                if (!cyl) return;
                const assetName = cyl.category ? (typeof cyl.category === 'object' ? cyl.category.name : cyl.category) : 'Unknown Cylinder';
                items.push({
                    id: cyl._id || cyl.id || `${client.id}-cyl-${Math.random()}`,
                    firmName,
                    contactName,
                    assetType: 'Cylinder',
                    assetName: assetName || 'Unknown Cylinder',
                    location: city,
                    quantity: cyl.serialNumbers?.length || 1,
                    renewalDate: cyl.expiryDate ? new Date(cyl.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
                    status: cyl.status || 'UNKNOWN',
                    rawDate: new Date(cyl.expiryDate || 0)
                });
            });

            // Add NOCs
            const nocs = client.ledger?.filter(item => item && item.type === 'NOC') || [];
            nocs.forEach(noc => {
                if (!noc) return;
                const assetName = noc.category ? (typeof noc.category === 'object' ? noc.category.name : noc.category) : 'Fire NOC';
                items.push({
                    id: noc._id || noc.id || `${client.id}-noc-${Math.random()}`,
                    firmName,
                    contactName,
                    assetType: 'NOC',
                    assetName: assetName || 'Fire NOC',
                    location: city,
                    quantity: 1,
                    renewalDate: noc.expiryDate ? new Date(noc.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
                    status: noc.status || 'UNKNOWN',
                    rawDate: new Date(noc.expiryDate || 0)
                });
            });

            // Add AMCs
            const amcs = client.ledger?.filter(item => item && item.type === 'AMC') || [];
            amcs.forEach(amc => {
                if (!amc) return;
                const assetName = amc.category ? (typeof amc.category === 'object' ? amc.category.name : amc.category) : 'AMC Contract';
                items.push({
                    id: amc._id || amc.id || `${client.id}-amc-${Math.random()}`,
                    firmName,
                    contactName,
                    assetType: 'AMC',
                    assetName: assetName || 'AMC Contract',
                    location: city,
                    quantity: 1,
                    renewalDate: amc.expiryDate ? new Date(amc.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
                    status: amc.status || 'UNKNOWN',
                    rawDate: new Date(amc.expiryDate || 0)
                });
            });
        });
        return items.sort((a, b) => a.rawDate - b.rawDate);
    }, [clients]);

    const items = reportItems; // Alias for existing code compatibility

    const [complianceFilter, setComplianceFilter] = useState('All Compliance');
    const [serviceFilter, setServiceFilter] = useState('All Services');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [dateRange, setDateRange] = useState({ from: null, to: null });
    const [dateError, setDateError] = useState('');
    const startDateRef = useRef(null);
    const endDateRef = useRef(null);

    // Modal State
    const [selectedServiceId, setSelectedServiceId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleViewDetails = (item) => {
        setSelectedServiceId(item.id);
        setIsModalOpen(true);
    };

    // Date Validation Effect
    React.useEffect(() => {
        const isValidYear = (date) => {
            if (!date) return true;
            const year = date.getFullYear();
            return year >= 1900 && year <= 2100;
        };

        if (dateRange.from && dateRange.to && dateRange.from > dateRange.to) {
            setDateError('Start Date cannot be after End Date');
        } else if ((dateRange.from && !isValidYear(dateRange.from)) || (dateRange.to && !isValidYear(dateRange.to))) {
            setDateError('Year must be between 1900 and 2100');
        } else {
            setDateError('');
        }
    }, [dateRange]);

    // Derive unique values
    const uniqueCompliance = useMemo(() => ['All Compliance', ...Array.from(new Set(items.map(i => i.status)))], [items]);

    const uniqueServices = useMemo(() => {
        const types = new Set(items.map(i => i.assetType));
        return ['All Services', ...Array.from(types)];
    }, [items]);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            // Search
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                (item.firmName && item.firmName.toLowerCase().includes(searchLower)) ||
                (item.contactName && item.contactName.toLowerCase().includes(searchLower)) ||
                (item.assetName && item.assetName.toLowerCase().includes(searchLower));

            // Filters
            const matchesCompliance = complianceFilter === 'All Compliance' || item.status === complianceFilter;

            // Mapping Service Type for clearer filtering
            const matchesService = serviceFilter === 'All Services' || item.assetType === serviceFilter;


            return matchesSearch && matchesCompliance && matchesService;
        });
    }, [items, searchTerm, complianceFilter, serviceFilter]);

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

    const handleExcelExport = async () => {
        try {
            let endpoint = '/v11/fire-extinguisher/download-report'; // Default to Cylinders
            if (serviceFilter === 'NOC') endpoint = '/v9/fire-noc/download';
            if (serviceFilter === 'AMC') endpoint = '/v4/amc/download';

            const payload = {};
            if (searchTerm) payload.firmName = searchTerm;
            if (complianceFilter !== 'All Compliance') payload.status = complianceFilter.toLowerCase();
            if (selectedIds.size > 0) {
                payload.ids = Array.from(selectedIds);
            }
            // Include date filters
            if (dateRange?.from) payload.startDate = dateRange.from.toISOString().split('T')[0];
            if (dateRange?.to) payload.endDate = dateRange.to.toISOString().split('T')[0];

            // Include service type/category specific filters if needed (though UI handles service filter via endpoint selection)
            // If the user selects "Cylinders" but has a specific sub-category filter in UI (not currently visible in code snippets but beneficial to add if valid)

            const response = await apiClient.post(endpoint, payload, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            const fileName = `Report_${serviceFilter.replace(/\s+/g, '_')}_${date}.xlsx`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed", error);
            alert("Failed to export Excel file. Please try again.");
        }
    };



    const clearFilters = () => {
        setComplianceFilter('All Compliance');
        setServiceFilter('All Services');
        setSearchTerm('');
        setDateRange({ from: null, to: null });
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col relative">
            {/* Header Section */}
            <div className="mb-8 flex justify-between items-start gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 size={14} className="text-red-500" />
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Reports & Analytics</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Client Service Ledger</h1>
                    <p className="text-gray-500 text-sm">Granular service-level reporting and compliance tracking.</p>
                </div>
                {/* Mobile & Tablet Toggle */}
                <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="lg:hidden flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-xs text-gray-700 shadow-sm hover:bg-gray-50 shrink-0"
                >
                    <Filter size={16} className={showMobileFilters ? "text-red-500" : "text-gray-400"} />
                    <span className="hidden sm:inline">{showMobileFilters ? "Close Filters" : "Filters & Actions"}</span>
                </button>
            </div>

            {/* Persistent Mobile Search Bar */}
            <div className="mb-4 lg:hidden">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex items-center transition-all focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10 hover:border-red-500/50">
                    <Search className="shrink-0 ml-3 text-gray-300 transition-colors pointer-events-none group-focus-within:text-red-500" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Filter by Firm, Contact, or Service Name..."
                        className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-medium text-gray-700 placeholder:text-gray-300 h-10 w-full"
                    />
                </div>
            </div>

            {/* Collapsible Filters & Actions */}
            <div className={`flex-col gap-6 mb-8 ${showMobileFilters ? 'flex' : 'hidden lg:flex'}`}>
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between w-full">
                    <div className="flex flex-col gap-1 w-full md:w-auto">
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <div className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm flex flex-col justify-center min-w-[140px] relative">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Start Date</label>
                                <input
                                    ref={startDateRef}
                                    type="date"
                                    min="1900-01-01"
                                    max="2100-12-31"
                                    className="text-xs font-medium text-gray-700 border-none focus:ring-0 bg-transparent p-0 w-full outline-none cursor-pointer relative z-10"
                                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : null }))}
                                />
                                <Calendar
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 cursor-pointer hover:text-blue-500 transition-colors z-20"
                                    size={14}
                                    onClick={() => startDateRef.current?.showPicker()}
                                />
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm flex flex-col justify-center min-w-[140px] relative">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">End Date</label>
                                <input
                                    ref={endDateRef}
                                    type="date"
                                    min="1900-01-01"
                                    max="2100-12-31"
                                    className="text-xs font-medium text-gray-700 border-none focus:ring-0 bg-transparent p-0 w-full outline-none cursor-pointer relative z-10"
                                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : null }))}
                                />
                                <Calendar
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 cursor-pointer hover:text-blue-500 transition-colors z-20"
                                    size={14}
                                    onClick={() => endDateRef.current?.showPicker()}
                                />
                            </div>
                        </div>
                        {dateError && (
                            <span className="text-[10px] text-red-500 font-bold px-1 animate-pulse">
                                {dateError}
                            </span>
                        )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                        <button
                            onClick={() => dispatch(fetchClients(''))}
                            className="flex items-center justify-center gap-2 border px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm whitespace-nowrap bg-white border-gray-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 text-gray-700 flex-1 sm:flex-none"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : "text-gray-400"} />
                            Refresh
                        </button>
                        <button
                            onClick={handleExcelExport}
                            disabled={!!dateError}
                            className={`flex items-center justify-center gap-2 border px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm whitespace-nowrap flex-1 sm:flex-none ${dateError ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'}`}
                        >
                            <Download size={16} className={dateError ? "text-gray-400" : "text-blue-600"} />
                            Export Excel
                        </button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="hidden lg:flex flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 items-center transition-all focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10 hover:border-red-500/50">
                        <Search className="shrink-0 ml-3 text-gray-300 transition-colors pointer-events-none group-focus-within:text-red-500" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Filter by Firm, Contact, or Service Name..."
                            className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-medium text-gray-700 placeholder:text-gray-300 h-10 w-full"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="w-full sm:w-auto sm:min-w-[170px]">
                                <CustomDropdown
                                    value={complianceFilter}
                                    onChange={setComplianceFilter}
                                    options={['All Compliance', 'Active', 'Expiring Soon', 'Expired']}
                                    className="text-xs font-bold uppercase tracking-wider"
                                />
                            </div>

                            <div className="w-full sm:w-auto sm:min-w-[170px]">
                                <CustomDropdown
                                    value={serviceFilter}
                                    onChange={setServiceFilter}
                                    options={['All Services', 'Cylinders', 'NOC', 'AMC']}
                                    className="text-xs font-bold uppercase tracking-wider"
                                />
                            </div>
                        </div>

                        <button
                            onClick={clearFilters}
                            className="hidden sm:flex bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl w-12 items-center justify-center transition-colors"
                            title="Clear Filters"
                        >
                            <X size={18} />
                        </button>
                        {/* Mobile Clear Button */}
                        <button
                            onClick={clearFilters}
                            className="sm:hidden flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl py-3 font-bold text-xs uppercase"
                        >
                            <X size={14} /> Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col mb-12 overflow-visible">
                <div className="overflow-x-auto">
                    {/* Table Header */}
                    <div className="min-w-[1000px] grid grid-cols-[40px_repeat(11,minmax(0,1fr))] px-8 py-6 border-b border-gray-100 bg-gray-50/30 items-center">
                        <div className="col-span-1">
                            <input
                                type="checkbox"
                                checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                        </div>
                        <div className="col-span-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Corporate Identity</div>
                        <div className="col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Asset / Service</div>
                        <div className="col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</div>
                        <div className="col-span-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Qty</div>
                        <div className="col-span-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Renewal Date</div>
                        <div className="col-span-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Risk Profile</div>
                        <div className="col-span-1 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</div>
                    </div>

                    {/* Table Body */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className={`min-w-[1000px] grid grid-cols-[40px_repeat(11,minmax(0,1fr))] px-8 py-6 items-center transition-colors group ${selectedIds.has(item.id) ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}`}
                            >
                                {/* Checkbox */}
                                <div className="col-span-1">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(item.id)}
                                        onChange={() => toggleSelectItem(item.id)}
                                        className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                    />
                                </div>

                                {/* Identity */}
                                <div className="col-span-3">
                                    <h4 className="text-sm font-bold text-gray-900 mb-0.5">{item.firmName}</h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.contactName}</p>
                                </div>

                                {/* Asset/Service */}
                                <div className="col-span-2 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.assetType === 'NOC' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                                        {item.assetType === 'NOC' ? <FileText size={16} /> : <Box size={16} />}
                                    </div>
                                    <span className="text-xs font-bold text-gray-700 truncate">{item.assetName}</span>
                                </div>

                                {/* Location */}
                                <div className="col-span-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{item.location}</span>
                                </div>

                                {/* Quantity */}
                                <div className="col-span-1">
                                    <span className="text-xs font-bold text-gray-900">{item.quantity || '-'}</span>
                                </div>

                                {/* Renewal Date */}
                                <div className="col-span-1 flex items-center gap-2">
                                    <Calendar size={14} className="text-gray-300" />
                                    <span className="text-xs font-bold text-gray-600 tabular-nums">{item.renewalDate}</span>
                                </div>

                                {/* Status */}
                                <div className="col-span-1">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${item.status === 'ACTIVE'
                                        ? 'bg-green-50 text-green-600 border-green-100'
                                        : 'bg-red-50 text-red-600 border-red-100'
                                        }`}>
                                        {item.status === 'ACTIVE' ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
                                        {item.status}
                                    </span>
                                </div>

                                {/* Action */}
                                <div className="col-span-1 text-right">
                                    <button
                                        onClick={() => handleViewDetails(item)}
                                        className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {filteredItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <Search size={48} className="mb-4 opacity-20" />
                                <p>No records found matching your filters.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination Controls */}
                <div className="border-t border-gray-100 bg-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                        <span>
                            Showing {((pagination?.currentPage || 1) - 1) * (pagination?.limit || 25) + 1} to {Math.min((pagination?.currentPage || 1) * (pagination?.limit || 25), pagination?.totalItems || 0)} of {pagination?.totalItems || 0}
                        </span>
                        <div className="flex items-center gap-2">
                            <span>Rows per page:</span>
                            <select
                                value={pageLimit}
                                onChange={(e) => {
                                    setPageLimit(Number(e.target.value));
                                }}
                                className="bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-2 py-1 outline-none focus:border-red-500 cursor-pointer"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-widest"
                        >
                            Previous
                        </button>
                        <span className="flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                            {currentPage} / {pagination?.totalPages || 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(pagination?.totalPages || 1, prev + 1))}
                            disabled={currentPage >= (pagination?.totalPages || 1)}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-widest"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <ServiceDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                serviceId={selectedServiceId}
            />
        </div>
    );
};

// Helper Icons locally scoped
const ShieldCheckIcon = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
);

const AlertCircleIcon = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
);

export default ReportsScreen;
