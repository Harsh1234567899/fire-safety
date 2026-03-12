
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    AlertCircle, FileText, Search, Plus, Trash2, Edit2, ArrowLeft,
    CheckCircle2, Download, CreditCard, Save, Info, Calendar, Filter,
    FileSpreadsheet, RefreshCw, Upload, Check, X, ShieldCheck, MapPin,
    Mail, Phone, Loader2, Copy, Printer, Eye, Package
} from 'lucide-react';
import CertificateTemplate from './CertificateTemplate';
import { createRoot } from 'react-dom/client';
import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import ServiceDetailsModal from './ServiceDetailsModal.jsx';

import { fetchClients, importClientsLocal, deleteClientLocal, updateClient } from '../store/slices/clientSlice';
import { downloadClientDirectory, getAllClients, deleteClient } from '../services/client.js';
import { deleteAmc } from '../services/amc.js';
import { deleteAmcVisit } from '../services/amcVisit.js';
import { deleteFireNoc } from '../services/fireNoc.js';
import { deleteCylinder as deleteGasCylinder } from '../services/fireExtinguisher.js';
import { deleteClientProducts } from '../services/clientProduct.js';
import { dataCache } from '../utils/dataCache';

const ClientsScreen = ({ onRegisterNew, onImportClients }) => {
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const { items: clients = [], loading, pagination } = useSelector(state => state.clients); // Ensure default empty array
    const { user } = useSelector(state => state.auth);
    const userRole = user?.role;
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLedgerIds, setSelectedLedgerIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageLimit, setPageLimit] = useState(25);

    // Columns Definition
    const allColumns = [
        { key: 'index', label: 'Index', sortable: false },
        { key: 'firmName', label: 'Firm Name', sortable: true },
        { key: 'contactNumber', label: 'Phone Number', sortable: true },
        { key: 'email', label: 'Email Address', sortable: true },
        { key: 'gstNumber', label: 'GST Number', sortable: true },
        { key: 'city', label: 'City', sortable: true },
        { key: 'createdAt', label: 'Client Create Date', sortable: true },
        { key: 'view', label: 'View', sortable: false }
    ];

    // Table State
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
    const [visibleColumns, setVisibleColumns] = useState(['index', 'firmName', 'contactNumber', 'email', 'gstNumber', 'city', 'createdAt', 'view']);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const columnMenuRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Edit State
    const [selectedClient, setSelectedClient] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        firmName: '',
        gstNumber: '',
        contactPerson: '',
        contactNumber: '',
        email: '',
        address: '',
        city: '',
        pincode: ''
    });

    // Modal State
    const [selectedServiceId, setSelectedServiceId] = useState(null);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [viewLoadingId, setViewLoadingId] = useState(null);

    const handleViewClient = async (client) => {
        try {
            setViewLoadingId(client._id || client.id);
            const res = await getAllClients({ clientId: client._id || client.id });
            if (res.data?.success && res.data?.data?.length > 0) {
                setSelectedClient(res.data.data[0]);
            } else {
                toast.error('Could not fetch client details.');
            }
        } catch (e) {
            console.error(e);
            toast.error('Failed to load client data.');
        } finally {
            setViewLoadingId(null);
        }
    };

    const handleViewServiceDetails = (serviceId) => {
        setSelectedServiceId(serviceId);
        setIsServiceModalOpen(true);
    };

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Auto-refresh clients when screen mounts - use dataCache to prevent redundant calls
    useEffect(() => {
        if (dataCache.has('clients_fetched')) {
            return; // Already fetched this session
        }
        if (clients.length > 0) {
            dataCache.set('clients_fetched', true);
            return; // Data already loaded from App.jsx
        }
        dataCache.set('clients_fetched', true);
        dispatch(fetchClients({ query: searchTerm, page: currentPage, limit: pageLimit }));
    }, [dispatch, currentPage, pageLimit]);

    // Check for auto-open client profile directives from router state
    useEffect(() => {
        if (location.state?.selectedClient) {
            handleViewClient(location.state.selectedClient);
            // Replace state to avoid re-opening modal on refresh
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    // Handle search debounce - skip initial mount using dataCache
    useEffect(() => {
        if (!dataCache.has('clients_search_active')) {
            dataCache.set('clients_search_active', true);
            return; // Skip the initial mount, data already loaded
        }
        setCurrentPage(1);
        const delayDebounceFn = setTimeout(() => {
            dispatch(fetchClients({ query: searchTerm, page: 1, limit: pageLimit }));
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, dispatch, pageLimit]);

    // Close column menu on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
                setShowColumnMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleColumn = (key) => {
        if (visibleColumns.includes(key)) {
            if (visibleColumns.length > 1) { // Prevent hiding all columns
                setVisibleColumns(visibleColumns.filter(c => c !== key));
            }
        } else {
            // Maintain order based on allColumns definition
            const newVisible = [...visibleColumns, key];
            const sortedVisible = allColumns
                .filter(col => newVisible.includes(col.key))
                .map(col => col.key);
            setVisibleColumns(sortedVisible);
        }
    };

    const processedClients = useMemo(() => {
        // 1. Filter
        let filtered = clients.filter(item => {
            const matchesSearch =
                (item.firmName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.contactNumber || '').includes(searchTerm) ||
                (item.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.gstNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });

        // 2. Sort
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = a[sortConfig.key] || '';
                let bValue = b[sortConfig.key] || '';

                // Handle Date sorting specifically
                if (sortConfig.key === 'createdAt') {
                    aValue = new Date(a.createdAt || 0).getTime();
                    bValue = new Date(b.createdAt || 0).getTime();
                }
                else {
                    aValue = String(aValue).toLowerCase();
                    bValue = String(bValue).toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [clients, searchTerm, sortConfig]);

    const RenderSortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <span className="text-gray-300 ml-1">⇅</span>;
        return sortConfig.direction === 'asc' ? <span className="text-red-500 ml-1">↑</span> : <span className="text-red-500 ml-1">↓</span>;
    };

    const handleCopy = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            toast.success(`${label} copied!`, { icon: '📋' });
        });
    };

    const handleDeleteClient = (e, id) => {
        e.stopPropagation();

        toast((t) => (
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Trash2 className="text-orange-500" size={18} />
                    <span className="font-bold text-sm">Hide client</span>
                </div>
                <p className="text-xs text-gray-600">Are you sure you want to remove this client from your local view? (This won't delete data from server)</p>
                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors uppercase tracking-widest">Cancel</button>
                    <button 
                        onClick={() => {
                            toast.dismiss(t.id);
                            dispatch(deleteClientLocal(id));
                            toast.success("Client removed from local view.");
                        }}
                        className="px-3 py-1 text-xs font-bold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors uppercase tracking-widest shadow-md"
                    >
                        Hide
                    </button>
                </div>
            </div>
        ), { duration: 5000, style: { borderRadius: '15px', padding: '12px', border: '1px solid #ffedd5' } });
    };

    const handleDeleteClientPermanent = async () => {
        if (!selectedClient) return;

        toast((t) => (
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <AlertCircle className="text-red-500" size={20} />
                    <span className="font-bold text-sm">Permanent Deletion</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                    Are you sure you want to permanently delete <strong>{selectedClient.firmName}</strong>? 
                    This will remove all associated records. This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-2 mt-2">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                setIsSaving(true);
                                await deleteClient(selectedClient._id);
                                toast.success("Client and all data deleted successfully!");
                                dispatch(deleteClientLocal(selectedClient._id));
                                setSelectedClient(null);
                                setSelectedLedgerIds([]);
                            } catch (error) {
                                console.error(error);
                                toast.error(error.response?.data?.message || "Failed to delete client permanently");
                            } finally {
                                setIsSaving(false);
                            }
                        }}
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-red-600 text-white rounded-lg shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all"
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        ), {
            duration: 6000,
            position: 'top-center',
            style: {
                borderRadius: '20px',
                background: '#fff',
                color: '#333',
                padding: '16px',
                border: '1px solid #fee2e2',
                maxWidth: '400px',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
            }
        });
    };

    const handleDeleteLedgerItem = async (e, item) => {
        e.stopPropagation();
        
        toast((t) => (
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Trash2 className="text-red-500" size={18} />
                    <span className="font-bold text-sm">Delete {item.type} Record</span>
                </div>
                <p className="text-xs text-gray-600">Are you sure you want to delete this {item.type.toLowerCase()} record?</p>
                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors uppercase tracking-widest">Cancel</button>
                    <button 
                        onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                const id = item._id || item.id;
                                if (item.type === 'CYLINDERS') await deleteGasCylinder(id);
                                else if (item.type === 'NOC') await deleteFireNoc(id);
                                else if (item.type === 'AMC') await deleteAmc(id);
                                else if (item.type === 'AMC_VISIT') await deleteAmcVisit(id);
                                else if (item.type === 'PRODUCTS') await deleteClientProducts(selectedClient._id);

                                toast.success(`${item.type} record deleted successfully`);
                                handleViewClient(selectedClient);
                            } catch (error) {
                                console.error(error);
                                toast.error(error.response?.data?.message || "Failed to delete record");
                            }
                        }}
                        className="px-3 py-1 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors uppercase tracking-widest shadow-md"
                    >
                        Delete
                    </button>
                </div>
            </div>
        ), { duration: 5000, style: { borderRadius: '15px', padding: '12px', border: '1px solid #fee2e2' } });
    };

    const handleEditClient = (e, client) => {
        e.stopPropagation();
        setSelectedClient(client);
        setEditForm({
            ...client,
            contactNumber: client.contactNumber || client.phone || ''
        });
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (selectedClient) {
            setIsSaving(true);
            try {
                // Calculate changed fields only
                const changes = {};
                Object.keys(editForm).forEach(key => {
                    if (editForm[key] !== selectedClient[key]) {
                        changes[key] = editForm[key];
                    }
                });

                // Explicitly handle contactNumber / phone mapping consistency
                // If contactNumber was edited, ensure it's sent.
                // The editForm uses 'contactNumber' for the input.
                if (editForm.contactNumber !== (selectedClient.contactNumber || selectedClient.phone)) {
                    changes.contactNumber = editForm.contactNumber;
                }

                // If no changes, returns early
                if (Object.keys(changes).length === 0) {
                    setIsEditing(false);
                    setIsSaving(false);
                    return;
                }

                const updatedClient = await dispatch(updateClient({ id: selectedClient._id, data: changes })).unwrap();

                // IMPORTANT: Backend update returns raw client doc (no ledger/services).
                // We must preserve existing ledger/services from the selectedClient state.
                const preservedClient = {
                    ...selectedClient,
                    ...updatedClient,
                    ledger: selectedClient.ledger || [],
                    services: selectedClient.services || []
                };

                setSelectedClient(preservedClient);
                setIsEditing(false);
            } catch (error) {
                console.error("Failed to update client:", error);
                alert("Failed to save changes. Please try again.");
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleCsvImport = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

            const newClients = [];
            let failCount = 0;

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;

                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });

                if (row.firmname || row['firm name']) {
                    const firmName = row.firmname || row['firm name'];
                    const servicesRaw = row.services || '';
                    const services = servicesRaw.split('|').map((s) => s.trim().toUpperCase());

                    newClients.push({
                        id: `imp-${Date.now()}-${i}`,
                        firmName: firmName,
                        contactPerson: row.contactname || row['contact name'] || 'Unknown',
                        email: row.email || '',
                        phone: row.phone || row.mobile || '',
                        gstNumber: row.gstnumber || row.gst || '',
                        address: row.address || '',
                        city: row.city || '',
                        pincode: row.pincode || '',
                        services: services.filter(s => ['CYLINDERS', 'NOC', 'AMC'].includes(s)),
                        status: 'SECURE',
                        statusType: 'SECURE',
                        initial: firmName.charAt(0).toUpperCase(),
                        ledger: [] // Batch import creates records; ledger added via renewal/edit
                    });
                } else {
                    failCount++;
                }
            }

            if (newClients.length > 0) {
                if (onImportClients) onImportClients(newClients); // Keep prop callback if App uses it, or just dispatch
                dispatch(importClientsLocal(newClients));
                setImportResults({ success: newClients.length, failed: failCount });
            } else {
                alert("No valid client data found in CSV. Please check the template format.");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleExportDirectory = async () => {
        try {
            setIsDownloading(true); // You might need to add this state if not exists, but it seems it exists based on previous code snippets
            const response = await downloadClientDirectory({ q: searchTerm });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `Client_Directory_${date}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed", error);
            alert("Failed to export directory. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };


    const handleViewAllClientPDF = async (client) => {
        if (isDownloading) return;
        // Use selected ledger items if checkboxes are ticked, otherwise use all.
        let itemsToExport = client.ledger || [];
        if (selectedLedgerIds.length > 0) {
            itemsToExport = itemsToExport.filter(item => selectedLedgerIds.includes(item._id || item.id));
        }

        const ledgerItems = itemsToExport.map(item => ({
            ...item,
            // normalise fields the CertificateTemplate expects
            type: item.type || 'CYLINDERS',
            category: item.category || item.type || '',
            serialNumbers: item.serialNumbers || item.generatedSerials || [],
            startDate: item.startDate || '',
            expiryDate: item.expiryDate || item.renewalDate || item.expiry || '',
        })).sort((a, b) => {
            const dateA = new Date(a.createdAt || a.startDate || 0);
            const dateB = new Date(b.createdAt || b.startDate || 0);
            return dateA - dateB; // Oldest first
        });
        if (ledgerItems.length === 0) {
            toast.error('No ledger items to generate certificate for.');
            return;
        }
        setIsDownloading('ALL');
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        document.body.appendChild(container);
        const root = createRoot(container);
        root.render(<CertificateTemplate client={client} ledgerItems={ledgerItems} />);
        setTimeout(async () => {
            const element = container.querySelector('#certificate-print-area');
            if (element) {
                const worker = html2pdf().set({
                    margin: [5, 0, 5, 0], // Top/Bottom margins for auto page-breaks
                    filename: `Certificate_${client.firmName.replace(/\s+/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['css', 'legacy'] }
                }).from(element);
                const pdfBlob = await worker.output('bloburl');
                window.open(pdfBlob, '_blank');
            }
            document.body.removeChild(container);
            setIsDownloading(null);
        }, 1200);
    };

    if (selectedClient && isEditing) {
        return (
            <div className="animate-in fade-in zoom-in-95 duration-300 h-full flex flex-col">
                <div className="mb-8 flex items-center gap-4">
                    <button onClick={() => setIsEditing(false)} className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"><ArrowLeft size={20} /></button>
                    <h2 className="text-2xl font-bold">Edit Profile</h2>
                </div>
                <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-gray-100 flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest">Firm Name</label><input type="text" value={editForm.firmName} onChange={e => setEditForm({ ...editForm, firmName: e.target.value })} className="w-full bg-gray-50 px-4 py-3 rounded-xl border border-transparent focus:bg-white focus:border-red-200 font-bold text-sm outline-none transition-all" /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest">GST Number</label><input type="text" value={editForm.gstNumber} onChange={e => setEditForm({ ...editForm, gstNumber: e.target.value })} className="w-full bg-gray-50 px-4 py-3 rounded-xl border border-transparent focus:bg-white focus:border-red-200 font-bold text-sm outline-none transition-all" /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest">Contact Person</label><input type="text" value={editForm.contactPerson} onChange={e => setEditForm({ ...editForm, contactPerson: e.target.value })} className="w-full bg-gray-50 px-4 py-3 rounded-xl border border-transparent focus:bg-white focus:border-red-200 font-bold text-sm outline-none transition-all" /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest">Mobile</label><input type="text" value={editForm.contactNumber} onChange={e => setEditForm({ ...editForm, contactNumber: e.target.value })} className="w-full bg-gray-50 px-4 py-3 rounded-xl border border-transparent focus:bg-white focus:border-red-200 font-bold text-sm outline-none transition-all" /></div>
                            <div className="md:col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest">Office Address</label><textarea value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full bg-gray-50 px-4 py-3 rounded-xl border border-transparent focus:bg-white focus:border-red-200 font-bold text-sm outline-none h-24 resize-none transition-all" /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest">City</label><input type="text" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} className="w-full bg-gray-50 px-4 py-3 rounded-xl border border-transparent focus:bg-white focus:border-red-200 font-bold text-sm outline-none transition-all" /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest">Pincode</label><input type="text" value={editForm.pincode} onChange={e => setEditForm({ ...editForm, pincode: e.target.value })} className="w-full bg-gray-50 px-4 py-3 rounded-xl border border-transparent focus:bg-white focus:border-red-200 font-bold text-sm outline-none transition-all" /></div>
                        </div>
                        <button
                            onClick={handleSaveEdit}
                            disabled={isSaving}
                            className={`w-full bg-red-600 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-red-500/20 active:scale-[0.99] transition-all tracking-widest uppercase text-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedClient && !isEditing) {
        return (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col">
                <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button onClick={() => { setSelectedClient(null); setSelectedLedgerIds([]); }} className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-900 transition-colors tracking-widest w-fit"><ArrowLeft size={16} />Back to Directory</button>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        <button
                            onClick={() => handleViewAllClientPDF(selectedClient)}
                            disabled={!!isDownloading || !selectedClient.ledger?.length}
                            className={`flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all flex-1 sm:flex-none
                                ${isDownloading === 'ALL'
                                    ? 'bg-gray-100 text-gray-400 cursor-wait'
                                    : !selectedClient.ledger?.length
                                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
                                        : 'bg-[#0f172a] text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20'}`}
                        >
                            <Printer size={14} className={isDownloading === 'ALL' ? 'animate-pulse' : ''} />
                            {isDownloading === 'ALL' ? 'Generating...' : 'View Certificate'}
                        </button>
                        <button onClick={(e) => handleEditClient(e, selectedClient)} className="flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 md:px-5 py-2.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase text-gray-700 hover:border-red-200 hover:bg-red-50 transition-all tracking-widest flex-1 sm:flex-none"><Edit2 size={14} />Edit Profile</button>
                        {(userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'manager') && (
                            <button
                                onClick={handleDeleteClientPermanent}
                                disabled={isSaving}
                                className="flex items-center justify-center gap-2 bg-red-50 border border-red-100 px-4 md:px-5 py-2.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase text-red-600 hover:bg-red-600 hover:text-white transition-all tracking-widest flex-1 sm:flex-none active:scale-95 disabled:opacity-50"
                            >
                                <Trash2 size={14} /> Delete Client
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 md:gap-8 flex-1 min-h-0 overflow-y-auto md:overflow-hidden pb-20 md:pb-0">
                    <div className="w-full md:w-80 flex flex-col gap-6 shrink-0 h-auto md:overflow-y-auto">
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-white text-2xl md:text-3xl font-bold mx-auto mb-4">{selectedClient.initial}</div>
                            <h2 className="text-lg md:text-xl font-bold mb-1">{selectedClient.firmName}</h2>

                            <div className="space-y-3 md:space-y-4 mt-6 md:mt-8 text-left">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl"><CreditCard size={14} className="text-gray-400 shrink-0" /><span className="text-[10px] md:text-xs font-bold text-gray-700">{selectedClient.gstNumber || 'NO GST'}</span></div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl"><Phone size={14} className="text-gray-400 shrink-0" /><span className="text-[10px] md:text-xs font-mono font-bold text-gray-700">{selectedClient.contactPerson} - {selectedClient.phone || selectedClient.contactNumber}</span></div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl"><Mail size={14} className="text-gray-400 shrink-0" /><span className="text-[10px] md:text-xs font-bold text-gray-700 break-all">{selectedClient.email}</span></div>
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl"><MapPin size={14} className="text-gray-400 mt-1 shrink-0" /><span className="text-[10px] md:text-xs font-bold text-gray-700 leading-relaxed">{selectedClient.address || 'Address not set'}, {selectedClient.city || ''} {selectedClient.pincode || ''}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 p-6 md:p-10 h-auto md:overflow-y-auto mb-10 md:mb-0">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold">Active Asset Ledger</h3>
                                {selectedLedgerIds.length > 0 && (
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">
                                        {selectedLedgerIds.length} item{selectedLedgerIds.length === 1 ? '' : 's'} selected for PDF
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-6">
                            {(() => {
                                const sortedLedger = [...(selectedClient.ledger || [])].sort((a, b) => {
                                    const dateA = new Date(a.createdAt || a.startDate || 0);
                                    const dateB = new Date(b.createdAt || b.startDate || 0);
                                    return dateB - dateA; // Newest first
                                });

                                return sortedLedger.length > 0 ? sortedLedger.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleViewServiceDetails(item._id || item.id)}
                                        className={`p-6 bg-gray-50 rounded-3xl border border-transparent transition-all group hover:border-blue-100 hover:bg-blue-50/30 cursor-pointer relative flex items-center gap-4`}
                                    >
                                        <div
                                            className="z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const id = item._id || item.id;
                                                setSelectedLedgerIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                                            }}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${selectedLedgerIds.includes(item._id || item.id) ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 bg-white hover:border-red-400'}`}>
                                                {selectedLedgerIds.includes(item._id || item.id) && <Check size={14} />}
                                            </div>
                                        </div>

                                        <div className="flex-1 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.type === 'CYLINDERS' ? 'bg-orange-50 text-orange-500' :
                                                    item.type === 'NOC' ? 'bg-blue-50 text-blue-500' :
                                                        item.type === 'AMC_VISIT' ? 'bg-indigo-50 text-indigo-500' :
                                                            item.type === 'PRODUCTS' ? 'bg-emerald-50 text-emerald-500' :
                                                                'bg-purple-50 text-purple-500'
                                                    }`}>
                                                    {item.type === 'PRODUCTS' ? <Package size={24} /> : <ShieldCheck size={24} />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold">{item.category || item.type} {item.type !== 'PRODUCTS' ? 'Provision' : ''}</h4>
                                                    {item.type === 'AMC' && item.visits && (
                                                        <p className="text-xs text-gray-500 font-medium mt-0.5">Technician Visits: <span className="text-purple-600 font-bold">{item.visits} per year</span></p>
                                                    )}
                                                    {item.type === 'PRODUCTS' && (
                                                        <p className="text-xs text-gray-500 font-medium mt-0.5"><span className="text-emerald-600 font-bold">Qty: {item.quantity || 1} • {item.notes || 'Product Record'}</span></p>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => handleDeleteLedgerItem(e, item)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                title="Delete Record"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-20 text-center text-gray-300 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-gray-50 rounded-3xl">No historical provisions mapped</div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                <ServiceDetailsModal
                    isOpen={isServiceModalOpen}
                    onClose={() => setIsServiceModalOpen(false)}
                    serviceId={selectedServiceId}
                />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-full flex flex-col">
            <div className="mb-6 flex justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Firm Directory</h1>
                    <p className="text-gray-500 italic text-sm">Centralized registry of all corporate safety partners.</p>
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
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 flex items-center group focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10 transition-all hover:border-red-500/50">
                    <Search className="text-gray-400 ml-3 shrink-0 transition-colors pointer-events-none group-focus-within:text-red-500" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by Firm Name, ID, or Contact..."
                        className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-medium text-gray-700 h-10 w-full placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* Collapsible Filters & Actions */}
            <div className={`flex-col gap-4 mb-6 ${showMobileFilters ? 'flex' : 'hidden lg:flex'}`}>
                {/* Actions */}
                <div className="flex justify-end">
                    <div className="flex flex-wrap gap-3">
                        {userRole === 'ADMIN' && (
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full font-bold text-xs text-gray-600 hover:border-red-200 hover:bg-red-50 transition-all uppercase tracking-widest shadow-sm flex-1 sm:flex-none justify-center"
                            >
                                <Upload size={16} className="text-red-500" /> Import
                            </button>
                        )}
                        <button
                            onClick={handleExportDirectory}
                            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full font-bold text-xs text-gray-600 hover:border-gray-300 transition-all uppercase tracking-widest shadow-sm flex-1 sm:flex-none justify-center"
                        >
                            <Download size={16} /> Export
                        </button>
                        <button
                            onClick={() => dispatch(fetchClients(''))}
                            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full font-bold text-xs text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all uppercase tracking-widest shadow-sm flex-1 sm:flex-none justify-center"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin text-red-600" : ""} /> Refresh
                        </button>
                        <button
                            onClick={onRegisterNew}
                            className="flex items-center gap-2 bg-[#ef4444] text-white px-5 py-2.5 rounded-full font-bold text-xs shadow-lg shadow-red-500/20 active:scale-95 transition-all uppercase tracking-widest flex-1 sm:flex-none justify-center"
                        >
                            <Plus size={16} /> Register Firm
                        </button>
                    </div>
                </div>

                {/* Filter & Control Bar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="hidden lg:flex flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 items-center group focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10 transition-all hover:border-red-500/50">
                        <Search className="text-gray-400 ml-3 shrink-0 transition-colors pointer-events-none group-focus-within:text-red-500" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by Firm Name, ID, or Contact..."
                            className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-medium text-gray-700 h-10 w-full placeholder:text-gray-400"
                        />
                    </div>

                    {/* Column Manager */}
                    <div className="relative" ref={columnMenuRef}>
                        <button
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 uppercase tracking-wide transition-all w-full md:w-auto"
                        >
                            <FileSpreadsheet size={16} /> Columns
                        </button>

                        {showColumnMenu && (
                            <div className="absolute right-0 top-12 bg-white border border-gray-100 rounded-2xl shadow-xl w-60 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Visible Columns</h4>
                                <div className="space-y-2">
                                    {allColumns.map(col => (
                                        <label key={col.key} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${visibleColumns.includes(col.key) ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300'}`}>
                                                {visibleColumns.includes(col.key) && <Check size={10} />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={visibleColumns.includes(col.key)}
                                                onChange={() => toggleColumn(col.key)}
                                            />
                                            <span className={`text-xs font-bold ${visibleColumns.includes(col.key) ? 'text-gray-900' : 'text-gray-500'}`}>{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between">
                                    <button onClick={() => setVisibleColumns(allColumns.map(c => c.key))} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase">Show All</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Advanced Table */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col mb-12 overflow-hidden w-full max-w-[100vw]">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                {allColumns.filter(c => visibleColumns.includes(c.key)).map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => col.sortable && handleSort(col.key)}
                                        className={`px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:bg-gray-100 hover:text-gray-700' : ''} transition-colors`}
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {col.sortable && <RenderSortIcon columnKey={col.key} />}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {processedClients.map((client, index) => (
                                <tr key={client._id || index} className="hover:bg-red-50/20 transition-colors group">
                                    {visibleColumns.includes('index') && (
                                        <td className="px-4 py-3 text-xs font-bold text-gray-400">
                                            {index + 1}
                                        </td>
                                    )}
                                    {visibleColumns.includes('firmName') && (
                                        <td className="px-4 py-3 max-w-[220px] truncate" title={client.firmName}>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-900">{client.firmName}</span>
                                                <span className="text-[10px] text-gray-400 font-medium">{client.contactPerson}</span>
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.includes('contactNumber') && (
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 group/copy">
                                                <span className="text-xs font-mono font-medium text-gray-600">{client.contactNumber || client.phone}</span>
                                                {(client.contactNumber || client.phone) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCopy(client.contactNumber || client.phone, 'Phone'); }}
                                                        className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Copy Phone"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.includes('email') && (
                                        <td className="px-4 py-3 max-w-[200px]" title={client.email}>
                                            <div className="flex items-center gap-2 group/copy">
                                                <span className="text-xs font-medium text-gray-600 truncate block">{client.email}</span>
                                                {client.email && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCopy(client.email, 'Email'); }}
                                                        className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all shrink-0"
                                                        title="Copy Email"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.includes('gstNumber') && (
                                        <td className="px-4 py-3">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{client.gstNumber || '-'}</span>
                                        </td>
                                    )}
                                    {visibleColumns.includes('city') && (
                                        <td className="px-4 py-3">
                                            <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-500 uppercase">{client.city || 'N/A'}</span>
                                        </td>
                                    )}
                                    {visibleColumns.includes('createdAt') && (
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-xs font-bold text-gray-500">
                                                {new Date(client.createdAt).toLocaleDateString("en-GB")}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.includes('view') && (
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleViewClient(client)}
                                                disabled={viewLoadingId === (client._id || client.id)}
                                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-all disabled:opacity-50"
                                                title="View Details"
                                            >
                                                {viewLoadingId === (client._id || client.id) ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {processedClients.length === 0 && (
                                <tr>
                                    <td colSpan={visibleColumns.length} className="px-6 py-20 text-center text-gray-300 font-bold uppercase tracking-widest text-xs">
                                        No Records Found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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

            {/* Mass Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsImportModalOpen(false); setImportResults(null); }}></div>
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl p-10 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Mass Client Import</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Batch Registry Provisioning</p>
                            </div>
                            <button onClick={() => { setIsImportModalOpen(false); setImportResults(null); }} className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center"><X size={20} /></button>
                        </div>

                        {!importResults ? (
                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Info className="text-blue-500" size={18} />
                                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">CSV Template Guide</h4>
                                    </div>
                                    <p className="text-[11px] text-blue-700 leading-relaxed mb-4">
                                        Your CSV file must include a header row. Required columns are: <span className="font-bold">Firm Name, Contact Name, Phone</span>.
                                        Optional columns: <span className="font-bold">Email, GST, Address, City, Pincode, Services</span>.
                                    </p>
                                    <div className="bg-white/60 p-3 rounded-xl border border-blue-200/50 font-mono text-[9px] text-blue-900">
                                        Firm Name, Contact Name, Phone, Email, Services<br />
                                        Apex Corp, John Smith, 9876543210, john@apex.com, CYLINDERS|NOC
                                    </div>
                                </div>

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center cursor-pointer hover:border-red-200 hover:bg-red-50/10 transition-all group"
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleCsvImport}
                                        accept=".csv"
                                        className="hidden"
                                    />
                                    <FileSpreadsheet size={48} className="mx-auto text-gray-300 group-hover:text-red-500 mb-4 transition-colors" />
                                    <p className="text-sm font-bold text-gray-700">Drop your CSV here or click to browse</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Maximum 500 records per batch</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check className="text-green-600" size={40} />
                                </div>
                                <h4 className="text-2xl font-bold text-gray-900 mb-2">Import Successful</h4>
                                <div className="flex justify-center gap-8 mt-6">
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-green-600">{importResults.success}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Records Added</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-red-400">{importResults.failed}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Failed Rows</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setIsImportModalOpen(false); setImportResults(null); }}
                                    className="w-full mt-10 bg-[#0f172a] text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs"
                                >
                                    Back to Directory
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ServiceDetailsModal
                isOpen={isServiceModalOpen}
                onClose={() => setIsServiceModalOpen(false)}
                serviceId={selectedServiceId}
            />
        </div>
    );
};

export default ClientsScreen;
