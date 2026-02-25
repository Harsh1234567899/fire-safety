import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
    ArrowLeft, Search, User, ArrowRight, X, Layers, CheckCircle,
    Calendar, Hash, Check, Eye, PenTool, Paperclip, Upload, File,
    Trash2, Building, Phone, Mail, MapPin, CreditCard, RefreshCw,
    ShieldCheck, FileText, Sparkles, Printer, Loader2, Plus
} from 'lucide-react';
import CustomDropdown from './CustomDropdown.jsx';
import CertificateTemplate from './CertificateTemplate.jsx';
import { createRoot } from 'react-dom/client';
import { searchClients } from '../api/client';
import { createCylinder, updateCylinder } from '../api/fireExtinguisher';
import { createNOC, updateNOC } from '../api/fireNoc';
import { createAMC, updateAMC } from '../api/amc';
import { createAmcVisit, updateAmcVisit } from '../api/amcVisit';
import { getClientServices } from '../api/service';
import ServiceDetailsModal from './ServiceDetailsModal.jsx';
import { getGasCategories, getNocTypes } from '../api/category';
import { uploadDocument, deleteDocument } from '../api/document';
import { toast } from 'react-hot-toast';


// ── helpers ────────────────────────────────────────────────────────────────
const toDateInput = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toISOString().split('T')[0]; } catch { return ''; }
};
const formatDate = (d) => {
    if (!d) return 'N/A';
    if (d.includes('/')) return d;
    const p = d.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
};

const INITIAL_SEQUENCE = { 'CO2': 1024, 'ABC Powder': 512, 'Clean Agent': 128, DEFAULT: 100 };

