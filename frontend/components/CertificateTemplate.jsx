
import React from 'react';
import { ShieldCheck } from 'lucide-react';

const CertificateTemplate = ({ client, ledgerItems }) => {
    const issueDate = ledgerItems[0]?.startDate || new Date().toLocaleDateString('en-GB');
    const dueDate = ledgerItems[0]?.expiryDate || '';

    // Calculate total quantity across all items
    const totalQty = ledgerItems.reduce((acc, item) => acc + (item.serialNumbers?.length || 0 || 1), 0);

    return (
        <div id="certificate-print-area" className="bg-white p-0 m-0 w-[210mm] h-[296mm] overflow-hidden mx-auto text-gray-900 font-sans relative">
            {/* Header Section */}
            <div className="flex justify-between items-start pt-10 px-12 mb-8 relative">
                <div className="flex flex-col items-center">
                    <div className="bg-yellow-400 w-full h-10 absolute left-0 top-12 -z-10"></div>
                    <div className="bg-white p-2 border-2 border-gray-100 rounded-lg shadow-sm mb-1">
                        <ShieldCheck size={50} className="text-red-600" />
                        <span className="block text-center font-bold text-red-600 text-xs tracking-tighter uppercase">Sahaj</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Group</span>
                </div>

                <div className="text-right max-w-sm">
                    <h1 className="text-xl font-bold text-red-600 mb-1">SAHAJ GROUP OF SERVICES</h1>
                    <p className="text-[10px] leading-tight text-gray-600 font-medium">
                        Office no-313, Unity plus, near speed well<br />
                        party plot, Ambika Township Main Road,<br />
                        Rajkot-360005<br />
                        Gmail: sahajgroupofservices@gmail.com<br />
                        Phone (O): 7096780844
                    </p>
                    <div className="absolute right-0 top-12 w-2 h-16 bg-blue-700"></div>
                </div>
            </div>

            <div className="px-12">
                <div className="text-right mb-4">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">CR.NO. {new Date().getFullYear()}-{new Date().getFullYear() + 1}/{Math.floor(Math.random() * 99)}</span>
                </div>

                {/* Client Info Box */}
                <div className="border-[1.5px] border-black mb-8">
                    <div className="grid grid-cols-1 divide-y-[1.5px] divide-black">
                        <div className="px-4 py-1 text-xs font-bold flex gap-2">
                            <span className="w-40">Certificate Issue Date: -</span>
                            <span>{issueDate}</span>
                        </div>
                        <div className="px-4 py-1 text-xs font-bold flex gap-2">
                            <span className="w-40">Refilling Due Date: -</span>
                            <span>{dueDate}</span>
                        </div>
                        <div className="px-4 py-2 text-xs font-bold flex gap-2 bg-gray-50/30">
                            <span className="w-40 uppercase">NAME: -</span>
                            <span className="uppercase">{client.firmName}</span>
                        </div>
                        <div className="px-4 py-2 text-xs font-bold flex gap-2">
                            <span className="w-40 uppercase">ADDRESS: -</span>
                            <span className="uppercase">{client.address}, {client.city} - {client.pincode}</span>
                        </div>
                        <div className="px-4 py-2 text-xs font-bold flex gap-2">
                            <span className="w-40 uppercase">CONTACT: -</span>
                            <span>{client.contactPerson} - {client.phone || client.contactNumber}</span>
                        </div>
                    </div>
                </div>

                {/* Certification Text */}
                <div className="mb-8">
                    <p className="text-[11px] leading-relaxed text-gray-800 font-medium">
                        This is to certify that we have Installed/Refilling fire extinguishers for our esteemed client. These fire<br />
                        extinguishers have been installed/refilled by SAHAJ group of services.
                    </p>
                </div>

                {/* Inventory Table */}
                <table className="w-full border-collapse border-[1.5px] border-black mb-6">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="border-[1.5px] border-black px-4 py-2 text-left text-xs font-bold w-16">Sr.no.</th>
                            <th className="border-[1.5px] border-black px-4 py-2 text-left text-xs font-bold uppercase">Particulars</th>
                            <th className="border-[1.5px] border-black px-4 py-2 text-center text-xs font-bold w-24">Quantity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-[1.5px] divide-black">
                        {ledgerItems.map((item, idx) => (
                            <tr key={idx}>
                                <td className="border-r-[1.5px] border-black px-4 py-2 text-xs font-bold text-center">{(idx + 1).toString().padStart(2, '0')}</td>
                                <td className="border-r-[1.5px] border-black px-4 py-2 text-xs font-bold uppercase">
                                    {item.type === 'CYLINDERS' ? `FIRE EXTINGUISHER ${item.category} TYPE` : `${item.type}: ${item.category}`}

                                    {/* Serial Number Display Logic */}
                                    {item.serialNumbers && item.serialNumbers.length > 0 && (
                                        <span className="block text-[10px] text-gray-700 font-bold mt-1">
                                            {item.serialNumbers.length > 6
                                                ? `Sr. No: ${item.serialNumbers[0]} - ${item.serialNumbers[item.serialNumbers.length - 1]}`
                                                : `Sr. No: ${item.serialNumbers.join(', ')}`
                                            }
                                        </span>
                                    )}

                                    <span className="block text-[9px] text-gray-500 font-normal mt-0.5 italic">(FOR 1 YEAR VALIDITY)</span>
                                </td>
                                <td className="px-4 py-2 text-xs font-bold text-center">{(item.serialNumbers?.length || 1).toString().padStart(2, '0')}</td>
                            </tr>
                        ))}
                        {/* Filler rows if needed for layout */}
                        {ledgerItems.length < 3 && [1, 2].slice(0, 3 - ledgerItems.length).map((_, i) => (
                            <tr key={`filler-${i}`} className="h-10">
                                <td className="border-r-[1.5px] border-black px-4 py-2"></td>
                                <td className="border-r-[1.5px] border-black px-4 py-2"></td>
                                <td className="px-4 py-2"></td>
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="bg-gray-50">
                            <td className="border-r-[1.5px] border-black px-4 py-2 text-center font-bold text-sm">•</td>
                            <td className="border-r-[1.5px] border-black px-4 py-2 text-right font-bold text-xs uppercase pr-8">TOTAL</td>
                            <td className="px-4 py-2 text-xs font-bold text-center">{totalQty.toString().padStart(2, '0')}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Notes */}
                <div className="mb-16">
                    <h4 className="text-xs font-bold mb-2">Note:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                        <li className="text-[10px] font-bold text-gray-800">This Certificate is valid for Company Next refilling date as marked.</li>
                        <li className="text-[10px] font-bold text-gray-800">If any fire extinguishers are significantly low pressurized or used, contact us.</li>
                    </ul>
                </div>

                {/* Footer Signature Area */}
                <div className="flex justify-between items-end mb-12">
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-800 italic">Regards,</p>
                            <p className="text-xs font-bold text-gray-900 uppercase">SAHAJ Group of Services</p>
                        </div>

                        <div className="pt-8">
                            <h4 className="text-[11px] font-bold text-gray-900 mb-3 uppercase tracking-tighter border-b border-black inline-block pb-0.5">
                                -: Our Fire and Safety Services: -
                            </h4>
                            <ul className="space-y-1">
                                <li className="flex items-start gap-2 text-[10px] font-bold text-gray-700">
                                    <span className="text-black">•</span>
                                    <span>Fire Hydrant System Installation</span>
                                </li>
                                <li className="flex items-start gap-2 text-[10px] font-bold text-gray-700">
                                    <span className="text-black">•</span>
                                    <span>Fire safety products</span>
                                </li>
                                <li className="flex items-start gap-2 text-[10px] font-bold text-gray-700">
                                    <span className="text-black">•</span>
                                    <span>Fire Audit</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="w-48 h-24 border-2 border-dashed border-gray-100 flex items-center justify-center relative">
                        <span className="text-[10px] font-bold text-gray-300 absolute -top-4 left-0">OFFICIAL STAMP & SIGN</span>
                        <div className="opacity-10 grayscale">
                            <ShieldCheck size={40} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificateTemplate;
