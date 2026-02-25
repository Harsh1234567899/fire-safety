
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import usePersistedState from '../hooks/usePersistedState';
import { UserPlus, RefreshCw, ArrowRight, X, Trash2, Calendar, AlertCircle, CheckCircle, User, Search, ChevronRight, Hash, Copy, Check, Eye, EyeOff, ClipboardList, PenTool, FileText, Paperclip, FileCheck, ShieldCheck, Mail, Plus, Layers, Zap, Building, CreditCard, Phone, MapPin, Upload, File, ArrowLeft, Printer, Download, Sparkles, Loader2 } from 'lucide-react';
import RenewalScreen from './RenewalScreen.jsx';
import CertificateTemplate from './CertificateTemplate';
import CustomDropdown from './CustomDropdown.jsx';
import { createRoot } from 'react-dom/client';
import { createClient } from '../api/client';
import { createCylinder } from '../api/fireExtinguisher';
import { createNOC } from '../api/fireNoc';
import { createAMC } from '../api/amc';
import { getGasCategories, getNocTypes } from '../api/category';
import { uploadDocument } from '../api/document';
import ServiceDetailsModal from './ServiceDetailsModal.jsx';
import { toast } from 'react-hot-toast';

const INITIAL_SEQUENCE = {
    'CO2': 1024,
    'ABC Powder': 512,
    'Clean Agent': 128,
    'DEFAULT': 100
};

// Helper to format YYYY-MM-DD to DD/MM/YYYY for summary/certificate
const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'N/A';
    if (dateStr.includes('/')) return dateStr; // Already formatted
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
};



