
import React from 'react';
import { ShieldCheck } from 'lucide-react';

const CertificateTemplate = ({ client, ledgerItems }) => {
    const formatDate = (date) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        if (isNaN(d.getTime())) return date; // Already formatted or invalid
        return d.toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY
    };

    const issueDate = formatDate(ledgerItems[0]?.startDate || new Date());
    const dueDate = formatDate(ledgerItems[0]?.expiryDate || '');

    // Calculate total quantity across all items
    const totalQty = ledgerItems.reduce((acc, curr) => acc + (curr.quantity || curr.serialNumbers?.length || 1), 0);

    return (
        <div id="certificate-print-area" className="bg-white p-0 m-0 w-[210mm] mx-auto text-gray-900 font-sans relative">
            {/* Header Section */}
            <div className="flex justify-between items-start pt-6 px-10 mb-4 relative">
                <div className="flex flex-col items-center">
                    <div className="bg-yellow-400 w-full h-8 absolute left-0 top-8 -z-10"></div>
                    <div className="bg-white p-1.5 border-2 border-gray-100 rounded-lg shadow-sm mb-1">
                        <ShieldCheck size={36} className="text-red-600" />
                        <span className="block text-center font-bold text-red-600 text-[9px] tracking-tighter uppercase">{import.meta.env.VITE_APP_COMPANY_SHORT_NAME?.split(' ')[0] || 'Company'}</span>
                    </div>
                    <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">{import.meta.env.VITE_APP_COMPANY_SHORT_NAME?.split(' ').slice(1).join(' ') || 'Name'}</span>
                </div>

                <div className="text-right max-w-sm">
                    <h1 className="text-base font-bold text-red-600 mb-0">{import.meta.env.VITE_APP_COMPANY_NAME || 'COMPANY NAME LTD'}</h1>
                    <p className="text-[8px] leading-tight text-gray-600 font-medium whitespace-pre-line">
                        {import.meta.env.VITE_APP_COMPANY_ADDRESS || 'Company Address Line 1\nLine 2'}<br />
                        Email: {import.meta.env.VITE_APP_COMPANY_EMAIL || 'email@example.com'}<br />
                        Phone (O): {import.meta.env.VITE_APP_COMPANY_PHONE || '+1 234 567 8900'} | GST: {import.meta.env.VITE_APP_COMPANY_GST || 'N/A'}
                    </p>
                    <div className="absolute right-0 top-8 w-1.5 h-10 bg-blue-700"></div>
                </div>
            </div>

            <div className="px-10">
                <div className="text-right mb-1">
                    <span className="text-[9px] font-bold text-gray-800 uppercase tracking-wide">CR.NO. {new Date().getFullYear()}-{new Date().getFullYear() + 1}/{Math.floor(Math.random() * 99)}</span>
                </div>

                {/* Compact Client Info Box */}
                <div className="border-[1.2px] border-black mb-4">
                    <div className="grid grid-cols-1 divide-y-[1.2px] divide-black">
                        {/* Name & Contact Row */}
                        <div className="flex divide-x-[1.2px] divide-black">
                            <div className="px-2 py-0.5 text-[9px] font-bold flex gap-2 flex-1">
                                <span className="w-16 uppercase">NAME:</span>
                                <span className="uppercase truncate">{client.firmName}</span>
                            </div>
                            <div className="px-2 py-0.5 text-[9px] font-bold flex gap-2 flex-1">
                                <span className="w-16 uppercase">CONTACT:</span>
                                <span className="uppercase truncate">{client.contactPerson || client.contactName} - {client.phone || client.contactNumber || client.mobile}</span>
                            </div>
                        </div>
                        {/* Dates Row */}
                        <div className="flex divide-x-[1.2px] divide-black">
                            <div className="px-2 py-0.5 text-[9px] font-bold flex gap-2 flex-1">
                                <span className="w-24 uppercase font-extrabold text-blue-800">CERT DATE:</span>
                                <span className="text-blue-800">{issueDate}</span>
                            </div>
                            <div className="px-2 py-0.5 text-[9px] font-bold flex gap-2 flex-1">
                                <span className="w-28 uppercase font-extrabold text-red-700">REFILLING DATE:</span>
                                <span className="text-red-700">{dueDate}</span>
                            </div>
                        </div>
                        {/* Address Row */}
                        <div className="px-2 py-0.5 text-[9px] font-bold flex gap-2 bg-gray-50/20">
                            <span className="w-16 uppercase">ADDRESS:</span>
                            <span className="uppercase truncate">{client.address}{client.city ? `, ${client.city}` : ''}{client.pincode ? ` - ${client.pincode}` : ''}</span>
                        </div>
                    </div>
                </div>

                {/* Certification Text */}
                <div className="mb-3">
                    <p className="text-[9px] leading-relaxed text-gray-800 font-medium italic">
                        This is to certify that we have Installed/Refilling fire extinguishers for our esteemed client. These fire<br />
                        extinguishers have been installed/refilled by {import.meta.env.VITE_APP_COMPANY_NAME || 'our company'}.
                    </p>
                </div>

                {/* Inventory Table */}
                <table className="w-full border-collapse border-[1.2px] border-black mb-3">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="border-[1.2px] border-black px-2 py-1 text-left text-[9px] font-bold w-12">Sr.no.</th>
                            <th className="border-[1.2px] border-black px-2 py-1 text-left text-[9px] font-bold uppercase">Particulars</th>
                            <th className="border-[1.2px] border-black px-2 py-1 text-center text-[9px] font-bold w-16">Quantity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-[1.2px] divide-black">
                        {ledgerItems.map((item, idx) => (
                            <tr key={idx} className="break-inside-avoid break-after-auto">
                                <td className="border-r-[1.2px] border-black px-2 py-1 text-[9px] font-bold text-center">{(idx + 1).toString().padStart(2, '0')}</td>
                                <td className="border-r-[1.2px] border-black px-2 py-1 text-[9px] font-bold uppercase leading-tight">
                                    {item.type === 'CYLINDERS'
                                        ? `FIRE EXTINGUISHER ${item.category || item.assetName} TYPE`
                                        : (item.type === 'PRODUCTS' || item.type === 'PRODUCT')
                                            ? `PRODUCT: ${item.products?.length > 0 ? item.products.map(p => `${p.details?.productName || 'UNKNOWN'} (Qty: ${p.quantity || 1})`).join(', ') : (item.category === 'Product' ? 'UNKNOWN' : item.category || 'UNKNOWN')}`
                                            : `${item.type}: ${item.category || item.assetName || item.name}`}

                                    {/* Serial Number Display Logic */}
                                    {item.serialNumbers && item.serialNumbers.length > 0 && (
                                        <span className="block text-[8px] text-gray-700 font-bold">
                                            {item.serialNumbers.length > 6
                                                ? `Sr. No: ${item.serialNumbers[0]} - ${item.serialNumbers[item.serialNumbers.length - 1]}`
                                                : `Sr. No: ${item.serialNumbers.join(', ')}`
                                            }
                                        </span>
                                    )}
                                    <div className="flex justify-between items-center mt-0.5">
                                        <span className="text-[7px] text-gray-500 font-bold uppercase">
                                            Date: {formatDate(item.createdAt || item.startDate)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-2 py-1 text-[9px] font-bold text-center">{(item.quantity || item.serialNumbers?.length || 1).toString().padStart(2, '0')}</td>
                            </tr>
                        ))}
                        {/* Filler rows if needed for layout */}
                        {ledgerItems.length < 2 && [1].map((_, i) => (
                            <tr key={`filler-${i}`} className="h-6">
                                <td className="border-r-[1.2px] border-black px-2 py-1"></td>
                                <td className="border-r-[1.2px] border-black px-2 py-1"></td>
                                <td className="px-2 py-1"></td>
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="bg-gray-50">
                            <td className="border-r-[1.2px] border-black px-2 py-0.5 text-center font-bold text-xs">•</td>
                            <td className="border-r-[1.2px] border-black px-2 py-0.5 text-right font-bold text-[9px] uppercase pr-4">TOTAL</td>
                            <td className="px-2 py-0.5 text-[9px] font-bold text-center">{totalQty.toString().padStart(2, '0')}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Notes */}
                <div className="mb-6">
                    <h4 className="text-[9px] font-bold mb-0.5">Note:</h4>
                    <ul className="list-disc pl-4 space-y-0">
                        <li className="text-[8px] font-bold text-gray-800 leading-none">This Certificate is valid for Company Next refilling date as marked.</li>
                        <li className="text-[8px] font-bold text-gray-800 leading-none">If any fire extinguishers are significantly low pressurized or used, contact us.</li>
                    </ul>
                </div>

                {/* Footer Signature Area */}
                <div className="flex justify-between items-end mb-4">
                    <div className="space-y-3">
                        <div className="space-y-0">
                            <p className="text-[9px] font-bold text-gray-800 italic">Regards,</p>
                            <p className="text-[9px] font-bold text-gray-900 uppercase tracking-tighter">{import.meta.env.VITE_APP_COMPANY_NAME || 'Company Name'}</p>
                        </div>

                        <div className="pt-2">
                            <h4 className="text-[9px] font-bold text-gray-900 mb-1 uppercase tracking-tighter border-b border-black inline-block pb-0">
                                -: Our Fire and Safety Services: -
                            </h4>
                            <ul className="space-y-0">
                                {(import.meta.env.VITE_APP_COMPANY_SERVICES?.split('|') || ['Fire Hydrant System Installation', 'Fire safety products', 'Fire Audit']).map((serviceStr, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-[8px] font-bold text-gray-700">
                                        <span className="text-black leading-none">•</span>
                                        <span className="leading-tight">{serviceStr}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="w-36 h-16 border-2 border-dashed border-gray-100 flex items-center justify-center relative">
                        <span className="text-[7px] font-bold text-gray-300 absolute -top-3 left-0 uppercase">OFFICIAL STAMP & SIGN</span>
                        <div className="opacity-10 grayscale">
                            <ShieldCheck size={28} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificateTemplate;