// ══════════════════════════════════════════════════════════════════════════
const RenewalScreen = ({ onBack }) => {
    // ── view state ──────────────────────────────────────────────────────
    const [view, setView] = useState('SEARCH'); // SEARCH | FORM | DONE

    // ── search ──────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loadingClient, setLoadingClient] = useState(false);

    // ── selected client ─────────────────────────────────────────────────
    const [client, setClient] = useState(null); // full client object

    // ── service data (pre-filled from history) ──────────────────────────
    const [cylinders, setCylinders] = useState([]);
    const [nocs, setNocs] = useState([]);
    const [amcs, setAmcs] = useState([]);
    const [amcVisits, setAmcVisits] = useState([]);

    // ── dropdown data ───────────────────────────────────────────────────
    const [gasCategories, setGasCategories] = useState([]);
    const [gasSubCategories, setGasSubCategories] = useState([]);
    const [nocTypes, setNocTypes] = useState([]);

    // ── UI state ─────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('CYLINDERS');
    const [cylindersSaved, setCylindersSaved] = useState(false);
    const [nocsSaved, setNocsSaved] = useState(false);
    const [amcsSaved, setAmcsSaved] = useState(false);
    const [amcVisitsSaved, setAmcVisitsSaved] = useState(false);
    const [savingSection, setSavingSection] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(null); // track which item is uploading
    const [isDownloading, setIsDownloading] = useState(false);
    const [globalSequence, setGlobalSequence] = useState(INITIAL_SEQUENCE);

    // Modal State
    const [selectedServiceId, setSelectedServiceId] = useState(null);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

    const handleViewServiceDetails = (serviceId) => {
        setSelectedServiceId(serviceId);
        setIsServiceModalOpen(true);
    };

    // ── load dropdowns once ─────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const [gasCats, nTypes] = await Promise.all([getGasCategories(), getNocTypes()]);
                const cats = gasCats.data?.data || [];
                setGasCategories(cats);
                setGasSubCategories(cats.flatMap(c => c.subcategories || []));
                setNocTypes(nTypes.data?.data || []);
            } catch (e) { console.error('Dropdown load failed', e); }
        })();
    }, []);

    // ── search ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!searchTerm.trim()) { setSearchResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const res = await searchClients(searchTerm);
                setSearchResults(res.data?.data || []);
            } catch { setSearchResults([]); }
        }, 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    // ── select client & fetch history ────────────────────────────────────
    const handleSelectClient = async (selectedClient) => {
        setLoadingClient(true);
        try {
            const { data } = await getClientServices(selectedClient._id);
            const history = data?.groupedServices || {};

            const cylindersFromHistory = (history.fireExtinguishers || []).map(item => ({
                id: item._id?.toString() || String(Date.now() + Math.random()),
                gasCategory: item.categoryObj?.name || '',
                kgLtr: item.kgLtrObj?._id?.toString() || item.kgLtr?.toString() || '',
                serviceType: item.serviceType || 'refilling',
                refillingType: item.refillingType || 'existing',
                qty: item.quantity || 1,
                startDate: toDateInput(item.startDate),
                renewalDate: toDateInput(item.endDate),
                renewalNotes: item.notes || '',
                selectedSerials: [],
                availableSerials: item.serialNumber || [],
                showPreview: false,
                lastExpiry: item.endDate,
            }));

            const nocsFromHistory = (history.fireNocs || []).map(item => ({
                id: item._id?.toString() || String(Date.now() + Math.random()),
                type: item.nocTypeObj?.type || '',
                startDate: toDateInput(item.startDate),
                expiry: toDateInput(item.endDate),
                renewalNotes: item.notes || '',
                attachedFiles: (item.documents || []).map(d => ({
                    _id: d._id?.toString(),
                    name: d.filename || 'Document',
                    url: d.url,
                    size: 0,
                    fromServer: true,
                })),
                lastExpiry: item.endDate,
            }));

            const amcsFromHistory = (history.amcs || []).map(item => ({
                id: item._id?.toString() || String(Date.now() + Math.random()),
                site: item.name || '',
                personDetails: item.personDetails || '',
                mobile: item.mobile || '',
                startDate: toDateInput(item.startDate),
                expiry: toDateInput(item.endDate),
                renewalNotes: item.notes || '',
                attachedFiles: (item.documents || []).map(d => ({
                    _id: d._id?.toString(),
                    name: d.filename || 'Document',
                    url: d.url,
                    size: 0,
                    fromServer: true,
                })),
                lastExpiry: item.endDate,
            }));

            const amcVisitsFromHistory = (history.amcVisits || []).map(item => ({
                id: item._id?.toString() || String(Date.now() + Math.random()),
                visitDate: toDateInput(item.endDate || item.visitDate), // endDate is visitDate mapped in service controller
                notes: item.notes || '',
                isNew: false,
                lastExpiry: item.endDate || item.visitDate,
            }));

            setCylinders(cylindersFromHistory);
            setNocs(nocsFromHistory);
            setAmcs(amcsFromHistory);
            setAmcVisits(amcVisitsFromHistory);

            // default first tab to whichever has data
            if (cylindersFromHistory.length > 0) setActiveTab('CYLINDERS');
            else if (nocsFromHistory.length > 0) setActiveTab('NOC');
            else if (amcsFromHistory.length > 0) setActiveTab('AMC');
            else if (amcVisitsFromHistory.length > 0) setActiveTab('AMC_VISITS');

            setClient({ ...selectedClient, _id: selectedClient._id || selectedClient.id });
            setCylindersSaved(false); setNocsSaved(false); setAmcsSaved(false); setAmcVisitsSaved(false);
            setView('FORM');
        } catch (e) {
            console.error(e);
            toast.error('Could not load client history.');
        } finally {
            setLoadingClient(false);
        }
    };

    // ── generic item update ──────────────────────────────────────────────
    const updateItem = (id, section, field, value) => {
        const setter = section === 'CYLINDERS' ? setCylinders : section === 'NOC' ? setNocs : section === 'AMC' ? setAmcs : setAmcVisits;
        setter(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    // ── add new entries ──────────────────────────────────────────────────
    const addNewCylinder = () => {
        const defaultFireCat = gasCategories.find(g => g.name.toLowerCase().includes('fire')) || gasCategories[0];
        const defaultGasCategory = defaultFireCat ? defaultFireCat.name : '';

        setCylinders(prev => [...prev, {
            id: String(Date.now() + Math.random()),
            gasCategory: defaultGasCategory,
            kgLtr: '',
            serviceType: 'new',
            refillingType: 'new',
            qty: 1,
            startDate: new Date().toISOString().slice(0, 10),
            renewalDate: '',
            renewalNotes: '',
            selectedSerials: [],
            availableSerials: [],
            showPreview: false,
            lastExpiry: null,
            isNew: true,
        }]);
        setCylindersSaved(false);
    };
    const addNewNoc = () => {
        const defaultNocType = nocTypes.find(t => t.type.toLowerCase().includes('fire')) || nocTypes[0];

        setNocs(prev => [...prev, {
            id: String(Date.now() + Math.random()),
            type: defaultNocType ? defaultNocType.type : '',
            startDate: new Date().toISOString().slice(0, 10),
            expiry: '',
            renewalNotes: '',
            attachedFiles: [],
            lastExpiry: null,
            isNew: true,
        }]);
        setNocsSaved(false);
    };
    const addNewAmc = () => {
        setAmcs(prev => [...prev, {
            id: String(Date.now() + Math.random()),
            site: '',
            personDetails: '',
            mobile: '',
            startDate: new Date().toISOString().slice(0, 10),
            expiry: '',
            renewalNotes: '',
            attachedFiles: [],
            lastExpiry: null,
            isNew: true,
        }]);
        setAmcsSaved(false);
    };
    const addNewAmcVisit = () => {
        setAmcVisits(prev => [...prev, {
            id: String(Date.now() + Math.random()),
            visitDate: new Date().toISOString().slice(0, 10),
            notes: '',
            isNew: true,
        }]);
        setAmcVisitsSaved(false);
    };
    const removeItem = (id, section) => {
        if (section === 'CYLINDERS') { setCylinders(prev => prev.filter(i => i.id !== id)); setCylindersSaved(false); }
        else if (section === 'NOC') { setNocs(prev => prev.filter(i => i.id !== id)); setNocsSaved(false); }
        else if (section === 'AMC') { setAmcs(prev => prev.filter(i => i.id !== id)); setAmcsSaved(false); }
        else { setAmcVisits(prev => prev.filter(i => i.id !== id)); setAmcVisitsSaved(false); }
    };

    // ── toggle serial selection ──────────────────────────────────────────
    const toggleSerial = (id, serial) => {
        setCylinders(prev => prev.map(item => {
            if (item.id !== id) return item;
            const sel = item.selectedSerials || [];
            const next = sel.includes(serial) ? sel.filter(s => s !== serial) : [...sel, serial];
            return { ...item, selectedSerials: next };
        }));
    };

    // ── serial preview ───────────────────────────────────────────────────
    const handlePreviewSerials = (id) => {
        setCylinders(prev => prev.map(item => {
            if (item.id !== id) return item;
            const cat = item.gasCategory;
            const base = globalSequence[cat] || globalSequence.DEFAULT;
            const newCount = Math.max(0, item.qty - item.selectedSerials.length);
            const newSerials = Array.from({ length: newCount }, (_, i) => `${cat.replace(/\s+/g, '').toUpperCase()}-${String(base + i).padStart(4, '0')}`);
            setGlobalSequence(s => ({ ...s, [cat]: base + newCount }));
            return { ...item, generatedSerials: [...item.selectedSerials, ...newSerials], showPreview: true };
        }));
    };

    // ── file upload / remove ─────────────────────────────────────────────
    const handleFileUpload = async (e, id, section) => {
        const fileList = Array.from(e.target.files);
        if (!fileList.length) return;
        e.target.value = ''; // reset so same file can be re-selected

        const sectionType = section === 'NOC' ? 'noc' : 'amc';
        const setter = section === 'NOC' ? setNocs : setAmcs;

        for (const file of fileList) {
            setUploadingFile(id);
            try {
                const formData = new FormData();
                formData.append('url', file);

                // If it's a temporary frontend ID (e.g. from Date.now()), send "new" so backend handles it correctly
                const isTempId = id.includes('.') || id.length < 24;
                formData.append('id', isTempId ? 'new' : id);

                formData.append('type', sectionType);

                const res = await uploadDocument(formData);
                const doc = res.data?.data;
                if (doc) {
                    setter(prev => prev.map(item => item.id === id ? {
                        ...item,
                        attachedFiles: [...item.attachedFiles, {
                            _id: doc._id,
                            name: doc.filename || file.name,
                            url: doc.url,
                            size: file.size,
                            fromServer: true,
                        }]
                    } : item));
                }
            } catch (err) {
                console.error('Upload failed:', err);
                toast.error(`Failed to upload ${file.name}`);
            } finally {
                setUploadingFile(null);
            }
        }
    };
    const removeFile = async (id, fileObj, section) => {
        const setter = section === 'NOC' ? setNocs : setAmcs;
        // If it was uploaded to the server, delete via API
        if (fileObj.fromServer && fileObj._id) {
            try {
                await deleteDocument(fileObj._id);
            } catch (err) {
                console.error('Delete failed:', err);
                toast.error('Failed to delete document from server.');
                return;
            }
        }
        setter(prev => prev.map(item => item.id === id ? { ...item, attachedFiles: item.attachedFiles.filter(f => f !== fileObj) } : item));
    };

    // ── save cylinders ───────────────────────────────────────────────────
    const handleSaveCylinders = async () => {
        if (!cylinders.length) { toast.error('No cylinder records to save.'); return; }
        const invalid = cylinders.find(c => !c.gasCategory || !c.startDate || !c.renewalDate);
        if (invalid) { toast.error('Each cylinder needs Gas Category, Service Date and Renewal Date.'); return; }
        setSavingSection('CYLINDERS');
        try {
            const results = await Promise.all(cylinders.map(async (c) => {
                const catObj = gasCategories.find(g => g.name === c.gasCategory);
                const serials = c.generatedSerials || c.selectedSerials || [];

                // Only take the selected serial count for the new refilled quantity, unless none are selected
                const resolvedQuantity = (serials.length > 0 && !c.isNew) ? serials.length : c.qty;

                const payload = {
                    clientId: client._id,
                    serviceType: c.serviceType || 'refilling',
                    refillingType: c.refillingType || 'existing',
                    category: catObj?._id,
                    kgLtr: c.kgLtr,
                    quantity: resolvedQuantity,
                    startDate: c.startDate,
                    endDate: c.renewalDate,
                    notes: c.renewalNotes,
                    serialNumber: serials,
                };

                // If it is a historical cylinder being refilled, we CREATE a new entry to preserve history.
                if (c.isNew || c.serviceType === 'refilling') {
                    const res = await createCylinder(payload);
                    return { oldId: c.id, newId: res.data?.data?._id, data: res.data };
                } else {
                    const res = await updateCylinder(c.id, payload);
                    return { oldId: c.id, newId: c.id, data: res.data };
                }
            }));

            // Update state so subsequent saves of this view update the newly created records instead of creating more
            setCylinders(prev => prev.map(c => {
                const match = results.find(r => r.oldId === c.id);
                if (match && match.newId) {
                    return { ...c, id: match.newId, isNew: false };
                }
                return c;
            }));

            setCylindersSaved(true);
            toast.success('Cylinders saved!');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to save cylinders.');
        } finally {
            setSavingSection(null);
        }
    };

    // ── save NOCs ────────────────────────────────────────────────────────
    const handleSaveNocs = async () => {
        if (!nocs.length) { toast.error('No NOC records to save.'); return; }
        const invalid = nocs.find(n => !n.type || !n.startDate || !n.expiry);
        if (invalid) { toast.error('Each NOC needs Type, Start Date and Expiry.'); return; }
        setSavingSection('NOC');
        try {
            await Promise.all(nocs.map(n => {
                const nocTypeObj = nocTypes.find(t => t.type === n.type);
                const payload = {
                    clientId: client._id,
                    serviceType: 'refilling',
                    nocType: nocTypeObj?._id,
                    nocName: n.type,
                    startDate: n.startDate,
                    endDate: n.expiry,
                    notes: n.renewalNotes,
                    documents: (n.attachedFiles || []).map(file => typeof file === 'string' ? file : file._id).filter(Boolean),
                };
                return n.isNew ? createNOC(payload) : updateNOC(n.id, payload);
            }));
            setNocsSaved(true);
            toast.success('NOC entries saved!');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to save NOC entries.');
        } finally {
            setSavingSection(null);
        }
    };

    // ── save AMCs ────────────────────────────────────────────────────────
    const handleSaveAmcs = async () => {
        if (!amcs.length) { toast.error('No AMC records to save.'); return; }
        const invalid = amcs.find(a => !a.site || !a.startDate || !a.expiry);
        if (invalid) { toast.error('Each AMC needs Site, Start Date and Expiry.'); return; }
        const phoneRx = /^[6-9]\d{9}$/;
        const badPhone = amcs.find(a => a.mobile && a.mobile.trim() && !phoneRx.test(a.mobile.trim()));
        if (badPhone) { toast.error('Enter a valid 10-digit Indian mobile number for each AMC.'); return; }
        setSavingSection('AMC');
        try {
            await Promise.all(amcs.map(a => {
                const payload = {
                    clientId: client._id,
                    type: 'new',
                    name: a.site,
                    personDetails: a.personDetails || '',
                    mobile: a.mobile || '',
                    startDate: a.startDate,
                    endDate: a.expiry,
                    notes: a.renewalNotes || '',
                    documents: (a.attachedFiles || []).map(file => typeof file === 'string' ? file : file._id).filter(Boolean),
                };
                return a.isNew ? createAMC(payload) : updateAMC(a.id, payload);
            }));
            setAmcsSaved(true);
            toast.success('AMC contracts saved!');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to save AMC contracts.');
        } finally {
            setSavingSection(null);
        }
    };

    // ── save AMC Visits ──────────────────────────────────────────────────
    const handleSaveAmcVisits = async () => {
        if (!amcVisits.length) { toast.error('No AMC Visit records to save.'); return; }
        const invalid = amcVisits.find(av => !av.visitDate || !av.notes);
        if (invalid) { toast.error('Each AMC Visit needs a Visit Date and Notes.'); return; }
        setSavingSection('AMC_VISITS');
        try {
            await Promise.all(amcVisits.map(av => {
                const payload = {
                    clientId: client._id,
                    visitDate: av.visitDate,
                    notes: av.notes,
                };
                return av.isNew ? createAmcVisit(payload) : updateAmcVisit(av.id, payload);
            }));
            setAmcVisitsSaved(true);
            toast.success('AMC Visits saved!');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to save AMC Visits.');
        } finally {
            setSavingSection(null);
        }
    };

    // ── finish & generate PDF ────────────────────────────────────────────
    const handleFinish = () => {
        const anySaved = cylindersSaved || nocsSaved || amcsSaved || amcVisitsSaved;
        if (!anySaved) { toast.error('Save at least one section before finishing.'); return; }
        setView('DONE');
    };

    const handleViewPDF = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        const ledgerItems = [
            ...cylinders.filter(c => c.gasCategory).map(c => {
                const serials = c.generatedSerials || c.selectedSerials || [];
                const resolvedQuantity = (serials.length > 0 && !c.isNew) ? serials.length : c.qty;
                return {
                    _id: c.id, type: 'CYLINDERS', category: c.gasCategory,
                    serialNumbers: serials,
                    quantity: resolvedQuantity,
                    startDate: c.startDate, endDate: c.renewalDate, notes: c.renewalNotes,
                };
            }),
            ...nocs.filter(n => n.type).map(n => ({
                _id: n.id, type: 'NOC', category: n.type,
                serialNumbers: [],
                startDate: n.startDate, endDate: n.expiry, notes: n.renewalNotes,
            })),
            ...amcs.filter(a => a.site).map(a => ({
                _id: a.id, type: 'AMC', category: `AMC – ${a.site}`,
                serialNumbers: [],
                startDate: a.startDate, endDate: a.expiry, notes: a.renewalNotes,
            })),
        ];
        const container = document.createElement('div');
        container.style.cssText = 'position:absolute;left:-9999px;top:0;';
        document.body.appendChild(container);
        const root = createRoot(container);
        root.render(<CertificateTemplate client={client} ledgerItems={ledgerItems} />);
        setTimeout(async () => {
            const el = container.querySelector('#certificate-print-area');
            if (el) {
                try {
                    const worker = window.html2pdf().set({ margin: 0, filename: `Renewal_${client.firmName}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } }).from(el);
                    const blob = await worker.output('blob');
                    window.open(URL.createObjectURL(blob), '_blank');
                } catch (e) { toast.error('PDF generation failed.'); }
            }
            document.body.removeChild(container);
            setIsDownloading(false);
        }, 1000);
    };

    // ══════════════════════════════════════════════════════════════════════
    // SEARCH VIEW
    // ══════════════════════════════════════════════════════════════════════
    if (view === 'SEARCH') {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col max-w-4xl mx-auto py-8">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={onBack} className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-900 shadow-sm transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-3xl font-bold text-[#0f172a]">Service Renewal</h1>
                </div>

                <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                    <p className="text-gray-500 mb-6 font-medium">Search for an existing client to load all historical service data for renewal.</p>

                    <div className="group flex items-center bg-gray-50 border border-transparent focus-within:bg-white focus-within:border-red-200 rounded-2xl px-5 py-4 shadow-sm transition-all mb-8">
                        <Search className="shrink-0 mr-4 text-gray-300 group-focus-within:text-red-500 transition-colors pointer-events-none" size={20} />
                        <input
                            type="text"
                            placeholder="Type firm name or contact person..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-none outline-none text-sm font-bold placeholder:text-gray-400"
                            autoFocus
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {loadingClient && (
                            <div className="flex items-center justify-center py-20 text-gray-400">
                                <Loader2 className="animate-spin mr-3" size={24} /> Loading client data…
                            </div>
                        )}
                        {!loadingClient && searchResults.length > 0 && searchResults.map(c => (
                            <div key={c._id || c.id} className="p-6 bg-gray-50 rounded-3xl border border-transparent hover:border-red-100 transition-all group flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 font-bold group-hover:bg-red-500 group-hover:text-white group-hover:border-red-400 transition-all">
                                        {(c.firmName || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">{c.firmName}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <User size={12} className="text-gray-300" />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.contactPerson || c.contactName}</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSelectClient(c)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                                >
                                    START RENEWAL <ArrowRight size={14} />
                                </button>
                            </div>
                        ))}
                        {!loadingClient && searchTerm && searchResults.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <X size={32} className="mb-3 opacity-20" />
                                <p className="font-bold text-sm uppercase tracking-widest">No matching firms found</p>
                            </div>
                        )}
                        {!loadingClient && !searchTerm && (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                                <Layers size={48} className="mb-4 opacity-20" />
                                <p className="font-bold text-sm uppercase tracking-widest">Search to find a client</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════
    // DONE VIEW
    // ══════════════════════════════════════════════════════════════════════
    if (view === 'DONE') {
        return (
            <div className="animate-in fade-in zoom-in-95 duration-500 h-full flex flex-col max-w-4xl mx-auto py-8">
                <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl border border-gray-100 flex flex-col items-center text-center h-full justify-center">
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mb-8 shadow-xl shadow-green-200">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-3xl font-bold text-[#0f172a] mb-3">Renewal Complete!</h2>
                    <p className="text-gray-500 text-lg mb-2">{client?.firmName}</p>
                    <p className="text-gray-400 text-sm mb-12">All renewed service records have been saved successfully.</p>

                    <div className="flex gap-4">
                        <button
                            onClick={handleViewPDF}
                            disabled={isDownloading}
                            className={`flex items-center gap-2 bg-[#0f172a] hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20 active:scale-95 transition-all ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Printer size={18} className={isDownloading ? 'animate-pulse' : ''} />
                            {isDownloading ? 'Generating…' : 'View & Download Certificate'}
                        </button>
                        <button
                            onClick={onBack}
                            className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-gray-200 transition-all active:scale-95"
                        >
                            Back to Start
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════
    // FORM VIEW
    // ══════════════════════════════════════════════════════════════════════
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => setView('SEARCH')} className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-900 shadow-sm transition-all">
                    <ArrowLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-[#0f172a]">Service Renewal</h1>
                    <p className="text-xs text-gray-400 font-medium mt-0.5 uppercase tracking-widest">{client?.firmName}</p>
                </div>
                <button onClick={onBack} className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-red-500 shadow-sm transition-all" title="Cancel renewal">
                    <X size={20} />
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 flex-1 overflow-y-auto">
                {/* ── Client Info Card (read-only) ── */}
                <div className="bg-gray-50 rounded-2xl p-6 mb-10 border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[#0f172a] rounded-xl flex items-center justify-center text-white font-bold text-lg">
                            {(client?.firmName || '?')[0].toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">{client?.firmName}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Existing Client — No changes to profile</p>
                        </div>
                        <span className="ml-auto bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Profile Verified ✓</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        {[
                            { icon: User, label: 'Contact', value: client?.contactPerson || client?.contactName },
                            { icon: Phone, label: 'Mobile', value: client?.contactNumber || client?.mobile },
                            { icon: Mail, label: 'Email', value: client?.emailAddress || client?.email },
                            { icon: MapPin, label: 'City', value: client?.city },
                        ].map(({ icon: Icon, label, value }) => value ? (
                            <div key={label} className="bg-white rounded-xl p-3 border border-gray-100">
                                <div className="flex items-center gap-2 text-gray-400 mb-1">
                                    <Icon size={12} />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
                                </div>
                                <p className="font-bold text-gray-800 truncate">{value}</p>
                            </div>
                        ) : null)}
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="flex items-center gap-2 mb-6">
                    {['CYLINDERS', 'NOC', 'AMC', 'AMC_VISITS'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-[#0f172a] text-white shadow-lg shadow-slate-900/20' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                        >
                            {tab}
                            {tab === 'CYLINDERS' && cylinders.length > 0 && <span className="ml-2 bg-white/20 text-current px-1.5 py-0.5 rounded text-[9px]">{cylinders.length}</span>}
                            {tab === 'NOC' && nocs.length > 0 && <span className="ml-2 bg-white/20 text-current px-1.5 py-0.5 rounded text-[9px]">{nocs.length}</span>}
                            {tab === 'AMC' && amcs.length > 0 && <span className="ml-2 bg-white/20 text-current px-1.5 py-0.5 rounded text-[9px]">{amcs.length}</span>}
                            {tab === 'AMC_VISITS' && amcVisits.length > 0 && <span className="ml-2 bg-white/20 text-current px-1.5 py-0.5 rounded text-[9px]">{amcVisits.length}</span>}
                        </button>
                    ))}
                </div>

                {/* ── CYLINDERS TAB ── */}
                {activeTab === 'CYLINDERS' && (
                    <>
                        {cylinders.length === 0 ? (
                            <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-300">
                                <RefreshCw size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest mb-4">No cylinder history found for this client</p>
                                <button onClick={addNewCylinder} className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg">
                                    <Plus size={14} /> Add New Cylinder
                                </button>
                            </div>
                        ) : (<>
                            {cylinders.map((item, idx) => (
                                <div key={item.id} className="bg-gray-50 p-8 rounded-[2rem] mb-6 border border-gray-100 flex flex-col gap-6 hover:border-orange-100 transition-all">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {item.isNew ? '✨ New Entry' : `Record #${idx + 1}`}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            {!item.isNew && (
                                                <button
                                                    onClick={() => handleViewServiceDetails(item.id)}
                                                    className="flex items-center gap-1 px-2 py-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                                                >
                                                    <Eye size={12} /> View Details
                                                </button>
                                            )}
                                            <button onClick={() => removeItem(item.id, 'CYLINDERS')} className="flex items-center gap-1 px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                                                <Trash2 size={12} /> Remove
                                            </button>
                                        </div>
                                    </div>

                                    {/* Last expiry badge */}
                                    {item.lastExpiry && (
                                        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl self-start">
                                            <Calendar size={12} className="text-orange-500" />
                                            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Previous Expiry: {formatDate(toDateInput(item.lastExpiry))}</span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                        {/* Capacity */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Capacity / Weight</label>
                                            <CustomDropdown
                                                value={item.kgLtr || ''}
                                                onChange={val => updateItem(item.id, 'CYLINDERS', 'kgLtr', val)}
                                                placeholder="Select Capacity"
                                                options={gasSubCategories
                                                    .filter(sub => !item.gasCategory || (gasCategories.find(c => c.name === item.gasCategory)?._id?.toString() === sub.category?.toString()))
                                                    .map(sub => ({ value: sub._id.toString(), label: `${sub.name} (${sub.weight}${sub.kgLiter})` }))}
                                                className="w-full text-sm font-bold"
                                            />
                                        </div>
                                        {/* Service Type */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Service Type</label>
                                            <CustomDropdown
                                                value={item.serviceType}
                                                onChange={val => updateItem(item.id, 'CYLINDERS', 'serviceType', val)}
                                                options={[{ value: 'refilling', label: 'Refilling' }, { value: 'new', label: 'New' }]}
                                                className="w-full text-sm font-bold"
                                            />
                                        </div>
                                        {/* Refilling Type */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Refilling Type</label>
                                            <CustomDropdown
                                                value={item.refillingType}
                                                onChange={val => updateItem(item.id, 'CYLINDERS', 'refillingType', val)}
                                                options={[{ value: 'existing', label: 'Existing' }, { value: 'new', label: 'New' }]}
                                                className="w-full text-sm font-bold"
                                            />
                                        </div>
                                        {/* Qty */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Quantity</label>
                                            <input type="number" min="1" value={item.qty}
                                                onChange={e => updateItem(item.id, 'CYLINDERS', 'qty', Math.max(item.selectedSerials?.length || 0, parseInt(e.target.value) || 0))}
                                                className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                        </div>
                                        {/* Service Date */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">New Service Date</label>
                                            <div className="relative">
                                                <input type="date" value={item.startDate} onChange={e => updateItem(item.id, 'CYLINDERS', 'startDate', e.target.value)}
                                                    className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                        {/* Renewal Date */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">New Renewal Target</label>
                                            <div className="relative">
                                                <input type="date" value={item.renewalDate} onChange={e => updateItem(item.id, 'CYLINDERS', 'renewalDate', e.target.value)}
                                                    className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Serial grid */}
                                    {(item.availableSerials || []).length > 0 && (
                                        <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <Hash size={14} /> Renew Existing Units
                                                </label>
                                                <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                                                    {item.selectedSerials?.length || 0} / {item.availableSerials.length} Selected
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-40 overflow-y-auto pr-2">
                                                {item.availableSerials.map(s => {
                                                    const sel = (item.selectedSerials || []).includes(s);
                                                    return (
                                                        <button key={s} onClick={() => toggleSerial(item.id, s)}
                                                            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl border text-[10px] font-mono font-bold transition-all ${sel ? 'bg-orange-500 border-orange-600 text-white' : 'bg-white border-gray-100 text-gray-400 hover:border-orange-200 hover:bg-orange-50'}`}>
                                                            {sel ? <Check size={10} /> : null}{s}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Notes + preview */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <PenTool size={12} /> Instructions
                                        </label>
                                        <textarea value={item.renewalNotes} onChange={e => updateItem(item.id, 'CYLINDERS', 'renewalNotes', e.target.value)}
                                            placeholder="Special service instructions..." className="w-full bg-white rounded-xl px-4 py-3 text-sm font-medium outline-none border border-gray-100 h-20 resize-none shadow-sm text-gray-900" />
                                    </div>
                                    <div className="flex justify-end">
                                        <button onClick={() => handlePreviewSerials(item.id)}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-colors">
                                            <Eye size={14} /> Preview Allocation
                                        </button>
                                    </div>
                                    {item.showPreview && item.generatedSerials && (
                                        <div className="p-4 bg-blue-600 rounded-2xl">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Allocation Preview</span>
                                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">{item.generatedSerials.length} units</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {item.generatedSerials.map(s => {
                                                    const isExisting = (item.availableSerials || []).includes(s);
                                                    return (
                                                        <span key={s} className={`px-3 py-1 rounded text-[10px] font-mono border ${isExisting ? 'bg-orange-500/20 border-orange-400/50 text-orange-100' : 'bg-white/10 border-white/20 text-white'}`}
                                                            title={isExisting ? 'Renewed' : 'New'}>
                                                            {s} {isExisting ? '(R)' : '(N)'}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button onClick={addNewCylinder} className="w-full py-4 border-2 border-dashed border-orange-200 rounded-2xl text-orange-500 font-bold text-xs uppercase tracking-widest hover:bg-orange-50 hover:border-orange-300 transition-all flex items-center justify-center gap-2">
                                <Plus size={16} /> Add New Cylinder
                            </button>
                        </>)}
                    </>
                )}

                {/* ── NOC TAB ── */}
                {activeTab === 'NOC' && (
                    <>
                        {nocs.length === 0 ? (
                            <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-300">
                                <FileText size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest mb-4">No NOC history found for this client</p>
                                <button onClick={addNewNoc} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg">
                                    <Plus size={14} /> Add New NOC
                                </button>
                            </div>
                        ) : (<>
                            {nocs.map((item, idx) => (
                                <div key={item.id} className="bg-gray-50 p-8 rounded-[2rem] mb-6 border border-gray-100 flex flex-col gap-6 hover:border-blue-100 transition-all">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {item.isNew ? '✨ New Entry' : `Record #${idx + 1}`}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            {!item.isNew && (
                                                <button
                                                    onClick={() => handleViewServiceDetails(item.id)}
                                                    className="flex items-center gap-1 px-2 py-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                                                >
                                                    <Eye size={12} /> View Details
                                                </button>
                                            )}
                                            <button onClick={() => removeItem(item.id, 'NOC')} className="flex items-center gap-1 px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                                                <Trash2 size={12} /> Remove
                                            </button>
                                        </div>
                                    </div>
                                    {item.lastExpiry && (
                                        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl self-start">
                                            <Calendar size={12} className="text-blue-500" />
                                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Previous Expiry: {formatDate(toDateInput(item.lastExpiry))}</span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">NOC Type *</label>
                                            <select value={item.type} onChange={e => updateItem(item.id, 'NOC', 'type', e.target.value)}
                                                className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900">
                                                <option value="">Select type…</option>
                                                {nocTypes.map(t => <option key={t._id} value={t.type}>{t.type}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">New Start Date</label>
                                            <div className="relative">
                                                <input type="date" value={item.startDate} onChange={e => updateItem(item.id, 'NOC', 'startDate', e.target.value)}
                                                    className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">New Expiry Date</label>
                                            <div className="relative">
                                                <input type="date" value={item.expiry} onChange={e => updateItem(item.id, 'NOC', 'expiry', e.target.value)}
                                                    className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Document upload */}
                                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                <Paperclip size={14} /> Attached Documents
                                            </label>
                                            <label htmlFor={`noc-file-${item.id}`}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 cursor-pointer">
                                                <Upload size={14} /> Attach File
                                            </label>
                                        </div>
                                        <input id={`noc-file-${item.id}`} type="file" multiple className="hidden" onChange={e => handleFileUpload(e, item.id, 'NOC')} />
                                        {uploadingFile === item.id && (
                                            <div className="flex items-center gap-2 py-2 text-blue-500 text-xs font-bold">
                                                <Loader2 className="animate-spin" size={14} /> Uploading…
                                            </div>
                                        )}
                                        {item.attachedFiles.length > 0 ? item.attachedFiles.map((f, fi) => (
                                            <div key={f._id || fi} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm"><File size={16} /></div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">{f.name}</p>
                                                        {f.size > 0 && <p className="text-[9px] text-gray-400 uppercase">{(f.size / 1024).toFixed(1)} KB</p>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {f.url && (
                                                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 p-1" title="View document">
                                                            <Eye size={14} />
                                                        </a>
                                                    )}
                                                    <button onClick={() => removeFile(item.id, f, 'NOC')} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
                                                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No documents attached yet</p>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><PenTool size={12} /> Compliance Notes</label>
                                        <textarea value={item.renewalNotes} onChange={e => updateItem(item.id, 'NOC', 'renewalNotes', e.target.value)}
                                            placeholder="Fire department requirements or notes…" className="w-full bg-white rounded-xl px-4 py-3 text-sm font-medium outline-none border border-gray-100 h-20 resize-none shadow-sm text-gray-900" />
                                    </div>
                                </div>
                            ))}
                            <button onClick={addNewNoc} className="w-full py-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-500 font-bold text-xs uppercase tracking-widest hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2">
                                <Plus size={16} /> Add New NOC
                            </button>
                        </>
                        )}
                    </>
                )}

                {/* ── AMC TAB ── */}
                {activeTab === 'AMC' && (
                    <>
                        {amcs.length === 0 ? (
                            <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-300">
                                <ShieldCheck size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest mb-4">No AMC history found for this client</p>
                                <button onClick={addNewAmc} className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-purple-600 transition-all shadow-lg">
                                    <Plus size={14} /> Add New AMC
                                </button>
                            </div>
                        ) : (<>
                            {amcs.map((item, idx) => (
                                <div key={item.id} className="bg-gray-50 p-8 rounded-[2rem] mb-6 border border-gray-100 flex flex-col gap-6 hover:border-purple-100 transition-all">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {item.isNew ? '✨ New Entry' : `Record #${idx + 1}`}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            {!item.isNew && (
                                                <button
                                                    onClick={() => handleViewServiceDetails(item.id)}
                                                    className="flex items-center gap-1 px-2 py-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                                                >
                                                    <Eye size={12} /> View Details
                                                </button>
                                            )}
                                            <button onClick={() => removeItem(item.id, 'AMC')} className="flex items-center gap-1 px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                                                <Trash2 size={12} /> Remove
                                            </button>
                                        </div>
                                    </div>
                                    {item.lastExpiry && (
                                        <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-xl self-start">
                                            <Calendar size={12} className="text-purple-500" />
                                            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Previous Expiry: {formatDate(toDateInput(item.lastExpiry))}</span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Service Site / Branch</label>
                                            <input type="text" value={item.site} onChange={e => updateItem(item.id, 'AMC', 'site', e.target.value)}
                                                className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" placeholder="e.g. Main Plant" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Contact Person</label>
                                            <input type="text" value={item.personDetails} onChange={e => updateItem(item.id, 'AMC', 'personDetails', e.target.value)}
                                                className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" placeholder="Name" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Contact Number</label>
                                            <input type="text" value={item.mobile} maxLength={10} onChange={e => updateItem(item.id, 'AMC', 'mobile', e.target.value.replace(/\D/g, ''))}
                                                className={`w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border shadow-sm text-gray-900 ${item.mobile && item.mobile.length > 0 && !/^[6-9]\d{9}$/.test(item.mobile) ? 'border-red-400' : 'border-gray-100'}`}
                                                placeholder="10-digit mobile" />
                                            {item.mobile && item.mobile.length > 0 && !/^[6-9]\d{9}$/.test(item.mobile) && (
                                                <p className="mt-1 text-[10px] text-red-500 font-medium">Valid 10-digit Indian mobile required</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">New Start Date</label>
                                            <div className="relative">
                                                <input type="date" value={item.startDate} onChange={e => updateItem(item.id, 'AMC', 'startDate', e.target.value)}
                                                    className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">New Expiry Date</label>
                                            <div className="relative">
                                                <input type="date" value={item.expiry} onChange={e => updateItem(item.id, 'AMC', 'expiry', e.target.value)}
                                                    className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                            </div>
                                        </div>

                                    </div>
                                    {/* Document upload */}
                                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                <Paperclip size={14} /> Contract Documents
                                            </label>
                                            <label htmlFor={`amc-file-${item.id}`}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-purple-100 cursor-pointer">
                                                <Upload size={14} /> Attach File
                                            </label>
                                        </div>
                                        <input id={`amc-file-${item.id}`} type="file" multiple className="hidden" onChange={e => handleFileUpload(e, item.id, 'AMC')} />
                                        {uploadingFile === item.id && (
                                            <div className="flex items-center gap-2 py-2 text-purple-500 text-xs font-bold">
                                                <Loader2 className="animate-spin" size={14} /> Uploading…
                                            </div>
                                        )}
                                        {item.attachedFiles.length > 0 ? item.attachedFiles.map((f, fi) => (
                                            <div key={f._id || fi} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-purple-500 shadow-sm"><File size={16} /></div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">{f.name}</p>
                                                        {f.size > 0 && <p className="text-[9px] text-gray-400 uppercase">{(f.size / 1024).toFixed(1)} KB</p>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {f.url && (
                                                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-700 p-1" title="View document">
                                                            <Eye size={14} />
                                                        </a>
                                                    )}
                                                    <button onClick={() => removeFile(item.id, f, 'AMC')} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
                                                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No contract documents attached yet</p>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><PenTool size={12} /> Service Notes</label>
                                        <textarea value={item.renewalNotes} onChange={e => updateItem(item.id, 'AMC', 'renewalNotes', e.target.value)}
                                            placeholder="Contract terms, asset count, etc.…" className="w-full bg-white rounded-xl px-4 py-3 text-sm font-medium outline-none border border-gray-100 h-20 resize-none shadow-sm text-gray-900" />
                                    </div>
                                </div>
                            ))}
                            <button onClick={addNewAmc} className="w-full py-4 border-2 border-dashed border-purple-200 rounded-2xl text-purple-500 font-bold text-xs uppercase tracking-widest hover:bg-purple-50 hover:border-purple-300 transition-all flex items-center justify-center gap-2">
                                <Plus size={16} /> Add New AMC
                            </button>
                        </>
                        )}
                    </>
                )}

                {/* ── AMC VISITS TAB ── */}
                {activeTab === 'AMC_VISITS' && (
                    <>
                        {amcVisits.length === 0 ? (
                            <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-300">
                                <Calendar size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest mb-4">No AMC Visits found for this client</p>
                                <button onClick={addNewAmcVisit} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">
                                    <Plus size={14} /> Add New AMC Visit
                                </button>
                            </div>
                        ) : (<>
                            {amcVisits.map((item, idx) => (
                                <div key={item.id} className="bg-gray-50 p-8 rounded-[2rem] mb-6 border border-gray-100 flex flex-col gap-6 hover:border-indigo-100 transition-all">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {item.isNew ? '✨ New Entry' : `Record #${idx + 1}`}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            {!item.isNew && (
                                                <button
                                                    onClick={() => handleViewServiceDetails(item.id)}
                                                    className="flex items-center gap-1 px-2 py-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                                                >
                                                    <Eye size={12} /> View Details
                                                </button>
                                            )}
                                            <button onClick={() => removeItem(item.id, 'AMC_VISITS')} className="flex items-center gap-1 px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                                                <Trash2 size={12} /> Remove
                                            </button>
                                        </div>
                                    </div>
                                    {item.lastExpiry && (
                                        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl self-start">
                                            <Calendar size={12} className="text-indigo-500" />
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Previous Visit: {formatDate(toDateInput(item.lastExpiry))}</span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Visit Date</label>
                                            <div className="relative">
                                                <input type="date" value={item.visitDate} onChange={e => updateItem(item.id, 'AMC_VISITS', 'visitDate', e.target.value)}
                                                    className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><PenTool size={12} /> Visit Notes</label>
                                            <textarea value={item.notes} onChange={e => updateItem(item.id, 'AMC_VISITS', 'notes', e.target.value)}
                                                placeholder="Details about the standard visit…" className="w-full bg-white rounded-xl px-4 py-3 text-sm font-medium outline-none border border-gray-100 h-20 resize-none shadow-sm text-gray-900" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addNewAmcVisit} className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-500 font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2">
                                <Plus size={16} /> Add New AMC Visit
                            </button>
                        </>
                        )}
                    </>
                )}

                {/* ── Section Save Button ── */}
                <div className="mt-2 mb-4">
                    {activeTab === 'CYLINDERS' && cylinders.length > 0 && (
                        <button onClick={handleSaveCylinders} disabled={savingSection !== null || cylindersSaved}
                            className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.99] uppercase tracking-widest text-sm flex items-center justify-center gap-3 ${cylindersSaved ? 'bg-green-500 text-white cursor-default' : 'bg-[#0f172a] hover:bg-slate-800 text-white'} ${savingSection === 'CYLINDERS' ? 'opacity-70 cursor-wait' : ''}`}>
                            {cylindersSaved ? <><Check size={18} /> Cylinders Saved!</> : savingSection === 'CYLINDERS' ? 'Saving…' : 'Save Fire Extinguishers'}
                        </button>
                    )}
                    {activeTab === 'NOC' && nocs.length > 0 && (
                        <button onClick={handleSaveNocs} disabled={savingSection !== null || nocsSaved}
                            className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.99] uppercase tracking-widest text-sm flex items-center justify-center gap-3 ${nocsSaved ? 'bg-green-500 text-white cursor-default' : 'bg-[#0f172a] hover:bg-slate-800 text-white'} ${savingSection === 'NOC' ? 'opacity-70 cursor-wait' : ''}`}>
                            {nocsSaved ? <><Check size={18} /> NOC Saved!</> : savingSection === 'NOC' ? 'Saving…' : 'Save NOC Entries'}
                        </button>
                    )}
                    {activeTab === 'AMC' && amcs.length > 0 && (
                        <button onClick={handleSaveAmcs} disabled={savingSection !== null || amcsSaved}
                            className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.99] uppercase tracking-widest text-sm flex items-center justify-center gap-3 ${amcsSaved ? 'bg-green-500 text-white cursor-default' : 'bg-[#0f172a] hover:bg-slate-800 text-white'} ${savingSection === 'AMC' ? 'opacity-70 cursor-wait' : ''}`}>
                            {amcsSaved ? <><Check size={18} /> AMC Saved!</> : savingSection === 'AMC' ? 'Saving…' : 'Save AMC Contracts'}
                        </button>
                    )}
                    {activeTab === 'AMC_VISITS' && amcVisits.length > 0 && (
                        <button onClick={handleSaveAmcVisits} disabled={savingSection !== null || amcVisitsSaved}
                            className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.99] uppercase tracking-widest text-sm flex items-center justify-center gap-3 ${amcVisitsSaved ? 'bg-green-500 text-white cursor-default' : 'bg-[#0f172a] hover:bg-slate-800 text-white'} ${savingSection === 'AMC_VISITS' ? 'opacity-70 cursor-wait' : ''}`}>
                            {amcVisitsSaved ? <><Check size={18} /> AMC Visits Saved!</> : savingSection === 'AMC_VISITS' ? 'Saving…' : 'Save AMC Visits'}
                        </button>
                    )}
                </div>

                {/* ── Finish Button ── */}
                <button onClick={handleFinish} disabled={!(cylindersSaved || nocsSaved || amcsSaved || amcVisitsSaved)}
                    className={`w-full font-bold py-5 rounded-2xl shadow-xl transition-all active:scale-[0.99] uppercase tracking-widest text-sm ${(cylindersSaved || nocsSaved || amcsSaved || amcVisitsSaved) ? 'bg-[#ef4444] hover:bg-red-600 text-white shadow-red-500/20' : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'}`}>
                    {(cylindersSaved || nocsSaved || amcsSaved || amcVisitsSaved) ? '✓ Finish Renewal & View Certificate' : 'Save Sections Above to Finish'}
                </button>
            </div>

            <ServiceDetailsModal
                isOpen={isServiceModalOpen}
                onClose={() => setIsServiceModalOpen(false)}
                serviceId={selectedServiceId}
            />
        </div >
    );
};

export default RenewalScreen;
