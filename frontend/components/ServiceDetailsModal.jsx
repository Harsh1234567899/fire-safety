import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Building, Box, FileText, ShieldCheck, Clock, Layers, Hash, ExternalLink, Paperclip, PenTool } from 'lucide-react';
import { getServiceById } from '../api/service';
import { toast } from 'react-hot-toast';

const ServiceDetailsModal = ({ isOpen, onClose, serviceId, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [service, setService] = useState(initialData || null);

    useEffect(() => {
        if (!isOpen) {
            setService(null); // Clear data when modal closes
            return;
        }

        if (isOpen && serviceId && !initialData) {
            setService(null); // Clear previous data before fetching new
            fetchDetails();
        } else if (isOpen && initialData) {
            setService(initialData);
        }
    }, [isOpen, serviceId, initialData]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await getServiceById(serviceId);
            if (res.data?.success) {
                setService(res.data.record);
            }
        } catch (error) {
            console.error("Failed to fetch service details", error);
            toast.error("Could not load service details");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const isCylinder = service?.model === 'FIRE_EXTINGUISHER' || service?.assetType === 'Cylinder';
    const isNoc = service?.model === 'FIRE_NOC' || service?.assetType === 'NOC';
    const isAmc = service?.model === 'AMC' || service?.assetType === 'AMC';
    const isAmcVisit = service?.model === 'AMC_VISIT' || service?.model === 'amcVisit' || service?.type === 'AMC_VISIT';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isNoc ? 'bg-blue-50 text-blue-500' :
                            isAmc ? 'bg-purple-50 text-purple-500' :
                                isAmcVisit ? 'bg-indigo-50 text-indigo-500' :
                                    'bg-orange-50 text-orange-500'
                            }`}>
                            {isNoc ? <FileText size={24} /> : (isAmc || isAmcVisit) ? <ShieldCheck size={24} /> : <Box size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isNoc ? 'Fire NOC' : isAmc ? 'AMC Contract' : isAmcVisit ? 'AMC Visit' : 'Fire Extinguisher'} Details
                            </h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                ID: {service?._id || service?.id || 'Unknown'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-900">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Clock className="animate-spin mb-3" size={24} />
                            <p className="text-xs font-bold uppercase tracking-widest">Loading Details...</p>
                        </div>
                    ) : (
                        <>
                            {/* Client Section */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Building size={14} className="text-gray-400" />
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client Information</h3>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Firm Name</p>
                                            <p className="text-sm font-bold text-gray-900">{service?.firmName || service?.clientData?.firmName || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Contact Person</p>
                                            <p className="text-sm font-bold text-gray-900">{service?.contactName || service?.clientData?.contactPerson || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Service Section */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Layers size={14} className="text-gray-400" />
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Service Overview</h3>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {isCylinder && (
                                            <>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Gas Type</p>
                                                    <p className="text-sm font-bold text-gray-900">{service?.assetName || service?.categoryObj?.name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Capacity</p>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {service?.kgLtrObj ? `${service.kgLtrObj.name} (${service.kgLtrObj.weight}${service.kgLtrObj.kgLiter})` : 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Service Type</p>
                                                    <span className="inline-flex px-2 py-0.5 rounded-lg bg-orange-100 text-orange-600 text-[10px] font-bold uppercase">
                                                        {service?.serviceType || 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Quantity</p>
                                                    <p className="text-sm font-bold text-gray-900 text-orange-600">{service?.quantity || '1'} Units</p>
                                                </div>
                                            </>
                                        )}
                                        {isNoc && (
                                            <>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">NOC Name</p>
                                                    <p className="text-sm font-bold text-gray-900">{service?.nocName || service?.assetName || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">NOC Type</p>
                                                    <p className="text-sm font-bold text-gray-900">{service?.nocTypeObj?.type || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Service Type</p>
                                                    <span className="inline-flex px-2 py-0.5 rounded-lg bg-blue-100 text-blue-600 text-[10px] font-bold uppercase">
                                                        {service?.serviceType || 'Renewal'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Status</p>
                                                    <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${service?.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                        }`}>
                                                        {service?.status || 'N/A'}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                        {isAmc && (
                                            <>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Contract Name/Site</p>
                                                    <p className="text-sm font-bold text-gray-900">{service?.name || service?.assetName || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Contact Details</p>
                                                    <p className="text-sm font-bold text-gray-900">{service?.personDetails || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Service Type</p>
                                                    <span className="inline-flex px-2 py-0.5 rounded-lg bg-purple-100 text-purple-600 text-[10px] font-bold uppercase">
                                                        {service?.serviceType || 'AMC'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Annual Visits</p>
                                                    <p className="text-sm font-bold text-gray-900">{service?.visits || '4'}</p>
                                                </div>
                                            </>
                                        )}
                                        {isAmcVisit && (
                                            <>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Service Type</p>
                                                    <span className="inline-flex px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-600 text-[10px] font-bold uppercase">
                                                        AMC Visit
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Visit Date</p>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={12} className="text-indigo-500" />
                                                        <p className="text-sm font-bold text-gray-900">{formatDate(service?.visitDate || service?.startDate)}</p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Timeline Section */}
                            {!isAmcVisit && (
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Clock size={14} className="text-gray-400" />
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Timeline Details</h3>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Start Date</p>
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={12} className="text-blue-500" />
                                                    <p className="text-sm font-bold text-gray-900">{formatDate(service?.startDate)}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Expiry Date</p>
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={12} className="text-red-500" />
                                                    <p className="text-sm font-bold text-gray-900">{formatDate(service?.endDate || service?.expiryDate)}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Created At</p>
                                                <p className="text-[11px] font-bold text-gray-600">{formatDateTime(service?.createdAt)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Last Updated</p>
                                                <p className="text-[11px] font-bold text-gray-600">{formatDateTime(service?.updatedAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Resource Section (Serials or Documents) */}
                            {isCylinder && service?.serialNumber?.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Hash size={14} className="text-gray-400" />
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Allocated Serial Numbers</h3>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 max-h-48 overflow-y-auto">
                                        <div className="flex flex-wrap gap-2">
                                            {service.serialNumber.map((s, idx) => (
                                                <span key={idx} className="bg-white border border-gray-200 px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold text-gray-700 shadow-sm">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            )}

                            {(isNoc || isAmc) && (
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Paperclip size={14} className="text-gray-400" />
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attached Documents</h3>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                        {service?.documents && service.documents.length > 0 ? (
                                            <div className="space-y-3">
                                                {service.documents.map((doc, idx) => {
                                                    // Handle array of strings (URLs) vs array of objects
                                                    const isString = typeof doc === 'string';
                                                    const url = isString ? doc : doc.url || doc;
                                                    const filename = isString ? doc.split('/').pop() : doc.filename || doc.name || 'Document';

                                                    return (

                                                        <div key={idx} className="flex flex-col gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm group">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                                                                        <FileText size={20} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-gray-900 truncate max-w-[250px]">{filename}</p>
                                                                        {!isString && doc.createdAt && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Added: {formatDate(doc.createdAt)}</p>}
                                                                    </div>
                                                                </div>
                                                                <a href={url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                                                                    Open <ExternalLink size={14} />
                                                                </a>
                                                            </div>



                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
                                                <p className="text-[10px] font-bold uppercase tracking-widest">No documents attached</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Notes */}
                            {service?.notes && (
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <PenTool size={14} className="text-gray-400" />
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notes & Instructions</h3>
                                    </div>
                                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                                        <p className="text-sm font-medium text-blue-800 leading-relaxed italic whitespace-pre-wrap">
                                            {service.notes}
                                        </p>
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-gray-100 flex justify-end bg-gray-50/50">
                    <button onClick={onClose} className="px-6 py-2.5 bg-[#0f172a] text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all hover:bg-slate-800 shadow-lg active:scale-95">
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceDetailsModal;