const RegisterFirmScreen = ({ onRegister }) => {
    const { user } = useSelector(state => state.auth);
    const userRole = user?.role;
    // Note: clients list for search is handled via API call in useEffect below, 
    // or if we needed the full list we could use: const { items: clients } = useSelector(state => state.clients);
    // But sticking to the local API search logic is fine or using global. 
    // The previous code had: const results = clients.filter(...) OR API Search.
    // I switched it to API Search in step 129. So 'clients' prop is unused for search now? Let's check.
    // Ah, lines 52-64 show it uses searchClients API. So 'clients' prop is mostly unused EXCEPT maybe for initial load?
    // Let's assume we don't need 'clients' prop anymore.
    const [view, setView, clearView] = usePersistedState('reg_view', 'SELECTION');
    const [activeTab, setActiveTab, clearActiveTab] = usePersistedState('reg_activeTab', 'CYLINDERS');
    const [globalSequence, setGlobalSequence] = useState(INITIAL_SEQUENCE);

    const [firmDetails, setFirmDetails, clearFirmDetails] = usePersistedState('reg_firmDetails', {
        firmName: '',
        contactName: '',
        mobile: '',
        email: '',
        gstNumber: '',
        address: '',
        city: '',
        pincode: ''
    });

    const [formErrors, setFormErrors] = useState({});

    const validateFirmDetails = () => {
        const errors = {};
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[6-9]\d{9}$/;
        const pincodeRegex = /^[1-9][0-9]{5}$/;

        if (!firmDetails.firmName.trim()) errors.firmName = 'Firm name is required.';
        if (!firmDetails.contactName.trim()) errors.contactName = 'Contact person name is required.';
        if (!firmDetails.mobile.trim()) errors.mobile = 'Mobile number is required.';
        else if (!phoneRegex.test(firmDetails.mobile.trim())) errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
        if (!firmDetails.email.trim()) errors.email = 'Email address is required.';
        else if (!emailRegex.test(firmDetails.email.trim())) errors.email = 'Enter a valid email address.';
        if (!firmDetails.address.trim()) errors.address = 'Office address is required.';
        if (!firmDetails.city.trim()) errors.city = 'City is required.';
        if (firmDetails.pincode.trim() && !pincodeRegex.test(firmDetails.pincode.trim())) errors.pincode = 'Enter a valid 6-digit pincode.';
        if (firmDetails.gstNumber.trim() && !gstRegex.test(firmDetails.gstNumber.trim().toUpperCase())) {
            errors.gstNumber = 'Invalid GST format. Expected: 22AAAAA0000A1Z5';
        }
        return errors;
    };

    const [cylinders, setCylinders, clearCylinders] = usePersistedState('reg_cylinders', [
        { id: '1', gasCategory: '', qty: 1, startDate: '', renewalDate: '', renewalNotes: '', showPreview: false }
    ]);
    const [nocs, setNocs, clearNocs] = usePersistedState('reg_nocs', []);
    const [amcs, setAmcs, clearAmcs] = usePersistedState('reg_amcs', []);

    // Dropdown Data State
    const [gasCategories, setGasCategories] = useState([]);
    const [gasSubCategories, setGasSubCategories] = useState([]);
    const [nocTypes, setNocTypes] = useState([]);
    const [savedClientId, setSavedClientId, clearSavedClientId] = usePersistedState('reg_savedClientId', null);

    // Clear all persisted form data (called on successful submission)
    const clearAllPersistedData = useCallback(() => {
        clearView();
        clearActiveTab();
        clearFirmDetails();
        clearCylinders();
        clearNocs();
        clearAmcs();
        clearSavedClientId();
    }, [clearView, clearActiveTab, clearFirmDetails, clearCylinders, clearNocs, clearAmcs, clearSavedClientId]);

    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const [gasCats, nTypes] = await Promise.all([
                    getGasCategories(),
                    getNocTypes()
                ]);
                const categories = gasCats.data?.data || [];
                setGasCategories(categories);

                // Flatten subcategories from the nested structure
                const allSubCats = categories.flatMap(cat => cat.subcategories || []);
                setGasSubCategories(allSubCats);

                setNocTypes(nTypes.data?.data || []);
            } catch (error) {
                console.error("Failed to fetch dropdown options", error);
            }
        };
        fetchDropdowns();
    }, []);


    const [isDownloading, setIsDownloading] = useState(false);

    // Modal State
    const [selectedServiceId, setSelectedServiceId] = useState(null);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

    const handleViewServiceDetails = (serviceId) => {
        setSelectedServiceId(serviceId);
        setIsServiceModalOpen(true);
    };

    // Default Selections
    useEffect(() => {
        // Auto-select 'Fire NOC' or first available NOC type
        if (nocTypes.length > 0) {
            setNocs(prev => prev.map(n => {
                if (n.type) return n; // Already set
                const defaultType = nocTypes.find(t => t.type.toLowerCase().includes('fire')) || nocTypes[0];
                return defaultType ? { ...n, type: defaultType.type } : n;
            }));
        }

        // Auto-select Gas Category if only one exists or match 'Fire'
        if (gasCategories.length > 0) {
            setCylinders(prev => prev.map(c => {
                if (c.gasCategory) return c;
                const fireCat = gasCategories.find(g => g.name.toLowerCase().includes('fire')) || gasCategories[0];
                return fireCat ? { ...c, gasCategory: fireCat.name } : c;
            }));
        }
    }, [gasCategories, nocTypes]);


    const handleFirmChange = (e) => {
        setFirmDetails({ ...firmDetails, [e.target.name]: e.target.value });
    };

    const addItem = () => {
        const newId = Date.now().toString();
        if (activeTab === 'CYLINDERS') {
            const defaultFireCat = gasCategories.find(g => g.name.toLowerCase().includes('fire')) || gasCategories[0];
            const defaultGasCategory = defaultFireCat ? defaultFireCat.name : '';
            setCylinders([...cylinders, { id: newId, gasCategory: defaultGasCategory, kgLtr: '', serviceType: '', refillingType: '', qty: 1, startDate: '', renewalDate: '', renewalNotes: '', showPreview: false }]);
        } else if (activeTab === 'NOC') {
            const defaultNocType = nocTypes.find(t => t.type.toLowerCase().includes('fire')) || nocTypes[0];
            setNocs([...nocs, { id: newId, type: defaultNocType ? defaultNocType.type : '', startDate: '', expiry: '', renewalNotes: '', attachedFiles: [] }]);
        } else if (activeTab === 'AMC') {
            setAmcs([...amcs, { id: newId, site: 'AMC', personDetails: '', name: '', mobile: '', startDate: '', expiry: '', renewalNotes: '', attachedFiles: [] }]);
        }
    };

    const removeItem = (id, type) => {
        if (type === 'CYLINDERS') setCylinders(cylinders.filter(c => c.id !== id));
        if (type === 'NOC') setNocs(nocs.filter(n => n.id !== id));
        if (type === 'AMC') setAmcs(amcs.filter(a => a.id !== id));
    };

    const updateItem = (id, type, field, value) => {
        if (type === 'CYLINDERS') {
            setCylinders(cylinders.map(c => c.id === id ? { ...c, [field]: value } : c));
        } else if (type === 'NOC') {
            setNocs(nocs.map(n => n.id === id ? { ...n, [field]: value } : n));
        } else if (type === 'AMC') {
            setAmcs(amcs.map(a => a.id === id ? { ...a, [field]: value } : a));
        }
    };

    const toggleSerialSelection = (cylinderId, serial) => {
        setCylinders(prev => prev.map(c => {
            if (c.id !== cylinderId) return c;
            const currentSelected = c.selectedSerials || [];
            const isSelected = currentSelected.includes(serial);
            const nextSelected = isSelected
                ? currentSelected.filter(s => s !== serial)
                : [...currentSelected, serial];

            // If user selects an existing serial, ensure Qty is at least that amount
            return {
                ...c,
                selectedSerials: nextSelected,
                qty: Math.max(c.qty, nextSelected.length)
            };
        }));
    };

    const [uploadingFile, setUploadingFile] = useState(null);

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
                console.error("Upload error:", err);
                toast.error(`Failed to upload ${file.name}`);
            } finally {
                setUploadingFile(null);
            }
        }
    };

    const removeFile = (itemId, fileName, type) => {
        if (type === 'NOC') {
            setNocs(nocs.map(n =>
                n.id === itemId ? { ...n, attachedFiles: n.attachedFiles.filter(f => f.name !== fileName) } : n
            ));
        } else {
            setAmcs(amcs.map(a =>
                a.id === itemId ? { ...a, attachedFiles: a.attachedFiles.filter(f => f.name !== fileName) } : a
            ));
        }
    };

    const isSerialDuplicate = (serial) => {
        return clients.some(client =>
            client.ledger?.some(item =>
                item.serialNumbers?.includes(serial)
            )
        );
    };

    const generateUniqueSerials = (category, qty, startSeq) => {
        const prefix = category ? category.substring(0, 3).toUpperCase() : 'GEN';
        const serials = [];
        let currentNum = startSeq;

        while (serials.length < qty) {
            const numStr = currentNum.toString().padStart(4, '0');
            let baseSerial = `SHJ-${prefix}-${numStr}`;

            while (isSerialDuplicate(baseSerial)) {
                currentNum++;
                const newNumStr = currentNum.toString().padStart(4, '0');
                baseSerial = `SHJ-${prefix}-${newNumStr}`;
            }

            serials.push(baseSerial);
            currentNum++;
        }
        return serials;
    };

    const handlePreviewSerials = (id) => {
        const group = cylinders.find(c => c.id === id);
        if (!group || !group.gasCategory) {
            toast.error("Please select a gas category first.");
            return;
        }

        // We want to see the MIX of selected serials + newly generated ones
        const existing = group.selectedSerials || [];
        const numNewNeeded = Math.max(0, group.qty - existing.length);

        const catKey = group.gasCategory || 'DEFAULT';
        const startSeq = globalSequence[catKey] || 100;

        let preview = [...existing];
        if (numNewNeeded > 0) {
            const newOnes = generateUniqueSerials(group.gasCategory, numNewNeeded, startSeq);
            preview = [...preview, ...newOnes];
        }

        setCylinders(cylinders.map(c =>
            c.id === id ? { ...c, generatedSerials: preview, showPreview: true } : c
        ));
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSaveClient = async () => {
        const errors = validateFirmDetails();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            toast.error("Please fix the errors before saving.");
            return;
        }
        setFormErrors({});

        setIsSubmitting(true);
        try {
            const clientPayload = {
                firmName: firmDetails.firmName.trim(),
                contactPerson: firmDetails.contactName.trim(),
                contactNumber: firmDetails.mobile.trim(),
                email: firmDetails.email.trim(),
                address: firmDetails.address.trim(),
                city: firmDetails.city.trim(),
                pincode: firmDetails.pincode.trim()
            };

            // Only add gstNumber if it has a value
            if (firmDetails.gstNumber && firmDetails.gstNumber.trim() !== '') {
                clientPayload.gstNumber = firmDetails.gstNumber.trim().toUpperCase();
            }

            const clientResponse = await createClient(clientPayload);
            const newClient = clientResponse.data?.data;
            if (newClient?._id) {
                setSavedClientId(newClient._id);
                toast.success("Client Profile Saved Successfully! Now you can register provisions.");
            }
        } catch (error) {
            console.error("Client Save Error", error);

            // Check if backend returned specific validation errors (e.g. from express-validator)
            const validationErrors = error.response?.data?.errors;
            if (validationErrors && Array.isArray(validationErrors) && validationErrors.length > 0) {
                const errMsgs = validationErrors.map(e => e.msg || e.message).join(' | ');
                toast.error(`Validation Failed: ${errMsgs}`);
            } else {
                toast.error(`Failed to save client: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };


    const [cylindersSaved, setCylindersSaved] = useState(false);
    const [nocsSaved, setNocsSaved] = useState(false);
    const [amcsSaved, setAmcsSaved] = useState(false);
    const [savingSection, setSavingSection] = useState(null); // 'CYLINDERS' | 'NOC' | 'AMC' | 'FINAL'

    // ── Save Fire Extinguishers ────────────────────────────────────────────────
    const handleSaveCylinders = async () => {
        console.log("Start handleSaveCylinders. savedClientId:", savedClientId);
        console.log("Current cylinders state:", cylinders);

        if (!savedClientId) {
            toast.error("Save the Client Profile first.");
            return;
        }
        if (cylinders.length === 0) {
            toast.error("Add at least one cylinder entry.");
            return;
        }

        const invalid = cylinders.find(c => !c.startDate || !c.renewalDate);
        if (invalid) {
            console.error("Frontend validation blocked save! Missing required inputs on a cylinder:", invalid);
            toast.error("Each cylinder needs a Start Date and Renewal Date.");
            return;
        }

        setSavingSection('CYLINDERS');
        try {
            const clientId = savedClientId;
            console.log("Preparing to send requests to createCylinder...");
            const cylinderPromises = cylinders.map(c => {
                let catObj = gasCategories.find(cat => cat.name === c.gasCategory);

                // If gasCategory is completely missing (like from initial empty state), gracefully grab 'Fire' or the very first category as fallback.
                if (!catObj) {
                    catObj = gasCategories.find(cat => cat.name.toLowerCase().includes('fire')) || gasCategories[0];
                }

                // Construct payload, dropping empty strings for object IDs
                const payload = {
                    clientId,
                    serviceType: c.serviceType,
                    refillingType: c.refillingType || undefined,
                    category: catObj?._id,
                    kgLtr: c.kgLtr || undefined,
                    quantity: c.qty,
                    startDate: c.startDate,
                    endDate: c.renewalDate,
                    notes: c.renewalNotes,
                    serialNumber: c.selectedSerials || [] // Forward any explicitly checked units to the backend
                };

                // Make sure to cleanly drop empty strings so backend validation/cast passes
                if (!payload.refillingType) delete payload.refillingType;
                if (!payload.kgLtr) delete payload.kgLtr;
                if (!payload.serviceType) delete payload.serviceType;

                console.log("Dispatching cylinder payload to backend:", payload);
                return createCylinder(payload);
            });
            const cylinderResponses = await Promise.all(cylinderPromises);

            // Update cylinders with real serials from backend
            const updatedCylinders = cylinders.map((cy, index) => {
                const createdDocs = cylinderResponses[index]?.data?.data?.created || [];
                const realSerials = createdDocs.flatMap(doc => doc.serialNumber || []);
                return { ...cy, generatedSerials: realSerials.length > 0 ? realSerials : cy.generatedSerials };
            });
            setCylinders(updatedCylinders);
            setCylindersSaved(true);
            toast.success("Fire Extinguishers saved successfully ✓");
        } catch (error) {
            console.error("Cylinder Save Error Caught:", error);
            const validationErrors = error.response?.data?.errors;
            if (validationErrors && Array.isArray(validationErrors) && validationErrors.length > 0) {
                const errMsgs = validationErrors.map(e => e.msg || e.message).join(' | ');
                toast.error(`Validation Failed: ${errMsgs}`);
            } else {
                toast.error(`Failed to save cylinders: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setSavingSection(null);
        }
    };

    // ── Save NOCs ─────────────────────────────────────────────────────────────
    const handleSaveNocs = async () => {
        if (!savedClientId) { toast.error("Save the Client Profile first."); return; }
        if (nocs.length === 0) { toast.error("Add at least one NOC entry."); return; }
        const invalidType = nocs.find(n => !n.type);
        if (invalidType) { toast.error("Please select a NOC Type for all NOC entries."); return; }
        const invalidDates = nocs.find(n => !n.startDate || !n.expiry);
        if (invalidDates) { toast.error("Each NOC needs a Start Date and Expiry Date."); return; }

        setSavingSection('NOC');
        try {
            const clientId = savedClientId;
            const nocPromises = nocs.map(n => {
                const typeObj = nocTypes.find(t => t.type === n.type);
                return createNOC({
                    clientId,
                    entries: [{
                        serviceType: n.serviceType || 'new',
                        nocType: typeObj?._id,
                        nocName: n.type || typeObj?.type || '',
                        startDate: n.startDate,
                        endDate: n.expiry,
                        notes: n.renewalNotes || '',
                        documents: (n.attachedFiles || []).map(file => typeof file === 'string' ? file : file._id).filter(Boolean)
                    }]
                });
            });
            await Promise.all(nocPromises);
            // We should ideally capture the IDs here if we want to show details in summary
            setNocsSaved(true);
            toast.success("NOC entries saved successfully ✓");
        } catch (error) {
            console.error("NOC Save Error", error);
            toast.error(`Failed to save NOCs: ${error.response?.data?.message || error.message}`);
        } finally {
            setSavingSection(null);
        }
    };

    // ── Save AMCs ─────────────────────────────────────────────────────────────
    const handleSaveAmcs = async () => {
        if (!savedClientId) { toast.error("Save the Client Profile first."); return; }
        if (amcs.length === 0) { toast.error("Add at least one AMC entry."); return; }
        const invalid = amcs.find(a => !a.startDate || !a.expiry);
        if (invalid) { toast.error("Each AMC needs a Start Date and Expiry Date."); return; }
        const phoneRegex = /^[6-9]\d{9}$/;
        const invalidMobile = amcs.find(a => a.mobile && a.mobile.trim() !== '' && !phoneRegex.test(a.mobile.trim()));
        if (invalidMobile) { toast.error("Enter a valid 10-digit Indian mobile number for each AMC contact."); return; }

        setSavingSection('AMC');
        try {
            const clientId = savedClientId;
            const amcPromises = amcs.map(a => createAMC({
                clientId,
                type: 'new',
                personDetails: a.personDetails || '',
                name: a.site || '',          // form field is `site`, backend field is `name`
                mobile: a.mobile || '',
                startDate: a.startDate,
                endDate: a.expiry,
                notes: a.renewalNotes || '',
                documents: (a.attachedFiles || []).map(file => typeof file === 'string' ? file : file._id).filter(Boolean)
            }));
            await Promise.all(amcPromises);
            setAmcsSaved(true);
            toast.success("AMC contracts saved successfully ✓");
        } catch (error) {
            console.error("AMC Save Error", error);
            toast.error(`Failed to save AMCs: ${error.response?.data?.message || error.message}`);
        } finally {
            setSavingSection(null);
        }
    };

    // ── Final Submit ───────────────────────────────────────────────────────────
    const handleFinalSubmit = () => {
        const anySaved = cylindersSaved || nocsSaved || amcsSaved;
        if (!anySaved) {
            toast.error("Please save at least one section (Cylinders, NOC, or AMC) before finishing.");
            return;
        }
        // DO NOT clear persisted data here — SUMMARY view needs it to render.
        // Data is cleared when user clicks Back to Start from SUMMARY.
        setView('SUMMARY');
    };


    const getLedgerItemsForCertificate = () => {
        return [
            ...cylinders.map(c => ({
                id: c.id,
                type: 'CYLINDERS',
                category: c.gasCategory,
                serialNumbers: c.generatedSerials || [],
                startDate: formatDateDisplay(c.startDate),
                expiryDate: formatDateDisplay(c.renewalDate)
            })),
            ...nocs.map(n => ({
                id: n.id,
                type: 'NOC',
                category: n.type,
                startDate: formatDateDisplay(n.startDate),
                expiryDate: formatDateDisplay(n.expiry)
            })),
            ...amcs.map(a => ({
                id: a.id,
                type: 'AMC',
                category: a.site,
                startDate: formatDateDisplay(a.startDate),
                expiryDate: formatDateDisplay(a.expiry)
            }))
        ];
    };

    const handleViewPDF = async () => {
        if (isDownloading) return;
        setIsDownloading(true);

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        document.body.appendChild(container);

        const ledgerItems = getLedgerItemsForCertificate();
        const root = createRoot(container);
        root.render(<CertificateTemplate client={firmDetails} ledgerItems={ledgerItems} />);

        // Wait for render
        setTimeout(async () => {
            const element = container.querySelector('#certificate-print-area');
            if (element) {
                const opt = {
                    margin: 0,
                    filename: `Sahaj_Certificate_${firmDetails.firmName.replace(/\s+/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                try {
                    // Generate PDF and open in new tab
                    // @ts-ignore
                    const worker = html2pdf().set(opt).from(element);
                    const pdfBlob = await worker.output('blob');
                    const blobUrl = URL.createObjectURL(pdfBlob);
                    window.open(blobUrl, '_blank');

                    // Clean up URL object after a specific time to release memory
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

                } catch (err) {
                    console.error("PDF preview failed", err);
                    toast.error("Failed to generate PDF preview.");
                }
            }
            document.body.removeChild(container);
            setIsDownloading(false);
        }, 1000);
    };


    if (view === 'SUMMARY') {
        return (
            <div className="animate-in fade-in zoom-in-95 duration-500 h-full flex flex-col max-w-4xl mx-auto py-8">
                <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl border border-gray-100 flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-50">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200">
                                <CheckCircle size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900">Registration Complete</h2>
                                <p className="text-sm font-medium text-gray-400">Master serial numbers and provisions have been allocated.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleViewPDF}
                                disabled={isDownloading}
                                className={`flex items-center gap-2 bg-[#0f172a] hover:bg-slate-800 text-white px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20 active:scale-95 transition-all ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Eye size={18} className={isDownloading ? 'animate-pulse' : ''} />
                                {isDownloading ? 'Generating...' : 'View Certificate'}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-10">
                        <div className="bg-gray-50 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Firm Profile Summary</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <p className="text-xs text-gray-600"><strong>GST:</strong> {firmDetails.gstNumber || 'N/A'}</p>
                                <p className="text-xs text-gray-600"><strong>Contact:</strong> {firmDetails.contactName}</p>
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-gray-600"><strong>Address:</strong> {firmDetails.address}, {firmDetails.city} - {firmDetails.pincode}</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Generated Ledger</h4>
                            <div className="space-y-4">
                                {cylinders.length > 0 && cylinders.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => c.id && !c.id.startsWith('reg_') && handleViewServiceDetails(c.id)}
                                        className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer group"
                                    >
                                        <p className="text-xs font-bold text-gray-800 mb-2">{c.gasCategory} ({c.qty} units)</p>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {(c.generatedSerials || []).map(s => (
                                                <span key={s} className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono text-[10px] border border-blue-100">{s}</span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                            <span>Start: {formatDateDisplay(c.startDate)}</span>
                                            <span>•</span>
                                            <span>Renewal: {formatDateDisplay(c.renewalDate)}</span>
                                        </div>
                                        {c.renewalNotes && <p className="text-[10px] text-gray-400 italic mt-2">Notes: {c.renewalNotes}</p>}
                                    </div>
                                ))}
                                {nocs.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => n.id && !n.id.startsWith('reg_') && handleViewServiceDetails(n.id)}
                                        className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm space-y-2 hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-xs font-bold text-gray-800">NOC: {n.type}</p>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Valid: {formatDateDisplay(n.startDate)} - {formatDateDisplay(n.expiry)}</p>
                                                <p className="text-[9px] font-bold text-blue-500 mt-1 uppercase tracking-widest">{n.attachedFiles.length} Document(s) Linked</p>
                                            </div>
                                            <FileText size={16} className="text-blue-500" />
                                        </div>
                                        {n.renewalNotes && <p className="text-[10px] text-gray-400 border-t border-gray-50 pt-2 italic">Notes: {n.renewalNotes}</p>}
                                    </div>
                                ))}
                                {amcs.map(a => (
                                    <div
                                        key={a.id}
                                        onClick={() => a.id && !a.id.startsWith('reg_') && handleViewServiceDetails(a.id)}
                                        className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm space-y-2 hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-xs font-bold text-gray-800">AMC: {a.site}</p>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Valid: {formatDateDisplay(a.startDate)} - {formatDateDisplay(a.expiry)}</p>
                                                <p className="text-[9px] font-bold text-purple-500 mt-1 uppercase tracking-widest">{a.attachedFiles.length} Document(s) Linked</p>
                                            </div>
                                            <ShieldCheck size={16} className="text-purple-500" />
                                        </div>
                                        {a.renewalNotes && <p className="text-[10px] text-gray-400 border-t border-gray-50 pt-2 italic">Notes: {a.renewalNotes}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => { clearAllPersistedData(); setView('SELECTION'); }} className="mt-8 bg-[#0f172a] text-white py-4 rounded-xl font-bold uppercase tracking-widest">Back to Start</button>
                </div>
            </div>
        );
    }

    if (view === 'RENEWAL') {
        return <RenewalScreen onBack={() => setView('SELECTION')} />;
    }
    if (view === 'ENROLLMENT') {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => { clearAllPersistedData(); setView('SELECTION'); }} className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-900 shadow-sm transition-all">
                        <X size={20} />
                    </button>
                    <h1 className="text-3xl font-bold text-[#0f172a]">Registration</h1>
                </div>

                <div className="bg-white rounded-[2.5rem] p-6 lg:p-12 shadow-sm border border-gray-100 flex-1 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        {/* Firm Name */}
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Firm Name *</label>
                            <div className={`group flex items-center bg-gray-50 border focus-within:bg-white rounded-2xl px-5 py-4 shadow-sm transition-all ${formErrors.firmName ? 'border-red-400' : 'border-transparent focus-within:border-red-200'}`}>
                                <Building className="shrink-0 mr-4 text-gray-300 group-focus-within:text-red-500 transition-colors pointer-events-none" size={18} />
                                <input name="firmName" value={firmDetails.firmName} onChange={handleFirmChange} type="text" placeholder="Enter firm name" className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-900 placeholder:text-gray-300" />
                            </div>
                            {formErrors.firmName && <p className="mt-1.5 text-xs text-red-500 font-medium pl-1">{formErrors.firmName}</p>}
                        </div>

                        {/* GST Number */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">GST Number <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
                            <div className={`group flex items-center bg-gray-50 border focus-within:bg-white rounded-2xl px-5 py-4 shadow-sm transition-all ${formErrors.gstNumber ? 'border-red-400' : 'border-transparent focus-within:border-red-200'}`}>
                                <CreditCard className="shrink-0 mr-4 text-gray-300 group-focus-within:text-red-500 transition-colors pointer-events-none" size={18} />
                                <input name="gstNumber" value={firmDetails.gstNumber} onChange={handleFirmChange} type="text" placeholder="22AAAAA0000A1Z5" maxLength={15} className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-900 placeholder:text-gray-300 uppercase" />
                            </div>
                            {formErrors.gstNumber ? <p className="mt-1.5 text-xs text-red-500 font-medium pl-1">{formErrors.gstNumber}</p> : <p className="mt-1.5 text-[10px] text-gray-400 pl-1">Format: 22AAAAA0000A1Z5 (15 chars)</p>}
                        </div>

                        {/* Contact Person */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Contact Person *</label>
                            <div className={`group flex items-center bg-gray-50 border focus-within:bg-white rounded-2xl px-5 py-4 shadow-sm transition-all ${formErrors.contactName ? 'border-red-400' : 'border-transparent focus-within:border-red-200'}`}>
                                <User className="shrink-0 mr-4 text-gray-300 group-focus-within:text-red-500 transition-colors pointer-events-none" size={18} />
                                <input name="contactName" value={firmDetails.contactName} onChange={handleFirmChange} type="text" placeholder="Full name" className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-900 placeholder:text-gray-300" />
                            </div>
                            {formErrors.contactName && <p className="mt-1.5 text-xs text-red-500 font-medium pl-1">{formErrors.contactName}</p>}
                        </div>

                        {/* Mobile */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Mobile *</label>
                            <div className={`group flex items-center bg-gray-50 border focus-within:bg-white rounded-2xl px-5 py-4 shadow-sm transition-all ${formErrors.mobile ? 'border-red-400' : 'border-transparent focus-within:border-red-200'}`}>
                                <Phone className="shrink-0 mr-4 text-gray-300 group-focus-within:text-red-500 transition-colors pointer-events-none" size={18} />
                                <input name="mobile" value={firmDetails.mobile} onChange={handleFirmChange} type="text" maxLength={10} placeholder="10-digit number" className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-900 placeholder:text-gray-300" />
                            </div>
                            {formErrors.mobile && <p className="mt-1.5 text-xs text-red-500 font-medium pl-1">{formErrors.mobile}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Email *</label>
                            <div className={`group flex items-center bg-gray-50 border focus-within:bg-white rounded-2xl px-5 py-4 shadow-sm transition-all ${formErrors.email ? 'border-red-400' : 'border-transparent focus-within:border-red-200'}`}>
                                <Mail className="shrink-0 mr-4 text-gray-300 group-focus-within:text-red-500 transition-colors pointer-events-none" size={18} />
                                <input name="email" value={firmDetails.email} onChange={handleFirmChange} type="email" placeholder="office@example.com" className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-900 placeholder:text-gray-300" />
                            </div>
                            {formErrors.email && <p className="mt-1.5 text-xs text-red-500 font-medium pl-1">{formErrors.email}</p>}
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Office Address *</label>
                            <div className={`group flex items-start bg-gray-50 border focus-within:bg-white rounded-2xl px-5 py-4 shadow-sm transition-all ${formErrors.address ? 'border-red-400' : 'border-transparent focus-within:border-red-200'}`}>
                                <MapPin className="shrink-0 mr-4 mt-1 text-gray-300 group-focus-within:text-red-500 transition-colors pointer-events-none" size={18} />
                                <textarea name="address" value={firmDetails.address} onChange={handleFirmChange} placeholder="Enter full address..." className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-900 placeholder:text-gray-300 h-24 resize-none" />
                            </div>
                            {formErrors.address && <p className="mt-1.5 text-xs text-red-500 font-medium pl-1">{formErrors.address}</p>}
                        </div>

                        {/* City */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">City *</label>
                            <input name="city" value={firmDetails.city} onChange={handleFirmChange} type="text" placeholder="Surat" className={`w-full bg-gray-50 border focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold outline-none shadow-sm transition-all text-gray-900 placeholder:text-gray-300 ${formErrors.city ? 'border-red-400' : 'border-transparent focus:border-red-200'}`} />
                            {formErrors.city && <p className="mt-1.5 text-xs text-red-500 font-medium pl-1">{formErrors.city}</p>}
                        </div>

                        {/* Pincode */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Pincode <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
                            <input name="pincode" value={firmDetails.pincode} onChange={handleFirmChange} type="text" maxLength={6} placeholder="395001" className={`w-full bg-gray-50 border focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold outline-none shadow-sm transition-all text-gray-900 placeholder:text-gray-300 ${formErrors.pincode ? 'border-red-400' : 'border-transparent focus:border-red-200'}`} />
                            {formErrors.pincode && <p className="mt-1.5 text-xs text-red-500 font-medium pl-1">{formErrors.pincode}</p>}
                        </div>
                    </div>

                    <div className="flex justify-end mb-8">
                        <button
                            onClick={handleSaveClient}
                            disabled={!!savedClientId || isSubmitting}
                            className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-2 ${savedClientId
                                ? 'bg-green-100 text-green-700 cursor-default'
                                : isSubmitting
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95'}`}
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            {savedClientId ? 'Client Profile Saved ✓' : isSubmitting ? 'Saving...' : 'Save Client Profile'}
                        </button>
                    </div>

                    <div className="mb-8 border-t border-gray-100 pt-8">
                        <div className="flex items-center gap-2 mb-6">
                            {['CYLINDERS', 'NOC', 'AMC'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-[#0f172a] text-white shadow-lg shadow-slate-900/20' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'CYLINDERS' && cylinders.map((item, idx) => (
                            <div key={item.id} className="bg-gray-50 p-8 rounded-[2rem] mb-6 border border-gray-100 flex flex-col gap-6 relative group/item hover:border-orange-100 transition-all">
                                {/* <button onClick={() => removeItem(item.id, 'CYLINDERS')} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button> */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Capacity / Weight</label>
                                        <CustomDropdown
                                            value={item.kgLtr || ''}
                                            onChange={(val) => updateItem(item.id, 'CYLINDERS', 'kgLtr', val)}
                                            placeholder="Select Capacity"
                                            options={gasSubCategories
                                                .filter(sub => !item.gasCategory || (gasCategories.find(c => c.name === item.gasCategory)?._id === sub.category))
                                                .map(sub => ({ value: sub._id, label: `${sub.name} (${sub.weight}${sub.kgLiter})` }))}
                                            className="w-full text-sm font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Service Type</label>
                                        <CustomDropdown
                                            value={item.serviceType || ''}
                                            onChange={(val) => updateItem(item.id, 'CYLINDERS', 'serviceType', val)}
                                            placeholder="Select Type"
                                            options={[{ value: 'new', label: 'New' }, { value: 'refilling', label: 'Refilling' }]}
                                            className="w-full text-sm font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Refilling Type</label>
                                        <CustomDropdown
                                            value={item.refillingType || ''}
                                            onChange={(val) => updateItem(item.id, 'CYLINDERS', 'refillingType', val)}
                                            placeholder="Select Refill Type"
                                            options={[{ value: 'new', label: 'New' }, { value: 'existing', label: 'Existing' }]}
                                            className="w-full text-sm font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Quantity</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Qty"
                                            value={item.qty}
                                            onChange={(e) => updateItem(item.id, 'CYLINDERS', 'qty', Math.max(item.selectedSerials?.length || 0, parseInt(e.target.value) || 0))}
                                            className={`w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900`}
                                        />
                                        {item.availableSerials && item.availableSerials.length > 0 && item.qty > (item.selectedSerials?.length || 0) && (
                                            <p className="text-[9px] text-orange-600 font-bold mt-1 uppercase tracking-tighter flex items-center gap-1">
                                                <Sparkles size={10} /> {item.qty - (item.selectedSerials?.length || 0)} new units will be allocated
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Service Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
                                            <input type="date" value={item.startDate} onChange={(e) => updateItem(item.id, 'CYLINDERS', 'startDate', e.target.value)} className="w-full bg-white rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Renewal Target</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
                                            <input type="date" value={item.renewalDate} onChange={(e) => updateItem(item.id, 'CYLINDERS', 'renewalDate', e.target.value)} className="w-full bg-white rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                        </div>
                                    </div>
                                </div>

                                {/* Renewal Serial Number Selection Grid */}
                                {item.availableSerials && item.availableSerials.length > 0 && (
                                    <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <Hash size={14} /> Renew Existing Units
                                                </label>
                                                <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-tight">Units detected in historical ledger for {item.gasCategory}</p>
                                            </div>
                                            <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">{item.selectedSerials?.length || 0} / {item.availableSerials.length} Selected</span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                            {item.availableSerials.map(serial => {
                                                const isSelected = (item.selectedSerials || []).includes(serial);
                                                return (
                                                    <button
                                                        key={serial}
                                                        onClick={() => toggleSerialSelection(item.id, serial)}
                                                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-mono font-bold transition-all ${isSelected
                                                            ? 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-200'
                                                            : 'bg-white border-gray-100 text-gray-400 hover:border-orange-200 hover:bg-orange-50'
                                                            }`}
                                                    >
                                                        {isSelected ? <Check size={12} /> : null}
                                                        {serial}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {item.availableSerials.length === 0 && (
                                            <p className="text-center py-4 text-gray-300 text-xs italic">No prior serial numbers found for this category.</p>
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                        <PenTool size={12} /> Instructions
                                    </label>
                                    <textarea placeholder="Special service instructions..." value={item.renewalNotes} onChange={(e) => updateItem(item.id, 'CYLINDERS', 'renewalNotes', e.target.value)} className="w-full bg-white rounded-xl px-4 py-3 text-sm font-medium outline-none border border-gray-100 h-20 resize-none shadow-sm text-gray-900" />
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => handlePreviewSerials(item.id)}
                                        className={`flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-colors`}
                                    >
                                        <Eye size={14} /> Preview Allocation
                                    </button>
                                </div>

                                {item.showPreview && item.generatedSerials && (
                                    <div className="mt-4 p-4 bg-blue-600 rounded-2xl animate-in slide-in-from-top-2 fade-in shadow-xl shadow-blue-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Master Ledger Check: Clean</span>
                                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Allocation Count: {item.generatedSerials.length}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {item.generatedSerials.map(s => {
                                                const isExisting = item.availableSerials?.includes(s);
                                                return (
                                                    <span
                                                        key={s}
                                                        className={`backdrop-blur-md border px-3 py-1 rounded text-[10px] font-mono transition-all ${isExisting
                                                            ? 'bg-orange-500/20 border-orange-400/50 text-orange-100'
                                                            : 'bg-white/10 border-white/20 text-white'
                                                            }`}
                                                        title={isExisting ? 'Renewed Unit' : 'Newly Allocated Unit'}
                                                    >
                                                        {s} {isExisting ? '(R)' : '(N)'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {activeTab === 'NOC' && nocs.map((item, idx) => (
                            <div key={item.id} className="bg-gray-50 p-8 rounded-[2rem] mb-6 border border-gray-100 flex flex-col gap-6 relative group/item hover:border-blue-100 transition-all">
                                {/* <button onClick={() => removeItem(item.id, 'NOC')} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button> */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                                    {/* NOC Type */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">NOC Type *</label>
                                        <select
                                            value={item.type}
                                            onChange={(e) => updateItem(item.id, 'NOC', 'type', e.target.value)}
                                            className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900"
                                        >
                                            <option value="">Select type...</option>
                                            {nocTypes.map(t => (
                                                <option key={t._id} value={t.type}>{t.type}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Start Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
                                            <input type="date" value={item.startDate} onChange={(e) => updateItem(item.id, 'NOC', 'startDate', e.target.value)} className="w-full bg-white rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Renewal Target (Expiry)</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
                                            <input type="date" value={item.expiry} onChange={(e) => updateItem(item.id, 'NOC', 'expiry', e.target.value)} className="w-full bg-white rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <Paperclip size={14} /> Attached Documents
                                        </label>
                                        <label
                                            htmlFor={uploadingFile === item.id ? undefined : `file-noc-${item.id}`}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${uploadingFile === item.id ? 'bg-gray-100 text-gray-400 cursor-wait' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer'}`}
                                        >
                                            {uploadingFile === item.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Attach File
                                        </label>
                                        <input
                                            id={`file-noc-${item.id}`}
                                            type="file"
                                            className="hidden"
                                            multiple
                                            onChange={(e) => handleFileUpload(e, item.id, 'NOC')}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        {item.attachedFiles.length > 0 ? item.attachedFiles.map((file, fIdx) => (
                                            <div key={fIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group/file">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                                                        <File size={16} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-gray-700 truncate max-w-[200px] sm:max-w-none text-gray-900">{file.name}</p>
                                                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">{(file.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFile(item.id, file.name, 'NOC')}
                                                    className="text-gray-300 hover:text-red-500 transition-colors p-1 self-end sm:self-auto shrink-0"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
                                                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No documents attached yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                        <PenTool size={12} /> Compliance Notes
                                    </label>
                                    <textarea placeholder="Specific fire department requirements or inspector notes..." value={item.renewalNotes} onChange={(e) => updateItem(item.id, 'NOC', 'renewalNotes', e.target.value)} className="w-full bg-white rounded-xl px-4 py-3 text-sm font-medium outline-none border border-gray-100 h-20 resize-none shadow-sm text-gray-900" />
                                </div>
                            </div>
                        ))}

                        {activeTab === 'AMC' && amcs.map((item, idx) => (
                            <div key={item.id} className="bg-gray-50 p-8 rounded-[2rem] mb-6 border border-gray-100 flex flex-col gap-6 relative group/item hover:border-purple-100 transition-all">
                                {/* <button onClick={() => removeItem(item.id, 'AMC')} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button> */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Service Site / Branch</label>
                                        <input type="text" placeholder="e.g. Surat Main Plant" value={item.site} onChange={(e) => updateItem(item.id, 'AMC', 'site', e.target.value)} className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Person Name</label>
                                        <input type="text" placeholder="Name" value={item.name} onChange={(e) => updateItem(item.id, 'AMC', 'name', e.target.value)} className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Contact Number</label>
                                        <input
                                            type="text"
                                            placeholder="10-digit mobile"
                                            maxLength={10}
                                            value={item.mobile}
                                            onChange={(e) => updateItem(item.id, 'AMC', 'mobile', e.target.value.replace(/\D/g, ''))}
                                            className={`w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border shadow-sm text-gray-900 ${item.mobile && item.mobile.length > 0 && !/^[6-9]\d{9}$/.test(item.mobile) ? 'border-red-400' : 'border-gray-100'}`}
                                        />
                                        {item.mobile && item.mobile.length > 0 && !/^[6-9]\d{9}$/.test(item.mobile) && (
                                            <p className="mt-1.5 text-[10px] text-red-500 font-medium pl-1">Enter a valid 10-digit Indian mobile number</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Person Details</label>
                                        <input type="text" placeholder="Details" value={item.personDetails} onChange={(e) => updateItem(item.id, 'AMC', 'personDetails', e.target.value)} className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Start Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
                                            <input type="date" value={item.startDate} onChange={(e) => updateItem(item.id, 'AMC', 'startDate', e.target.value)} className="w-full bg-white rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Renewal Target (Expiry)</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
                                            <input type="date" value={item.expiry} onChange={(e) => updateItem(item.id, 'AMC', 'expiry', e.target.value)} className="w-full bg-white rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none border border-gray-100 shadow-sm text-gray-900" />
                                        </div>
                                    </div>

                                </div>

                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <Paperclip size={14} /> Contract Documents
                                        </label>
                                        <label
                                            htmlFor={uploadingFile === item.id ? undefined : `file-amc-${item.id}`}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${uploadingFile === item.id ? 'bg-gray-100 text-gray-400 cursor-wait' : 'bg-purple-50 text-purple-600 hover:bg-purple-100 cursor-pointer'}`}
                                        >
                                            {uploadingFile === item.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Attach File
                                        </label>
                                        <input
                                            id={`file-amc-${item.id}`}
                                            type="file"
                                            className="hidden"
                                            multiple
                                            onChange={(e) => handleFileUpload(e, item.id, 'AMC')}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        {item.attachedFiles.length > 0 ? item.attachedFiles.map((file, fIdx) => (
                                            <div key={fIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group/file">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-purple-500 shadow-sm shrink-0">
                                                        <File size={16} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-gray-700 truncate max-w-[200px] sm:max-w-none text-gray-900">{file.name}</p>
                                                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">{(file.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFile(item.id, file.name, 'AMC')}
                                                    className="text-gray-300 hover:text-red-500 transition-colors p-1 self-end sm:self-auto shrink-0"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
                                                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No contract documents attached yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                        <PenTool size={12} /> Service Contract Details
                                    </label>
                                    <textarea placeholder="Specify asset count covered, technician visits per year, and contract terms..." value={item.renewalNotes} onChange={(e) => updateItem(item.id, 'AMC', 'renewalNotes', e.target.value)} className="w-full bg-white rounded-xl px-4 py-3 text-sm font-medium outline-none border border-gray-100 h-20 resize-none shadow-sm text-gray-900" />
                                </div>
                            </div>
                        ))}

                        <button onClick={addItem} className="w-full border-2 border-dashed border-gray-200 py-4 rounded-2xl text-[10px] font-bold uppercase text-gray-400 hover:border-gray-300 hover:bg-gray-50 transition-all mb-6">
                            + ADD NEW {activeTab === 'CYLINDERS' ? 'CYLINDER' : activeTab} PROVISION
                        </button>
                    </div>

                    {/* ── Per-Section Save Button ── */}
                    <div className="mt-2 mb-4">
                        {activeTab === 'CYLINDERS' && (
                            <button
                                onClick={handleSaveCylinders}
                                disabled={savingSection !== null || cylindersSaved}
                                className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.99] uppercase tracking-widest text-sm flex items-center justify-center gap-3
                                    ${cylindersSaved
                                        ? 'bg-green-500 text-white shadow-green-200 cursor-default'
                                        : 'bg-[#0f172a] hover:bg-slate-800 text-white shadow-slate-900/20'
                                    } ${savingSection === 'CYLINDERS' ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {cylindersSaved ? (
                                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Fire Extinguishers Saved</>
                                ) : savingSection === 'CYLINDERS' ? 'Saving...' : 'Save Fire Extinguishers'}
                            </button>
                        )}
                        {activeTab === 'NOC' && (
                            <button
                                onClick={handleSaveNocs}
                                disabled={savingSection !== null || nocsSaved}
                                className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.99] uppercase tracking-widest text-sm flex items-center justify-center gap-3
                                    ${nocsSaved
                                        ? 'bg-green-500 text-white shadow-green-200 cursor-default'
                                        : 'bg-[#0f172a] hover:bg-slate-800 text-white shadow-slate-900/20'
                                    } ${savingSection === 'NOC' ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {nocsSaved ? (
                                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>NOC Saved</>
                                ) : savingSection === 'NOC' ? 'Saving...' : 'Save NOC Entries'}
                            </button>
                        )}
                        {activeTab === 'AMC' && (
                            <button
                                onClick={handleSaveAmcs}
                                disabled={savingSection !== null || amcsSaved}
                                className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.99] uppercase tracking-widest text-sm flex items-center justify-center gap-3
                                    ${amcsSaved
                                        ? 'bg-green-500 text-white shadow-green-200 cursor-default'
                                        : 'bg-[#0f172a] hover:bg-slate-800 text-white shadow-slate-900/20'
                                    } ${savingSection === 'AMC' ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {amcsSaved ? (
                                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>AMC Saved</>
                                ) : savingSection === 'AMC' ? 'Saving...' : 'Save AMC Contracts'}
                            </button>
                        )}
                    </div>

                    {/* ── Final Submit ── */}
                    <button
                        onClick={handleFinalSubmit}
                        disabled={!(cylindersSaved || nocsSaved || amcsSaved)}
                        className={`w-full font-bold py-5 rounded-2xl shadow-xl transition-all active:scale-[0.99] uppercase tracking-widest text-sm
                            ${(cylindersSaved || nocsSaved || amcsSaved)
                                ? 'bg-[#ef4444] hover:bg-red-600 text-white shadow-red-500/20'
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                            }`}
                    >
                        {(cylindersSaved || nocsSaved || amcsSaved) ? '✓ FINISH REGISTRATION & VIEW CERTIFICATE' : 'SAVE SECTIONS ABOVE TO FINISH'}
                    </button>
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
        <div className="h-full flex flex-col items-center justify-center py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 w-full max-w-5xl px-4 auto-rows-fr">
                <div onClick={() => { clearAllPersistedData(); setView('ENROLLMENT'); }} className="flex flex-col justify-between bg-white p-6 sm:p-12 rounded-3xl sm:rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-2xl hover:border-red-100 transition-all duration-500 group cursor-pointer relative overflow-hidden h-full">
                    <div>
                        <div className="w-14 h-14 sm:w-20 sm:h-20 bg-[#ef4444] rounded-2xl sm:rounded-full flex items-center justify-center text-white mb-6 sm:mb-10 shadow-xl group-hover:scale-110 transition-transform">
                            <UserPlus className="w-6 h-6 sm:w-10 sm:h-10" />
                        </div>
                        <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4 group-hover:text-red-600 transition-colors">New Enrollment</h2>
                        <p className="text-gray-500 text-sm sm:text-lg leading-relaxed mb-6 sm:mb-16">Register a new firm with automated, collision-verified global serial sequences.</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-red-600 transition-colors mt-auto">PROCEED TO FLOW <ArrowRight size={16} /></div>
                </div>
                <div onClick={() => setView('RENEWAL')} className="flex flex-col justify-between bg-white p-6 sm:p-12 rounded-3xl sm:rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-500 group cursor-pointer h-full">
                    <div>
                        <div className="w-14 h-14 sm:w-20 sm:h-20 bg-[#0f172a] rounded-2xl sm:rounded-full flex items-center justify-center text-white mb-6 sm:mb-10 shadow-xl group-hover:scale-110 transition-transform">
                            <RefreshCw className="w-6 h-6 sm:w-10 sm:h-10" />
                        </div>
                        <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Service Renewal</h2>
                        <p className="text-gray-500 text-sm sm:text-lg leading-relaxed mb-6 sm:mb-16">Access existing records to renew provisions with new unique serial sequences.</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mt-auto">PROCEED TO FLOW <ArrowRight size={16} /></div>
                </div>
            </div>
        </div>
    );
};
export default RegisterFirmScreen;
