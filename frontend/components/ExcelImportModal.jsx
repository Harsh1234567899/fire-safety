import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react';
import { uploadExcelFile } from '../services/excelImport';
import toast from 'react-hot-toast';

const ExcelImportModal = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState('idle'); // idle | uploading | done
    const [results, setResults] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        if (!validTypes.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
            toast.error('Please upload a valid Excel file (.xlsx or .xls)');
            return;
        }

        setStatus('uploading');
        try {
            const response = await uploadExcelFile(file);
            const data = response.data?.data;
            setResults(data);
            setStatus('done');

            if (data?.failed > 0) {
                toast.error(`${data.failed} row(s) failed to import`, { duration: 5000 });
                // Show individual errors
                data.errors?.forEach((err) => {
                    toast.error(`Row ${err.row} (${err.name}): ${err.reason}`, {
                        duration: 8000,
                        icon: '⚠️'
                    });
                });
            }
            if (data?.success > 0) {
                toast.success(`${data.success} record(s) imported successfully!`, { duration: 4000 });
            }
        } catch (error) {
            console.error('Import error:', error);
            toast.error(error.response?.data?.message || 'Failed to import file');
            setStatus('idle');
        }

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        setStatus('idle');
        setResults(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose}></div>

            <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Import Data</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Fire Extinguisher Excel Import
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-xl flex items-center justify-center transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {status === 'idle' && (
                    <div>
                        {/* Template guide */}
                        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <FileSpreadsheet className="text-blue-500" size={18} />
                                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Excel Format Guide</h4>
                            </div>
                            <p className="text-[11px] text-blue-700 leading-relaxed mb-3">
                                Your Excel should have a header row with these columns:
                            </p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {['Name', 'City', 'Gas Type', 'Date', 'Due Date'].map(col => (
                                    <span key={col} className="px-2 py-1 bg-white/60 border border-blue-200/50 rounded-lg text-[10px] font-bold text-blue-800 uppercase tracking-wide">
                                        {col}
                                    </span>
                                ))}
                            </div>
                            <p className="text-[10px] text-blue-600 italic">
                                Gas types: ABC - 4, ABC - 6, ABC - 9, CO2, etc. Name maps to Firm Name & Contact Person.
                            </p>
                        </div>

                        {/* Dropzone */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center cursor-pointer hover:border-red-200 hover:bg-red-50/10 transition-all group"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".xlsx,.xls"
                                className="hidden"
                            />
                            <Upload size={48} className="mx-auto text-gray-300 group-hover:text-red-500 mb-4 transition-colors" />
                            <p className="text-sm font-bold text-gray-700">Drop your Excel file here or click to browse</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">.xlsx or .xls files only</p>
                        </div>
                    </div>
                )}

                {status === 'uploading' && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 size={48} className="text-red-500 animate-spin mb-6" />
                        <h4 className="text-lg font-bold text-gray-900 mb-2">Importing Data...</h4>
                        <p className="text-xs text-gray-400">Processing rows one by one. This may take a moment.</p>
                    </div>
                )}

                {status === 'done' && results && (
                    <div className="text-center py-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="text-green-600" size={40} />
                        </div>
                        <h4 className="text-2xl font-bold text-gray-900 mb-2">Import Complete</h4>

                        <div className="flex justify-center gap-8 mt-6 mb-6">
                            <div className="text-center">
                                <p className="text-2xl font-black text-green-600">{results.success}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Imported</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-red-400">{results.failed}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Failed</p>
                            </div>
                        </div>

                        {results.errors?.length > 0 && (
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-left mb-6 max-h-40 overflow-y-auto">
                                <h5 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <AlertCircle size={14} /> Failed Rows
                                </h5>
                                {results.errors.map((err, i) => (
                                    <p key={i} className="text-[11px] text-red-700 mb-1">
                                        <span className="font-bold">Row {err.row}</span> ({err.name}): {err.reason}
                                    </p>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={handleClose}
                            className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExcelImportModal;
